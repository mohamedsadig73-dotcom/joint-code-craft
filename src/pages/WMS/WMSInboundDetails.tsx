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
import { ArrowLeft, Plus, Package, MapPin, Calendar, Truck, CheckCircle, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import BarcodeScanner from '@/components/wms/BarcodeScanner';

interface InboundOrder {
  id: string;
  order_number: string;
  reference_number: string | null;
  supplier_id: string | null;
  status: string;
  expected_date: string | null;
  received_date: string | null;
  notes: string | null;
  created_at: string;
  supplier?: { name: string } | null;
}

interface InboundLine {
  id: string;
  product_id: string;
  expected_quantity: number;
  received_quantity: number | null;
  lot_number: string | null;
  expiry_date: string | null;
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

const WMSInboundDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const isRTL = language === 'ar';

  const [order, setOrder] = useState<InboundOrder | null>(null);
  const [lines, setLines] = useState<InboundLine[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<InboundLine | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    product_id: '',
    expected_quantity: '',
    received_quantity: '',
    lot_number: '',
    expiry_date: '',
    location_id: '',
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
      .from('wms_inbound_orders')
      .select('*, supplier:wms_suppliers(name)')
      .eq('id', id)
      .single();

    if (error) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive'
      });
      navigate('/wms/inbound');
    } else {
      setOrder(data);
    }
  };

  const loadLines = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('wms_inbound_lines')
      .select('*, product:wms_products(name, sku), location:wms_locations(code)')
      .eq('inbound_order_id', id)
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
      expected_quantity: '',
      received_quantity: '',
      lot_number: '',
      expiry_date: '',
      location_id: '',
      notes: ''
    });
    setEditingLine(null);
  };

  const openEditDialog = (line: InboundLine) => {
    setEditingLine(line);
    setFormData({
      product_id: line.product_id,
      expected_quantity: String(line.expected_quantity),
      received_quantity: String(line.received_quantity || ''),
      lot_number: line.lot_number || '',
      expiry_date: line.expiry_date || '',
      location_id: line.location_id || '',
      notes: line.notes || ''
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const lineData = {
      inbound_order_id: id,
      product_id: formData.product_id,
      expected_quantity: Number(formData.expected_quantity),
      received_quantity: formData.received_quantity ? Number(formData.received_quantity) : null,
      lot_number: formData.lot_number || null,
      expiry_date: formData.expiry_date || null,
      location_id: formData.location_id || null,
      notes: formData.notes || null,
      status: formData.received_quantity ? 'received' : 'pending'
    };

    let error;
    if (editingLine) {
      ({ error } = await supabase
        .from('wms_inbound_lines')
        .update(lineData)
        .eq('id', editingLine.id));
    } else {
      ({ error } = await supabase
        .from('wms_inbound_lines')
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
      .from('wms_inbound_lines')
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
        title: language === 'ar' ? 'تم الحذف' : 'Deleted',
        description: language === 'ar' ? 'تم حذف البند بنجاح' : 'Line deleted successfully'
      });
      loadLines();
    }
  };

  const receiveItem = async (line: InboundLine) => {
    const receivedQty = prompt(
      language === 'ar' ? 'أدخل الكمية المستلمة:' : 'Enter received quantity:',
      String(line.expected_quantity)
    );

    if (receivedQty === null) return;

    const qty = Number(receivedQty);
    if (isNaN(qty) || qty < 0) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'كمية غير صالحة' : 'Invalid quantity',
        variant: 'destructive'
      });
      return;
    }

    // Update the line status
    const { error } = await supabase
      .from('wms_inbound_lines')
      .update({ 
        received_quantity: qty, 
        status: 'received' 
      })
      .eq('id', line.id);

    if (error) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive'
      });
      return;
    }

    // Update inventory - add received quantity
    if (line.location_id) {
      // Check if inventory record exists
      const { data: existingInventory } = await supabase
        .from('wms_inventory')
        .select('id, quantity')
        .eq('product_id', line.product_id)
        .eq('location_id', line.location_id)
        .eq('lot_number', line.lot_number || '')
        .maybeSingle();

      if (existingInventory) {
        // Update existing inventory
        await supabase
          .from('wms_inventory')
          .update({ 
            quantity: existingInventory.quantity + qty,
            available_quantity: existingInventory.quantity + qty
          })
          .eq('id', existingInventory.id);
      } else {
        // Create new inventory record
        await supabase
          .from('wms_inventory')
          .insert({
            product_id: line.product_id,
            location_id: line.location_id,
            quantity: qty,
            available_quantity: qty,
            lot_number: line.lot_number,
            expiry_date: line.expiry_date,
            status: 'available',
            received_date: new Date().toISOString().split('T')[0]
          });
      }

      // Record transaction
      await supabase
        .from('wms_transactions')
        .insert({
          transaction_type: 'receive',
          product_id: line.product_id,
          to_location_id: line.location_id,
          quantity: qty,
          lot_number: line.lot_number,
          reference_type: 'inbound_order',
          reference_id: id,
          performed_by: user?.id,
          reason: `Received from inbound order ${order?.order_number}`
        });
    }

    toast({
      title: language === 'ar' ? 'تم الاستلام' : 'Received',
      description: language === 'ar' ? 'تم تسجيل الاستلام وتحديث المخزون' : 'Receipt recorded and inventory updated'
    });
    loadLines();
  };

  const completeOrder = async () => {
    const allReceived = lines.every(l => l.status === 'received');
    if (!allReceived) {
      toast({
        title: language === 'ar' ? 'تنبيه' : 'Warning',
        description: language === 'ar' ? 'يجب استلام جميع البنود أولاً' : 'All items must be received first',
        variant: 'destructive'
      });
      return;
    }

    const { error } = await supabase
      .from('wms_inbound_orders')
      .update({ status: 'completed', received_date: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' ? 'تم إكمال الأمر بنجاح' : 'Order completed successfully'
      });
      loadOrder();
    }
  };

  const breadcrumbItems = [
    { label: language === 'ar' ? 'نظام WMS' : 'WMS', href: '/wms' },
    { label: language === 'ar' ? 'أوامر الاستلام' : 'Inbound Orders', href: '/wms/inbound' },
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
            <Button variant="ghost" size="icon" onClick={() => navigate('/wms/inbound')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{order?.order_number}</h1>
              <p className="text-muted-foreground">
                {order?.reference_number && `${language === 'ar' ? 'المرجع' : 'Ref'}: ${order.reference_number}`}
              </p>
            </div>
          </div>
          {order && (
            <Badge className={statusColors[order.status]}>
              {statusLabels[order.status]?.[language] || order.status}
            </Badge>
          )}
        </div>

        {/* Order Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Truck className="h-4 w-4" />
                <span className="text-sm">{language === 'ar' ? 'المورد' : 'Supplier'}</span>
              </div>
              <p className="font-medium">{order?.supplier?.name || '-'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">{language === 'ar' ? 'تاريخ التوقع' : 'Expected'}</span>
              </div>
              <p className="font-medium">
                {order?.expected_date ? format(new Date(order.expected_date), 'yyyy-MM-dd') : '-'}
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
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">{language === 'ar' ? 'مستلم' : 'Received'}</span>
              </div>
              <p className="font-medium">
                {lines.filter(l => l.status === 'received').length} / {lines.length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Lines Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{language === 'ar' ? 'بنود الاستلام' : 'Inbound Lines'}</CardTitle>
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
                            <Label>{language === 'ar' ? 'الكمية المتوقعة' : 'Expected Qty'} *</Label>
                            <Input
                              type="number"
                              min="1"
                              value={formData.expected_quantity}
                              onChange={(e) => setFormData({...formData, expected_quantity: e.target.value})}
                              required
                            />
                          </div>
                          <div>
                            <Label>{language === 'ar' ? 'الكمية المستلمة' : 'Received Qty'}</Label>
                            <Input
                              type="number"
                              min="0"
                              value={formData.received_quantity}
                              onChange={(e) => setFormData({...formData, received_quantity: e.target.value})}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>{language === 'ar' ? 'رقم الدفعة' : 'Lot Number'}</Label>
                            <Input
                              value={formData.lot_number}
                              onChange={(e) => setFormData({...formData, lot_number: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label>{language === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'}</Label>
                            <Input
                              type="date"
                              value={formData.expiry_date}
                              onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                            />
                          </div>
                        </div>
                        <div>
                          <Label>{language === 'ar' ? 'الموقع' : 'Location'}</Label>
                          <Select value={formData.location_id} onValueChange={(v) => setFormData({...formData, location_id: v})}>
                            <SelectTrigger>
                              <SelectValue placeholder={language === 'ar' ? 'اختر الموقع' : 'Select location'} />
                            </SelectTrigger>
                            <SelectContent>
                              {locations.map(l => (
                                <SelectItem key={l.id} value={l.id}>{l.code} - {l.zone}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                  {lines.length > 0 && lines.every(l => l.status === 'received') && (
                    <Button size="sm" variant="default" onClick={completeOrder}>
                      <CheckCircle className="h-4 w-4 me-2" />
                      {language === 'ar' ? 'إكمال الأمر' : 'Complete Order'}
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
                    <TableHead className="text-center">{language === 'ar' ? 'متوقع' : 'Expected'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'مستلم' : 'Received'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الدفعة' : 'Lot'}</TableHead>
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
                      <TableCell className="text-center">{line.expected_quantity}</TableCell>
                      <TableCell className="text-center">{line.received_quantity || '-'}</TableCell>
                      <TableCell>{line.lot_number || '-'}</TableCell>
                      <TableCell>{line.location?.code || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={line.status === 'received' ? 'default' : 'secondary'}>
                          {line.status === 'received' 
                            ? (language === 'ar' ? 'مستلم' : 'Received')
                            : (language === 'ar' ? 'معلق' : 'Pending')}
                        </Badge>
                      </TableCell>
                      {canManage && order?.status !== 'completed' && (
                        <TableCell>
                          <div className="flex justify-center gap-1">
                            {line.status !== 'received' && (
                              <Button size="icon" variant="ghost" onClick={() => receiveItem(line)} title={language === 'ar' ? 'استلام' : 'Receive'}>
                                <CheckCircle className="h-4 w-4 text-green-600" />
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

export default WMSInboundDetails;
