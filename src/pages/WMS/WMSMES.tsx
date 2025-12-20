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
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Factory, Plus, Play, Pause, CheckCircle, Clock, Package, Layers, Cog, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import ReactECharts from 'echarts-for-react';

export default function WMSMES() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isRTL = language === 'ar';
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    production_line: '',
    quantity_ordered: '',
    due_date: '',
    priority: 'normal',
    notes: ''
  });

  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ['wms-mes-work-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wms_mes_work_orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: wipItems = [] } = useQuery({
    queryKey: ['wms-wip-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wms_wip_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: products = [] } = useQuery({
    queryKey: ['wms-products-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wms_products')
        .select('id, name, sku')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: woNumber } = await supabase.rpc('generate_work_order_number');
      
      const { error } = await supabase.from('wms_mes_work_orders').insert({
        work_order_number: woNumber,
        product_id: data.product_id || null,
        production_line: data.production_line || null,
        quantity_ordered: parseInt(data.quantity_ordered),
        due_date: data.due_date || null,
        priority: data.priority,
        notes: data.notes || null,
        created_by: user?.id
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wms-mes-work-orders'] });
      toast({ title: language === 'ar' ? 'تم إنشاء أمر العمل بنجاح' : 'Work order created successfully' });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'خطأ' : 'Error', variant: 'destructive' });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, additionalData }: { id: string; status: string; additionalData?: any }) => {
      const updateData: Record<string, unknown> = { status };
      if (status === 'in_progress' && !additionalData?.start_date) {
        updateData.start_date = new Date().toISOString();
      }
      if (status === 'completed') {
        updateData.completed_date = new Date().toISOString();
        const wo = workOrders.find((w: any) => w.id === id);
        if (wo) updateData.quantity_completed = wo.quantity_ordered;
      }
      Object.assign(updateData, additionalData);
      
      const { error } = await supabase.from('wms_mes_work_orders').update(updateData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wms-mes-work-orders'] });
      toast({ title: language === 'ar' ? 'تم تحديث الحالة' : 'Status updated' });
    }
  });

  const resetForm = () => {
    setFormData({
      product_id: '',
      production_line: '',
      quantity_ordered: '',
      due_date: '',
      priority: 'normal',
      notes: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-500">{language === 'ar' ? 'مكتمل' : 'Completed'}</Badge>;
      case 'in_progress': return <Badge className="bg-blue-500">{language === 'ar' ? 'قيد التنفيذ' : 'In Progress'}</Badge>;
      case 'on_hold': return <Badge variant="secondary">{language === 'ar' ? 'معلق' : 'On Hold'}</Badge>;
      case 'cancelled': return <Badge variant="destructive">{language === 'ar' ? 'ملغي' : 'Cancelled'}</Badge>;
      default: return <Badge variant="outline">{language === 'ar' ? 'معلق' : 'Pending'}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string | null) => {
    switch (priority) {
      case 'high': return <Badge variant="destructive">{language === 'ar' ? 'عالي' : 'High'}</Badge>;
      case 'low': return <Badge variant="secondary">{language === 'ar' ? 'منخفض' : 'Low'}</Badge>;
      default: return <Badge variant="outline">{language === 'ar' ? 'عادي' : 'Normal'}</Badge>;
    }
  };

  const getCompletionRate = (wo: any) => {
    if (!wo.quantity_ordered || wo.quantity_ordered === 0) return 0;
    return Math.round(((wo.quantity_completed || 0) / wo.quantity_ordered) * 100);
  };

  const pendingOrders = workOrders.filter((wo: any) => wo.status === 'pending').length;
  const inProgressOrders = workOrders.filter((wo: any) => wo.status === 'in_progress').length;
  const completedOrders = workOrders.filter((wo: any) => wo.status === 'completed').length;
  const totalWIP = wipItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
  const totalCompleted = workOrders.reduce((sum: number, wo: any) => sum + (wo.quantity_completed || 0), 0);

  const chartOption = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: workOrders.slice(0, 6).map((wo: any) => wo.work_order_number) },
    yAxis: { type: 'value' },
    series: [
      {
        name: language === 'ar' ? 'مكتمل' : 'Completed',
        type: 'bar',
        stack: 'total',
        data: workOrders.slice(0, 6).map((wo: any) => wo.quantity_completed || 0),
        itemStyle: { color: '#10b981' }
      },
      {
        name: language === 'ar' ? 'قيد التنفيذ' : 'WIP',
        type: 'bar',
        stack: 'total',
        data: workOrders.slice(0, 6).map((wo: any) => wo.quantity_in_progress || 0),
        itemStyle: { color: '#f59e0b' }
      }
    ]
  };

  const breadcrumbItems = [
    { label: language === 'ar' ? 'نظام WMS' : 'WMS', href: '/wms' },
    { label: language === 'ar' ? 'تكامل MES' : 'MES Integration' }
  ];

  return (
    <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Navigation />
      <main className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbItems} className="mb-4" />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Factory className="h-6 w-6" />
              {language === 'ar' ? 'تكامل نظام التصنيع (MES)' : 'Manufacturing Execution System (MES)'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'إدارة أوامر الإنتاج والعمل الجاري' : 'Manage production orders and WIP'}
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                {language === 'ar' ? 'أمر عمل جديد' : 'New Work Order'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{language === 'ar' ? 'إنشاء أمر عمل' : 'Create Work Order'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'المنتج' : 'Product'}</Label>
                  <Select value={formData.product_id} onValueChange={(v) => setFormData({ ...formData, product_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'ar' ? 'اختر منتج' : 'Select product'} />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'خط الإنتاج' : 'Production Line'}</Label>
                    <Input value={formData.production_line} onChange={(e) => setFormData({ ...formData, production_line: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'الكمية المطلوبة' : 'Quantity'}</Label>
                    <Input type="number" value={formData.quantity_ordered} onChange={(e) => setFormData({ ...formData, quantity_ordered: e.target.value })} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</Label>
                    <Input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'الأولوية' : 'Priority'}</Label>
                    <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{language === 'ar' ? 'منخفض' : 'Low'}</SelectItem>
                        <SelectItem value="normal">{language === 'ar' ? 'عادي' : 'Normal'}</SelectItem>
                        <SelectItem value="high">{language === 'ar' ? 'عالي' : 'High'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
                  <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
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
                <div className="p-3 rounded-lg bg-yellow-500/10"><Clock className="h-6 w-6 text-yellow-500" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'معلقة' : 'Pending'}</p>
                  <p className="text-2xl font-bold">{pendingOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-500/10"><Cog className="h-6 w-6 text-blue-500" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'قيد التنفيذ' : 'In Progress'}</p>
                  <p className="text-2xl font-bold">{inProgressOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-green-500/10"><CheckCircle className="h-6 w-6 text-green-500" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'مكتملة' : 'Completed'}</p>
                  <p className="text-2xl font-bold text-green-600">{completedOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-orange-500/10"><Layers className="h-6 w-6 text-orange-500" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'WIP' : 'WIP Items'}</p>
                  <p className="text-2xl font-bold">{totalWIP}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList>
            <TabsTrigger value="orders"><Package className="h-4 w-4 me-2" />{language === 'ar' ? 'أوامر الإنتاج' : 'Work Orders'}</TabsTrigger>
            <TabsTrigger value="wip"><Layers className="h-4 w-4 me-2" />{language === 'ar' ? 'العمل الجاري' : 'WIP'}{wipItems.length > 0 && <Badge variant="secondary" className="ms-2">{wipItems.length}</Badge>}</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle>{language === 'ar' ? 'أوامر الإنتاج' : 'Work Orders'}</CardTitle></CardHeader>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="p-6 space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}</div>
                  ) : workOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <Factory className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">{language === 'ar' ? 'لا توجد أوامر عمل' : 'No work orders'}</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{language === 'ar' ? 'الأمر' : 'Order'}</TableHead>
                          <TableHead>{language === 'ar' ? 'الخط' : 'Line'}</TableHead>
                          <TableHead>{language === 'ar' ? 'التقدم' : 'Progress'}</TableHead>
                          <TableHead>{language === 'ar' ? 'الأولوية' : 'Priority'}</TableHead>
                          <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                          <TableHead>{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {workOrders.map((wo: any) => (
                          <TableRow key={wo.id}>
                            <TableCell className="font-mono">{wo.work_order_number}</TableCell>
                            <TableCell>{wo.production_line || '-'}</TableCell>
                            <TableCell>
                              <div className="space-y-1 min-w-[100px]">
                                <Progress value={getCompletionRate(wo)} className="h-2" />
                                <p className="text-xs text-muted-foreground">{wo.quantity_completed || 0} / {wo.quantity_ordered}</p>
                              </div>
                            </TableCell>
                            <TableCell>{getPriorityBadge(wo.priority)}</TableCell>
                            <TableCell>{getStatusBadge(wo.status)}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {wo.status === 'pending' && (
                                  <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: wo.id, status: 'in_progress' })}><Play className="w-4 h-4" /></Button>
                                )}
                                {wo.status === 'in_progress' && (
                                  <>
                                    <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: wo.id, status: 'on_hold' })}><Pause className="w-4 h-4" /></Button>
                                    <Button size="sm" variant="outline" className="text-green-600" onClick={() => updateStatusMutation.mutate({ id: wo.id, status: 'completed' })}><CheckCircle className="w-4 h-4" /></Button>
                                  </>
                                )}
                                {wo.status === 'on_hold' && (
                                  <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: wo.id, status: 'in_progress' })}><Play className="w-4 h-4" /></Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>{language === 'ar' ? 'ملخص الإنتاج' : 'Production Summary'}</CardTitle></CardHeader>
                <CardContent>
                  {workOrders.length > 0 ? (
                    <ReactECharts option={chartOption} style={{ height: '300px' }} />
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      {language === 'ar' ? 'لا توجد بيانات' : 'No data'}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="wip">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5" />{language === 'ar' ? 'العمل الجاري (WIP)' : 'Work in Progress'}</CardTitle>
                <CardDescription>{language === 'ar' ? 'المنتجات قيد التصنيع' : 'Products being manufactured'}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {wipItems.length === 0 ? (
                  <div className="text-center py-12">
                    <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">{language === 'ar' ? 'لا توجد عناصر قيد التنفيذ' : 'No WIP items'}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'ar' ? 'أمر العمل' : 'Work Order'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الكمية' : 'Quantity'}</TableHead>
                        <TableHead>{language === 'ar' ? 'المرحلة' : 'Stage'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                        <TableHead>{language === 'ar' ? 'تاريخ البدء' : 'Started'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {wipItems.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono">{item.work_order_id?.slice(0, 8)}...</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell><Badge variant="outline">{item.stage || '-'}</Badge></TableCell>
                          <TableCell>
                            <Badge variant={item.status === 'completed' ? 'default' : 'outline'}>{item.status}</Badge>
                          </TableCell>
                          <TableCell>{item.started_at ? format(new Date(item.started_at), 'yyyy-MM-dd HH:mm') : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}