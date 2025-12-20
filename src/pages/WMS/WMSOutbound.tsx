import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Card, CardContent } from '@/components/ui/card';
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
import { ArrowUpFromLine, Plus, Search, Eye, CheckCircle2, Package, Truck } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type WMSOrderStatus = Database['public']['Enums']['wms_order_status'];

interface OutboundOrder {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_reference: string | null;
  status: WMSOrderStatus;
  priority: string | null;
  expected_ship_date: string | null;
  shipped_date: string | null;
  shipping_address: string | null;
  notes: string | null;
  created_at: string;
}

const statusColors: Record<WMSOrderStatus, string> = {
  draft: 'bg-gray-500',
  pending: 'bg-yellow-500',
  in_progress: 'bg-blue-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-500',
};

const statusLabels: Record<WMSOrderStatus, { ar: string; en: string }> = {
  draft: { ar: 'مسودة', en: 'Draft' },
  pending: { ar: 'قيد الانتظار', en: 'Pending' },
  in_progress: { ar: 'قيد التجهيز', en: 'In Progress' },
  completed: { ar: 'تم الشحن', en: 'Shipped' },
  cancelled: { ar: 'ملغي', en: 'Cancelled' },
};

const priorityOptions = [
  { value: 'low', label: { ar: 'منخفض', en: 'Low' }, color: 'bg-gray-500' },
  { value: 'normal', label: { ar: 'عادي', en: 'Normal' }, color: 'bg-blue-500' },
  { value: 'high', label: { ar: 'عالي', en: 'High' }, color: 'bg-orange-500' },
  { value: 'urgent', label: { ar: 'عاجل', en: 'Urgent' }, color: 'bg-red-500' },
];

export default function WMSOutbound() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState<OutboundOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_reference: '',
    priority: 'normal',
    expected_ship_date: '',
    shipping_address: '',
    notes: '',
  });

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('wms_outbound_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
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

  const handleSubmit = async () => {
    if (!formData.customer_name) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى إدخال اسم العميل' : 'Please enter customer name',
      });
      return;
    }

    setSaving(true);
    try {
      const { data: orderNumber } = await supabase.rpc('generate_wms_order_number', { prefix: 'OUT' });
      
      const orderData = {
        order_number: orderNumber,
        customer_name: formData.customer_name,
        customer_reference: formData.customer_reference || null,
        priority: formData.priority,
        expected_ship_date: formData.expected_ship_date || null,
        shipping_address: formData.shipping_address || null,
        notes: formData.notes || null,
        status: 'draft' as WMSOrderStatus,
        created_by: user?.id,
      };

      const { data, error } = await supabase
        .from('wms_outbound_orders')
        .insert(orderData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' ? 'تم إنشاء أمر الصرف' : 'Outbound order created',
      });

      setIsDialogOpen(false);
      resetForm();
      loadOrders();
      
      if (data) {
        navigate(`/wms/outbound/${data.id}`);
      }
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

  const updateOrderStatus = async (orderId: string, newStatus: WMSOrderStatus) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'completed') {
        updateData.shipped_date = new Date().toISOString();
        updateData.shipped_by = user?.id;
      }

      const { error } = await supabase
        .from('wms_outbound_orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم التحديث' : 'Updated',
        description: language === 'ar' ? 'تم تحديث حالة الأمر' : 'Order status updated',
      });

      loadOrders();
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
      customer_name: '',
      customer_reference: '',
      priority: 'normal',
      expected_ship_date: '',
      shipping_address: '',
      notes: '',
    });
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customer_name && order.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.customer_reference && order.customer_reference.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const canManage = user?.role === 'admin' || user?.role === 'manager';

  // Stats
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const inProgressCount = orders.filter(o => o.status === 'in_progress').length;
  const shippedTodayCount = orders.filter(o => 
    o.status === 'completed' && 
    o.shipped_date && 
    new Date(o.shipped_date).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ArrowUpFromLine className="w-6 h-6" />
              {language === 'ar' ? 'أوامر الصرف' : 'Outbound Orders'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'إدارة أوامر التجهيز والشحن' : 'Manage picking and shipping orders'}
            </p>
          </div>

          {canManage && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  {language === 'ar' ? 'أمر صرف جديد' : 'New Outbound Order'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {language === 'ar' ? 'إنشاء أمر صرف جديد' : 'Create New Outbound Order'}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'اسم العميل' : 'Customer Name'} *</Label>
                    <Input
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'مرجع العميل' : 'Customer Reference'}</Label>
                    <Input
                      value={formData.customer_reference}
                      onChange={(e) => setFormData({ ...formData, customer_reference: e.target.value })}
                      placeholder={language === 'ar' ? 'رقم طلب العميل' : 'Customer order number'}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'الأولوية' : 'Priority'}</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => setFormData({ ...formData, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label[language]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'تاريخ الشحن المتوقع' : 'Expected Ship Date'}</Label>
                    <Input
                      type="date"
                      value={formData.expected_ship_date}
                      onChange={(e) => setFormData({ ...formData, expected_ship_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'عنوان الشحن' : 'Shipping Address'}</Label>
                    <Textarea
                      value={formData.shipping_address}
                      onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                      rows={2}
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
                      ? (language === 'ar' ? 'جاري الإنشاء...' : 'Creating...')
                      : (language === 'ar' ? 'إنشاء' : 'Create')
                    }
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'قيد الانتظار' : 'Pending'}</p>
                  <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Package className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'قيد التجهيز' : 'In Progress'}</p>
                  <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'تم شحنه اليوم' : 'Shipped Today'}</p>
                  <p className="text-2xl font-bold text-green-600">{shippedTodayCount}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={language === 'ar' ? 'بحث برقم الأمر أو العميل...' : 'Search by order number or customer...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={language === 'ar' ? 'الحالة' : 'Status'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'ar' ? 'جميع الحالات' : 'All Statuses'}</SelectItem>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label[language]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Orders Table */}
        <Card className="glass-card">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ArrowUpFromLine className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{language === 'ar' ? 'لا توجد أوامر صرف' : 'No outbound orders found'}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'رقم الأمر' : 'Order #'}</TableHead>
                    <TableHead>{language === 'ar' ? 'العميل' : 'Customer'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الأولوية' : 'Priority'}</TableHead>
                    <TableHead>{language === 'ar' ? 'تاريخ الشحن' : 'Ship Date'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead>{language === 'ar' ? 'إجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono font-medium">{order.order_number}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.customer_name || '-'}</p>
                          {order.customer_reference && (
                            <p className="text-xs text-muted-foreground">{order.customer_reference}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.priority && (
                          <Badge className={priorityOptions.find(p => p.value === order.priority)?.color}>
                            {priorityOptions.find(p => p.value === order.priority)?.label[language]}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {order.expected_ship_date 
                          ? new Date(order.expected_ship_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[order.status]}>
                          {statusLabels[order.status][language]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/wms/outbound/${order.id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {canManage && order.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, 'pending')}
                            >
                              <CheckCircle2 className="w-4 h-4 text-yellow-600" />
                            </Button>
                          )}
                          {canManage && order.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, 'in_progress')}
                            >
                              <CheckCircle2 className="w-4 h-4 text-blue-600" />
                            </Button>
                          )}
                          {canManage && order.status === 'in_progress' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, 'completed')}
                            >
                              <Truck className="w-4 h-4 text-green-600" />
                            </Button>
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
      </main>
    </div>
  );
}
