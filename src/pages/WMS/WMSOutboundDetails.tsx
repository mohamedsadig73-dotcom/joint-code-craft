import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Plus, Package, User, Calendar, MapPin, CheckCircle, Edit, Trash2, PackageCheck, Truck } from 'lucide-react';
import { format } from 'date-fns';
import BarcodeScanner from '@/components/wms/BarcodeScanner';

interface OutboundOrder {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_reference: string | null;
  status: string;
  priority: string | null;
  expected_ship_date: string | null;
  shipped_date: string | null;
  shipping_address: string | null;
  notes: string | null;
  created_at: string;
}

interface OutboundLine {
  id: string;
  product_id: string;
  requested_quantity: number;
  picked_quantity: number | null;
  packed_quantity: number | null;
  shipped_quantity: number | null;
  lot_number: string | null;
  location_id: string | null;
  status: string | null;
  notes: string | null;
  product?: { name: string; sku: string } | null;
  location?: { code: string } | null;
}

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface Location {
  id: string;
  code: string;
  zone: string;
}

const WMSOutboundDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const isRTL = language === 'ar';

  const [order, setOrder] = useState<OutboundOrder | null>(null);
  const [lines, setLines] = useState<OutboundLine[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<OutboundLine | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    product_id: '',
    requested_quantity: '',
    picked_quantity: '',
    packed_quantity: '',
    location_id: '',
    lot_number: '',
    notes: ''
  });

  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const statusColors: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    pending: 'bg-yellow-500/20 text-yellow-600',
    in_progress: 'bg-blue-500/20 text-blue-600',
    completed: 'bg-green-500/20 text-green-600',
    cancelled: 'bg-red-500/20 text-red-600'
  };

  const statusLabels: Record<string, Record<string, string>> = {
    draft: { ar: 'مسودة', en: 'Draft' },
    pending: { ar: 'معلق', en: 'Pending' },
    in_progress: { ar: 'قيد التنفيذ', en: 'In Progress' },
    completed: { ar: 'مكتمل', en: 'Completed' },
    cancelled: { ar: 'ملغي', en: 'Cancelled' }
  };

  const priorityLabels: Record<string, Record<string, string>> = {
    low: { ar: 'منخفضة', en: 'Low' },
    normal: { ar: 'عادية', en: 'Normal' },
    high: { ar: 'عالية', en: 'High' },
    urgent: { ar: 'عاجلة', en: 'Urgent' }
  };

  useEffect(() => {
    if (id) {
      loadOrder();
      loadLines();
      loadProducts();
      loadLocations();
    }
  }, [id]);

  const loadOrder = async () => {
    const { data, error } = await supabase
      .from('wms_outbound_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive'
      });
      navigate('/wms/outbound');
    } else {
      setOrder(data);
    }
  };

  const loadLines = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('wms_outbound_lines')
      .select('*, product:wms_products(name, sku), location:wms_locations(code)')
      .eq('outbound_order_id', id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setLines(data);
    }
    setLoading(false);
  };

  const loadProducts = async () => {
    const { data } = await supabase
      .from('wms_products')
      .select('id, name, sku')
      .eq('is_active', true)
      .order('name');
    if (data) setProducts(data);
  };

  const loadLocations = async () => {
    const { data } = await supabase
      .from('wms_locations')
      .select('id, code, zone')
      .eq('is_active', true)
      .order('code');
    if (data) setLocations(data);
  };

  const resetForm = () => {
    setFormData({
      product_id: '',
      requested_quantity: '',
      picked_quantity: '',
      packed_quantity: '',
      location_id: '',
      lot_number: '',
      notes: ''
    });
    setEditingLine(null);
  };

  const openEditDialog = (line: OutboundLine) => {
    setEditingLine(line);
    setFormData({
      product_id: line.product_id,
      requested_quantity: String(line.requested_quantity),
      picked_quantity: String(line.picked_quantity || ''),
      packed_quantity: String(line.packed_quantity || ''),
      location_id: line.location_id || '',
      lot_number: line.lot_number || '',
      notes: line.notes || ''
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const lineData = {
      outbound_order_id: id,
      product_id: formData.product_id,
      requested_quantity: Number(formData.requested_quantity),
      picked_quantity: formData.picked_quantity ? Number(formData.picked_quantity) : null,
      packed_quantity: formData.packed_quantity ? Number(formData.packed_quantity) : null,
      location_id: formData.location_id || null,
      lot_number: formData.lot_number || null,
      notes: formData.notes || null,
      status: formData.packed_quantity ? 'packed' : formData.picked_quantity ? 'picked' : 'pending'
    };

    let error;
    if (editingLine) {
      ({ error } = await supabase
        .from('wms_outbound_lines')
        .update(lineData)
        .eq('id', editingLine.id));
    } else {
      ({ error } = await supabase
        .from('wms_outbound_lines')
        .insert(lineData));
    }

    if (error) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' 
          ? (editingLine ? 'تم تحديث البند' : 'تم إضافة البند')
          : (editingLine ? 'Line updated' : 'Line added')
      });
      loadLines();
      setDialogOpen(false);
      resetForm();
    }
    setSaving(false);
  };

  const handleDelete = async (lineId: string) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من الحذف؟' : 'Are you sure you want to delete?')) return;

    const { error } = await supabase
      .from('wms_outbound_lines')
      .delete()
      .eq('id', lineId);

    if (error) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: language === 'ar' ? 'تم الحذف' : 'Deleted'
      });
      loadLines();
    }
  };

  const pickItem = async (line: OutboundLine) => {
    const qty = prompt(
      language === 'ar' ? 'أدخل كمية الانتقاء:' : 'Enter picked quantity:',
      String(line.requested_quantity)
    );
    if (qty === null) return;

    const { error } = await supabase
      .from('wms_outbound_lines')
      .update({ picked_quantity: Number(qty), status: 'picked' })
      .eq('id', line.id);

    if (!error) {
      toast({ title: language === 'ar' ? 'تم الانتقاء' : 'Picked' });
      loadLines();
    }
  };

  const packItem = async (line: OutboundLine) => {
    const qty = prompt(
      language === 'ar' ? 'أدخل كمية التعبئة:' : 'Enter packed quantity:',
      String(line.picked_quantity || line.requested_quantity)
    );
    if (qty === null) return;

    const { error } = await supabase
      .from('wms_outbound_lines')
      .update({ packed_quantity: Number(qty), status: 'packed' })
      .eq('id', line.id);

    if (!error) {
      toast({ title: language === 'ar' ? 'تم التعبئة' : 'Packed' });
      loadLines();
    }
  };

  const shipOrder = async () => {
    const allPacked = lines.every(l => l.status === 'packed');
    if (!allPacked) {
      toast({
        title: language === 'ar' ? 'تنبيه' : 'Warning',
        description: language === 'ar' ? 'يجب تعبئة جميع البنود أولاً' : 'All items must be packed first',
        variant: 'destructive'
      });
      return;
    }

    // Update all lines with shipped quantity and deduct from inventory
    for (const line of lines) {
      await supabase
        .from('wms_outbound_lines')
        .update({ shipped_quantity: line.packed_quantity, status: 'shipped' })
        .eq('id', line.id);

      // Deduct from inventory
      if (line.location_id) {
        const { data: inventory } = await supabase
          .from('wms_inventory')
          .select('id, quantity, available_quantity')
          .eq('product_id', line.product_id)
          .eq('location_id', line.location_id)
          .maybeSingle();

        if (inventory) {
          const newQty = Math.max(0, inventory.quantity - (line.packed_quantity || 0));
          await supabase
            .from('wms_inventory')
            .update({ 
              quantity: newQty,
              available_quantity: newQty
            })
            .eq('id', inventory.id);
        }

        // Record transaction
        await supabase
          .from('wms_transactions')
          .insert({
            transaction_type: 'ship',
            product_id: line.product_id,
            from_location_id: line.location_id,
            quantity: line.packed_quantity || 0,
            lot_number: line.lot_number,
            reference_type: 'outbound_order',
            reference_id: id,
            performed_by: user?.id,
            reason: `Shipped for outbound order ${order?.order_number}`
          });
      }
    }

    const { error } = await supabase
      .from('wms_outbound_orders')
      .update({ status: 'completed', shipped_date: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      toast({
        title: language === 'ar' ? 'تم الشحن' : 'Shipped',
        description: language === 'ar' ? 'تم شحن الأمر وتحديث المخزون' : 'Order shipped and inventory updated'
      });
      loadOrder();
      loadLines();
    }
  };

  const breadcrumbItems = [
    { label: language === 'ar' ? 'نظام WMS' : 'WMS', href: '/wms' },
    { label: language === 'ar' ? 'أوامر الصرف' : 'Outbound Orders', href: '/wms/outbound' },
    { label: order?.order_number || '...' }
  ];

  if (!order && !loading) return null;

  return (
    <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Navigation />
      <main className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbItems} className="mb-4" />

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/wms/outbound')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{order?.order_number}</h1>
              <p className="text-muted-foreground">{order?.customer_name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {order?.priority && (
              <Badge variant="outline">
                {priorityLabels[order.priority]?.[language] || order.priority}
              </Badge>
            )}
            {order && (
              <Badge className={statusColors[order.status]}>
                {statusLabels[order.status]?.[language] || order.status}
              </Badge>
            )}
          </div>
        </div>

        {/* Order Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <User className="h-4 w-4" />
                <span className="text-sm">{language === 'ar' ? 'العميل' : 'Customer'}</span>
              </div>
              <p className="font-medium">{order?.customer_name || '-'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">{language === 'ar' ? 'تاريخ الشحن' : 'Ship Date'}</span>
              </div>
              <p className="font-medium">
                {order?.expected_ship_date ? format(new Date(order.expected_ship_date), 'yyyy-MM-dd') : '-'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Package className="h-4 w-4" />
                <span className="text-sm">{language === 'ar' ? 'عدد البنود' : 'Items'}</span>
              </div>
              <p className="font-medium">{lines.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">{language === 'ar' ? 'العنوان' : 'Address'}</span>
              </div>
              <p className="font-medium text-sm truncate">{order?.shipping_address || '-'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Lines Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{language === 'ar' ? 'بنود الصرف' : 'Outbound Lines'}</CardTitle>
            <div className="flex gap-2">
              {canManage && order?.status !== 'completed' && (
                <>
                  <BarcodeScanner 
                    onProductFound={(product) => {
                      setFormData(prev => ({...prev, product_id: product.id}));
                      setDialogOpen(true);
                    }}
                  />
                  <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 me-2" />
                        {language === 'ar' ? 'إضافة بند' : 'Add Line'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>
                          {editingLine 
                            ? (language === 'ar' ? 'تعديل البند' : 'Edit Line')
                            : (language === 'ar' ? 'إضافة بند جديد' : 'Add New Line')}
                        </DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <Label>{language === 'ar' ? 'المنتج' : 'Product'} *</Label>
                          <Select value={formData.product_id} onValueChange={(v) => setFormData({...formData, product_id: v})}>
                            <SelectTrigger>
                              <SelectValue placeholder={language === 'ar' ? 'اختر المنتج' : 'Select product'} />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>{language === 'ar' ? 'الكمية المطلوبة' : 'Requested'} *</Label>
                            <Input
                              type="number"
                              min="1"
                              value={formData.requested_quantity}
                              onChange={(e) => setFormData({...formData, requested_quantity: e.target.value})}
                              required
                            />
                          </div>
                          <div>
                            <Label>{language === 'ar' ? 'الموقع' : 'Location'}</Label>
                            <Select value={formData.location_id} onValueChange={(v) => setFormData({...formData, location_id: v})}>
                              <SelectTrigger>
                                <SelectValue placeholder={language === 'ar' ? 'اختر' : 'Select'} />
                              </SelectTrigger>
                              <SelectContent>
                                {locations.map(l => (
                                  <SelectItem key={l.id} value={l.id}>{l.code}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label>{language === 'ar' ? 'رقم الدفعة' : 'Lot Number'}</Label>
                          <Input
                            value={formData.lot_number}
                            onChange={(e) => setFormData({...formData, lot_number: e.target.value})}
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                          <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                            {language === 'ar' ? 'إلغاء' : 'Cancel'}
                          </Button>
                          <Button type="submit" disabled={saving}>
                            {saving ? '...' : (language === 'ar' ? 'حفظ' : 'Save')}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                  {lines.length > 0 && lines.every(l => l.status === 'packed') && (
                    <Button size="sm" variant="default" onClick={shipOrder}>
                      <Truck className="h-4 w-4 me-2" />
                      {language === 'ar' ? 'شحن الأمر' : 'Ship Order'}
                    </Button>
                  )}
                </>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : lines.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {language === 'ar' ? 'لا توجد بنود' : 'No lines found'}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                    <TableHead>{language === 'ar' ? 'SKU' : 'SKU'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'مطلوب' : 'Requested'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'منتقى' : 'Picked'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'معبأ' : 'Packed'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الموقع' : 'Location'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                    {canManage && order?.status !== 'completed' && (
                      <TableHead className="text-center">{language === 'ar' ? 'إجراءات' : 'Actions'}</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map(line => (
                    <TableRow key={line.id}>
                      <TableCell className="font-medium">{line.product?.name}</TableCell>
                      <TableCell className="text-muted-foreground">{line.product?.sku}</TableCell>
                      <TableCell className="text-center">{line.requested_quantity}</TableCell>
                      <TableCell className="text-center">{line.picked_quantity || '-'}</TableCell>
                      <TableCell className="text-center">{line.packed_quantity || '-'}</TableCell>
                      <TableCell>{line.location?.code || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={line.status === 'packed' || line.status === 'shipped' ? 'default' : 'secondary'}>
                          {line.status === 'shipped' ? (language === 'ar' ? 'مشحون' : 'Shipped') :
                           line.status === 'packed' ? (language === 'ar' ? 'معبأ' : 'Packed') :
                           line.status === 'picked' ? (language === 'ar' ? 'منتقى' : 'Picked') :
                           (language === 'ar' ? 'معلق' : 'Pending')}
                        </Badge>
                      </TableCell>
                      {canManage && order?.status !== 'completed' && (
                        <TableCell>
                          <div className="flex justify-center gap-1">
                            {line.status === 'pending' && (
                              <Button size="icon" variant="ghost" onClick={() => pickItem(line)} title={language === 'ar' ? 'انتقاء' : 'Pick'}>
                                <CheckCircle className="h-4 w-4 text-blue-600" />
                              </Button>
                            )}
                            {line.status === 'picked' && (
                              <Button size="icon" variant="ghost" onClick={() => packItem(line)} title={language === 'ar' ? 'تعبئة' : 'Pack'}>
                                <PackageCheck className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" onClick={() => openEditDialog(line)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(line.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
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
};

export default WMSOutboundDetails;
