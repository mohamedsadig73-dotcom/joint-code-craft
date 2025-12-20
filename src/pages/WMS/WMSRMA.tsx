import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RotateCcw, Plus, Search, Eye, CheckCircle, XCircle, Package, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface RMA {
  id: string;
  rma_number: string;
  order_type: string;
  customer_name: string | null;
  status: string;
  reason: string;
  reason_category: string | null;
  requested_date: string;
  notes: string | null;
  refund_amount: number | null;
}

interface RMALine {
  id: string;
  rma_id: string;
  product_id: string;
  quantity: number;
  received_quantity: number;
  condition: string | null;
  disposition: string | null;
  lot_number: string | null;
  serial_number: string | null;
  notes: string | null;
  product?: { name: string; sku: string };
}

interface Product {
  id: string;
  name: string;
  sku: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  approved: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  received: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  inspecting: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  completed: 'bg-green-500/10 text-green-500 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
  refunded: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
};

const statusLabels: Record<string, { ar: string; en: string }> = {
  pending: { ar: 'قيد الانتظار', en: 'Pending' },
  approved: { ar: 'موافق عليه', en: 'Approved' },
  received: { ar: 'مستلم', en: 'Received' },
  inspecting: { ar: 'قيد الفحص', en: 'Inspecting' },
  completed: { ar: 'مكتمل', en: 'Completed' },
  rejected: { ar: 'مرفوض', en: 'Rejected' },
  refunded: { ar: 'مسترد', en: 'Refunded' },
};

const reasonCategories = [
  { value: 'defective', label: { ar: 'معيب', en: 'Defective' } },
  { value: 'damaged', label: { ar: 'تالف', en: 'Damaged' } },
  { value: 'wrong_item', label: { ar: 'منتج خاطئ', en: 'Wrong Item' } },
  { value: 'quality_issue', label: { ar: 'مشكلة جودة', en: 'Quality Issue' } },
  { value: 'customer_return', label: { ar: 'إرجاع عميل', en: 'Customer Return' } },
  { value: 'excess_inventory', label: { ar: 'فائض مخزون', en: 'Excess Inventory' } },
  { value: 'other', label: { ar: 'أخرى', en: 'Other' } },
];

const conditionOptions = [
  { value: 'good', label: { ar: 'جيد', en: 'Good' } },
  { value: 'damaged', label: { ar: 'تالف', en: 'Damaged' } },
  { value: 'defective', label: { ar: 'معيب', en: 'Defective' } },
  { value: 'expired', label: { ar: 'منتهي الصلاحية', en: 'Expired' } },
  { value: 'pending_inspection', label: { ar: 'قيد الفحص', en: 'Pending Inspection' } },
];

const dispositionOptions = [
  { value: 'restock', label: { ar: 'إعادة للمخزون', en: 'Restock' } },
  { value: 'repair', label: { ar: 'إصلاح', en: 'Repair' } },
  { value: 'scrap', label: { ar: 'إتلاف', en: 'Scrap' } },
  { value: 'return_to_supplier', label: { ar: 'إرجاع للمورد', en: 'Return to Supplier' } },
  { value: 'pending', label: { ar: 'قيد الانتظار', en: 'Pending' } },
];

