import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Receipt, Plus, DollarSign, Clock, CheckCircle, AlertTriangle, Download, TrendingUp, Search, CreditCard, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import ReactECharts from 'echarts-for-react';

export default function WMSBilling() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isRTL = language === 'ar';
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    tenant_id: '',
    customer_name: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    subtotal: '',
    tax_amount: '',
    notes: ''
  });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['wms-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wms_invoices')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ['wms-3pl-tenants-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wms_3pl_tenants')
        .select('id, tenant_name, tenant_code')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const subtotal = parseFloat(data.subtotal) || 0;
      const tax = parseFloat(data.tax_amount) || 0;
      const total = subtotal + tax;
      
      const { data: invoiceNum } = await supabase.rpc('generate_invoice_number');
      
      const { error } = await supabase.from('wms_invoices').insert({
        invoice_number: invoiceNum,
        tenant_id: data.tenant_id || null,
        customer_name: data.customer_name || null,
        invoice_date: data.invoice_date,
        due_date: data.due_date || null,
        subtotal,
        tax_amount: tax,
        total_amount: total,
        notes: data.notes || null,
        created_by: user?.id
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wms-invoices'] });
      toast({ title: language === 'ar' ? 'تم إنشاء الفاتورة بنجاح' : 'Invoice created successfully' });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'خطأ' : 'Error', variant: 'destructive' });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('wms_invoices').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wms-invoices'] });
      toast({ title: language === 'ar' ? 'تم تحديث الحالة' : 'Status updated' });
    }
  });

  const resetForm = () => {
    setFormData({
      tenant_id: '',
      customer_name: '',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: '',
      subtotal: '',
      tax_amount: '',
      notes: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const filteredInvoices = invoices.filter((inv: any) =>
    inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500">{language === 'ar' ? 'مدفوعة' : 'Paid'}</Badge>;
      case 'overdue':
        return <Badge variant="destructive">{language === 'ar' ? 'متأخرة' : 'Overdue'}</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">{language === 'ar' ? 'ملغاة' : 'Cancelled'}</Badge>;
      default:
        return <Badge variant="outline">{language === 'ar' ? 'غير مدفوعة' : 'Unpaid'}</Badge>;
    }
  };

  const totalRevenue = invoices.filter((i: any) => i.status === 'paid').reduce((sum: number, i: any) => sum + (i.total_amount || 0), 0);
  const pendingAmount = invoices.filter((i: any) => i.status === 'unpaid').reduce((sum: number, i: any) => sum + (i.total_amount || 0), 0);
  const overdueAmount = invoices.filter((i: any) => i.status === 'overdue').reduce((sum: number, i: any) => sum + (i.total_amount || 0), 0);

  const revenueChartOption = {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: language === 'ar' ? 'الإيرادات' : 'Revenue',
        type: 'bar',
        data: [4500, 5200, 4800, 5500, 6000, 5800],
        itemStyle: { color: '#10b981' }
      }
    ]
  };

  const breadcrumbItems = [
    { label: language === 'ar' ? 'نظام WMS' : 'WMS', href: '/wms' },
    { label: language === 'ar' ? 'الفوترة' : 'Billing' }
  ];

  return (
    <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Navigation />
      <main className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbItems} className="mb-4" />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Receipt className="h-6 w-6" />
              {language === 'ar' ? 'الفوترة والإيرادات' : 'Billing & Revenue'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'إدارة الفواتير وتتبع الإيرادات' : 'Manage invoices and track revenue'}
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                {language === 'ar' ? 'إنشاء فاتورة' : 'Create Invoice'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{language === 'ar' ? 'إنشاء فاتورة جديدة' : 'Create New Invoice'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'المستأجر (اختياري)' : 'Tenant (optional)'}</Label>
                  <Select value={formData.tenant_id} onValueChange={(v) => setFormData({ ...formData, tenant_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'ar' ? 'اختر مستأجر' : 'Select tenant'} />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>{t.tenant_name} ({t.tenant_code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'اسم العميل' : 'Customer Name'}</Label>
                  <Input
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'تاريخ الفاتورة' : 'Invoice Date'}</Label>
                    <Input
                      type="date"
                      value={formData.invoice_date}
                      onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</Label>
                    <Input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'المبلغ الفرعي' : 'Subtotal'}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.subtotal}
                      onChange={(e) => setFormData({ ...formData, subtotal: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'الضريبة' : 'Tax'}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.tax_amount}
                      onChange={(e) => setFormData({ ...formData, tax_amount: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
                  <Button type="submit" disabled={createMutation.isPending}>{language === 'ar' ? 'إنشاء' : 'Create'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <DollarSign className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}</p>
                  <p className="text-2xl font-bold text-green-600">${totalRevenue.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-yellow-500/10">
                  <Clock className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'قيد الانتظار' : 'Pending'}</p>
                  <p className="text-2xl font-bold text-yellow-600">${pendingAmount.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'متأخرة' : 'Overdue'}</p>
                  <p className="text-2xl font-bold text-red-600">${overdueAmount.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Receipt className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي الفواتير' : 'Total Invoices'}</p>
                  <p className="text-2xl font-bold">{invoices.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="invoices" className="space-y-4">
          <TabsList>
            <TabsTrigger value="invoices">
              <Receipt className="h-4 w-4 me-2" />
              {language === 'ar' ? 'الفواتير' : 'Invoices'}
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <TrendingUp className="h-4 w-4 me-2" />
              {language === 'ar' ? 'تحليل الإيرادات' : 'Revenue Analytics'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{language === 'ar' ? 'قائمة الفواتير' : 'Invoice List'}</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="ps-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-4">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16" />)}
                  </div>
                ) : filteredInvoices.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">{language === 'ar' ? 'لا توجد فواتير' : 'No invoices found'}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</TableHead>
                        <TableHead>{language === 'ar' ? 'العميل' : 'Customer'}</TableHead>
                        <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الاستحقاق' : 'Due'}</TableHead>
                        <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.map((invoice: any) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                          <TableCell>{invoice.customer_name || '-'}</TableCell>
                          <TableCell>{format(new Date(invoice.invoice_date), 'yyyy-MM-dd')}</TableCell>
                          <TableCell>{invoice.due_date ? format(new Date(invoice.due_date), 'yyyy-MM-dd') : '-'}</TableCell>
                          <TableCell className="font-bold">${invoice.total_amount?.toFixed(2) || '0.00'}</TableCell>
                          <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                          <TableCell>
                            <Select
                              value={invoice.status || 'unpaid'}
                              onValueChange={(v) => updateStatusMutation.mutate({ id: invoice.id, status: v })}
                            >
                              <SelectTrigger className="w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unpaid">{language === 'ar' ? 'غير مدفوعة' : 'Unpaid'}</SelectItem>
                                <SelectItem value="paid">{language === 'ar' ? 'مدفوعة' : 'Paid'}</SelectItem>
                                <SelectItem value="overdue">{language === 'ar' ? 'متأخرة' : 'Overdue'}</SelectItem>
                                <SelectItem value="cancelled">{language === 'ar' ? 'ملغاة' : 'Cancelled'}</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'تحليل الإيرادات الشهرية' : 'Monthly Revenue Analysis'}</CardTitle>
              </CardHeader>
              <CardContent>
                <ReactECharts option={revenueChartOption} style={{ height: '400px' }} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}