export default function WMSRMA() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [rmas, setRmas] = useState<RMA[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLinesDialogOpen, setIsLinesDialogOpen] = useState(false);
  const [selectedRMA, setSelectedRMA] = useState<RMA | null>(null);
  const [rmaLines, setRmaLines] = useState<RMALine[]>([]);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    order_type: 'outbound' as 'inbound' | 'outbound',
    customer_name: '',
    reason: '',
    reason_category: '',
    notes: '',
  });

  const [lineFormData, setLineFormData] = useState({
    product_id: '',
    quantity: '',
    lot_number: '',
    serial_number: '',
    notes: '',
  });

  useEffect(() => {
    loadRMAs();
    loadProducts();
  }, []);

  const loadRMAs = async () => {
    try {
      const { data, error } = await supabase
        .from('wms_rma')
        .select('*')
        .order('requested_date', { ascending: false });

      if (error) throw error;
      setRmas(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('wms_products')
        .select('id, name, sku')
        .eq('is_active', true);

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error loading products:', error);
    }
  };

  const loadRMALines = async (rmaId: string) => {
    try {
      const { data, error } = await supabase
        .from('wms_rma_lines')
        .select('*')
        .eq('rma_id', rmaId);

      if (error) throw error;

      // Enrich with product data
      const enrichedLines = (data || []).map(line => ({
        ...line,
        product: products.find(p => p.id === line.product_id),
      }));
      
      setRmaLines(enrichedLines);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
      });
    }
  };

  const generateRMANumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `RMA-${year}${month}-${random}`;
  };

  const handleSubmit = async () => {
    if (!formData.reason) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى إدخال سبب المرتجع' : 'Please enter return reason',
      });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('wms_rma')
        .insert({
          rma_number: generateRMANumber(),
          order_type: formData.order_type,
          customer_name: formData.customer_name || null,
          reason: formData.reason,
          reason_category: formData.reason_category || null,
          notes: formData.notes || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' ? 'تم إنشاء طلب المرتجع' : 'RMA created successfully',
      });

      setIsDialogOpen(false);
      resetForm();
      loadRMAs();

      // Open lines dialog for the new RMA
      setSelectedRMA(data);
      setIsLinesDialogOpen(true);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddLine = async () => {
    if (!selectedRMA || !lineFormData.product_id || !lineFormData.quantity) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى اختيار المنتج والكمية' : 'Please select product and quantity',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('wms_rma_lines')
        .insert({
          rma_id: selectedRMA.id,
          product_id: lineFormData.product_id,
          quantity: parseFloat(lineFormData.quantity),
          lot_number: lineFormData.lot_number || null,
          serial_number: lineFormData.serial_number || null,
          notes: lineFormData.notes || null,
          condition: 'pending_inspection',
          disposition: 'pending',
        });

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' ? 'تم إضافة المنتج' : 'Product added',
      });

      setLineFormData({
        product_id: '',
        quantity: '',
        lot_number: '',
        serial_number: '',
        notes: '',
      });
      loadRMALines(selectedRMA.id);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
      });
    }
  };

  const updateRMAStatus = async (rmaId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'approved') {
        updateData.approved_date = new Date().toISOString();
        updateData.approved_by = user?.id;
      } else if (newStatus === 'received') {
        updateData.received_date = new Date().toISOString();
        updateData.received_by = user?.id;
      } else if (newStatus === 'completed' || newStatus === 'rejected' || newStatus === 'refunded') {
        updateData.completed_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('wms_rma')
        .update(updateData)
        .eq('id', rmaId);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' ? 'تم تحديث الحالة' : 'Status updated',
      });

      loadRMAs();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
      });
    }
  };

  const updateLineCondition = async (lineId: string, condition: string, disposition: string) => {
    try {
      const { error } = await supabase
        .from('wms_rma_lines')
        .update({ condition, disposition })
        .eq('id', lineId);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' ? 'تم تحديث حالة المنتج' : 'Item condition updated',
      });

      if (selectedRMA) {
        loadRMALines(selectedRMA.id);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
      });
    }
  };

  const receiveRMAItem = async (lineId: string, quantity: number) => {
    try {
      const { error } = await supabase
        .from('wms_rma_lines')
        .update({ received_quantity: quantity })
        .eq('id', lineId);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' ? 'تم استلام المنتج' : 'Item received',
      });

      if (selectedRMA) {
        loadRMALines(selectedRMA.id);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
      });
    }
  };

  const resetForm = () => {
    setFormData({
      order_type: 'outbound',
      customer_name: '',
      reason: '',
      reason_category: '',
      notes: '',
    });
  };

  const openRMADetails = (rma: RMA) => {
    setSelectedRMA(rma);
    loadRMALines(rma.id);
    setIsLinesDialogOpen(true);
  };

  const filteredRMAs = rmas.filter(rma => {
    const matchesSearch = 
      rma.rma_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rma.customer_name && rma.customer_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || rma.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const canManage = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div className="min-h-screen">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <RotateCcw className="w-6 h-6" />
              {language === 'ar' ? 'إدارة المرتجعات (RMA)' : 'Returns Management (RMA)'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'إدارة طلبات الإرجاع والاسترداد' : 'Manage return and refund requests'}
            </p>
          </div>

          {canManage && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  {language === 'ar' ? 'طلب مرتجع جديد' : 'New RMA Request'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {language === 'ar' ? 'إنشاء طلب مرتجع' : 'Create RMA Request'}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'نوع الطلب' : 'Order Type'}</Label>
                    <Select
                      value={formData.order_type}
                      onValueChange={(value: 'inbound' | 'outbound') => setFormData({ ...formData, order_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="outbound">
                          {language === 'ar' ? 'إرجاع من عميل' : 'Customer Return'}
                        </SelectItem>
                        <SelectItem value="inbound">
                          {language === 'ar' ? 'إرجاع إلى مورد' : 'Return to Supplier'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'اسم العميل/المورد' : 'Customer/Supplier Name'}</Label>
                    <Input
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'فئة السبب' : 'Reason Category'}</Label>
                    <Select
                      value={formData.reason_category}
                      onValueChange={(value) => setFormData({ ...formData, reason_category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'ar' ? 'اختر الفئة' : 'Select category'} />
                      </SelectTrigger>
                      <SelectContent>
                        {reasonCategories.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label[language]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'سبب الإرجاع' : 'Return Reason'} *</Label>
                    <Textarea
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={2}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button onClick={handleSubmit} disabled={saving}>
                    {saving
                      ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                      : (language === 'ar' ? 'إنشاء' : 'Create')
                    }
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={language === 'ar' ? 'بحث برقم RMA أو اسم العميل...' : 'Search by RMA number or customer...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'ar' ? 'جميع الحالات' : 'All Status'}</SelectItem>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label[language]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{rmas.filter(r => r.status === 'pending').length}</div>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'قيد الانتظار' : 'Pending'}
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{rmas.filter(r => r.status === 'inspecting').length}</div>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'قيد الفحص' : 'Inspecting'}
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{rmas.filter(r => r.status === 'completed').length}</div>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'مكتمل' : 'Completed'}
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{rmas.filter(r => r.status === 'refunded').length}</div>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'مسترد' : 'Refunded'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* RMA Table */}
        <Card className="glass-card">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : filteredRMAs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <RotateCcw className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{language === 'ar' ? 'لا توجد طلبات مرتجعات' : 'No RMA requests found'}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'رقم RMA' : 'RMA Number'}</TableHead>
                    <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                    <TableHead>{language === 'ar' ? 'العميل/المورد' : 'Customer/Supplier'}</TableHead>
                    <TableHead>{language === 'ar' ? 'السبب' : 'Reason'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                    <TableHead>{language === 'ar' ? 'إجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRMAs.map((rma) => (
                    <TableRow key={rma.id}>
                      <TableCell className="font-mono font-medium">{rma.rma_number}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {rma.order_type === 'outbound'
                            ? (language === 'ar' ? 'إرجاع عميل' : 'Customer Return')
                            : (language === 'ar' ? 'إرجاع مورد' : 'Supplier Return')
                          }
                        </Badge>
                      </TableCell>
                      <TableCell>{rma.customer_name || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{rma.reason}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[rma.status] || ''}>
                          {statusLabels[rma.status]?.[language] || rma.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(rma.requested_date), 'dd/MM/yyyy', {
                          locale: language === 'ar' ? ar : enUS,
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openRMADetails(rma)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {canManage && rma.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateRMAStatus(rma.id, 'approved')}
                              >
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateRMAStatus(rma.id, 'rejected')}
                              >
                                <XCircle className="w-4 h-4 text-red-500" />
                              </Button>
                            </>
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

        {/* RMA Lines Dialog */}
        <Dialog open={isLinesDialogOpen} onOpenChange={setIsLinesDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {language === 'ar' ? 'تفاصيل المرتجع' : 'RMA Details'} - {selectedRMA?.rma_number}
              </DialogTitle>
            </DialogHeader>

            {selectedRMA && (
              <div className="space-y-6">
                {/* RMA Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الحالة' : 'Status'}</p>
                    <Badge className={statusColors[selectedRMA.status] || ''}>
                      {statusLabels[selectedRMA.status]?.[language] || selectedRMA.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{language === 'ar' ? 'العميل' : 'Customer'}</p>
                    <p className="font-medium">{selectedRMA.customer_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{language === 'ar' ? 'السبب' : 'Reason'}</p>
                    <p className="font-medium truncate">{selectedRMA.reason}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{language === 'ar' ? 'التاريخ' : 'Date'}</p>
                    <p className="font-medium">
                      {format(new Date(selectedRMA.requested_date), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>

                {/* Add Line Form */}
                {canManage && selectedRMA.status !== 'completed' && selectedRMA.status !== 'rejected' && (
                  <div className="p-4 border rounded-lg space-y-4">
                    <h4 className="font-medium">{language === 'ar' ? 'إضافة منتج' : 'Add Product'}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Select
                        value={lineFormData.product_id}
                        onValueChange={(value) => setLineFormData({ ...lineFormData, product_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={language === 'ar' ? 'اختر المنتج' : 'Select product'} />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map(product => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} ({product.sku})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder={language === 'ar' ? 'الكمية' : 'Quantity'}
                        value={lineFormData.quantity}
                        onChange={(e) => setLineFormData({ ...lineFormData, quantity: e.target.value })}
                      />
                      <Input
                        placeholder={language === 'ar' ? 'رقم الدفعة' : 'Lot Number'}
                        value={lineFormData.lot_number}
                        onChange={(e) => setLineFormData({ ...lineFormData, lot_number: e.target.value })}
                      />
                      <Button onClick={handleAddLine}>
                        <Plus className="w-4 h-4 me-2" />
                        {language === 'ar' ? 'إضافة' : 'Add'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Lines Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الكمية' : 'Quantity'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المستلم' : 'Received'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الحالة' : 'Condition'}</TableHead>
                      <TableHead>{language === 'ar' ? 'القرار' : 'Disposition'}</TableHead>
                      {canManage && <TableHead>{language === 'ar' ? 'إجراءات' : 'Actions'}</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rmaLines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{line.product?.name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{line.product?.sku}</p>
                            {line.serial_number && (
                              <p className="text-xs text-blue-500">SN: {line.serial_number}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{line.quantity}</TableCell>
                        <TableCell>{line.received_quantity}</TableCell>
                        <TableCell>
                          {canManage && selectedRMA.status === 'inspecting' ? (
                            <Select
                              value={line.condition || ''}
                              onValueChange={(value) => updateLineCondition(line.id, value, line.disposition || 'pending')}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {conditionOptions.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label[language]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline">
                              {conditionOptions.find(c => c.value === line.condition)?.label[language] || line.condition || '-'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {canManage && selectedRMA.status === 'inspecting' ? (
                            <Select
                              value={line.disposition || ''}
                              onValueChange={(value) => updateLineCondition(line.id, line.condition || 'pending_inspection', value)}
                            >
                              <SelectTrigger className="w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {dispositionOptions.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label[language]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline">
                              {dispositionOptions.find(d => d.value === line.disposition)?.label[language] || line.disposition || '-'}
                            </Badge>
                          )}
                        </TableCell>
                        {canManage && (
                          <TableCell>
                            {selectedRMA.status === 'approved' && line.received_quantity < line.quantity && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const qty = prompt(language === 'ar' ? 'أدخل الكمية المستلمة' : 'Enter received quantity', String(line.quantity));
                                  if (qty) receiveRMAItem(line.id, parseFloat(qty));
                                }}
                              >
                                {language === 'ar' ? 'استلام' : 'Receive'}
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Status Actions */}
                {canManage && (
                  <div className="flex gap-2 justify-end pt-4 border-t">
                    {selectedRMA.status === 'approved' && (
                      <Button onClick={() => updateRMAStatus(selectedRMA.id, 'received')}>
                        <Package className="w-4 h-4 me-2" />
                        {language === 'ar' ? 'تأكيد الاستلام' : 'Confirm Receipt'}
                      </Button>
                    )}
                    {selectedRMA.status === 'received' && (
                      <Button onClick={() => updateRMAStatus(selectedRMA.id, 'inspecting')}>
                        <AlertTriangle className="w-4 h-4 me-2" />
                        {language === 'ar' ? 'بدء الفحص' : 'Start Inspection'}
                      </Button>
                    )}
                    {selectedRMA.status === 'inspecting' && (
                      <>
                        <Button variant="outline" onClick={() => updateRMAStatus(selectedRMA.id, 'refunded')}>
                          {language === 'ar' ? 'استرداد' : 'Refund'}
                        </Button>
                        <Button onClick={() => updateRMAStatus(selectedRMA.id, 'completed')}>
                          <CheckCircle className="w-4 h-4 me-2" />
                          {language === 'ar' ? 'إتمام' : 'Complete'}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
