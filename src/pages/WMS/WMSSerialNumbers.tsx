import { useState, useEffect } from 'react';
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
import { Hash, Plus, Search, Edit, Trash2, History, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface SerialNumber {
  id: string;
  serial_number: string;
  product_id: string;
  status: string;
  location_id: string | null;
  lot_number: string | null;
  received_date: string | null;
  expiry_date: string | null;
  cost: number | null;
  notes: string | null;
  created_at: string;
  product?: { name: string; sku: string };
  location?: { code: string; zone: string };
}

interface Product {
  id: string;
  name: string;
  sku: string;
  requires_serial_tracking: boolean;
}

interface Location {
  id: string;
  code: string;
  zone: string;
}

const statusColors: Record<string, string> = {
  available: 'bg-green-500/10 text-green-500 border-green-500/20',
  reserved: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  sold: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  returned: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  scrapped: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const statusLabels: Record<string, { ar: string; en: string }> = {
  available: { ar: 'متاح', en: 'Available' },
  reserved: { ar: 'محجوز', en: 'Reserved' },
  sold: { ar: 'مباع', en: 'Sold' },
  returned: { ar: 'مرتجع', en: 'Returned' },
  scrapped: { ar: 'تالف', en: 'Scrapped' },
};

export default function WMSSerialNumbers() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();

  const [serialNumbers, setSerialNumbers] = useState<SerialNumber[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSerial, setEditingSerial] = useState<SerialNumber | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    serial_number: '',
    product_id: '',
    status: 'available',
    location_id: '',
    lot_number: '',
    received_date: '',
    expiry_date: '',
    cost: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [serialsRes, productsRes, locationsRes] = await Promise.all([
        supabase.from('wms_serial_numbers').select('*').order('created_at', { ascending: false }),
        supabase.from('wms_products').select('id, name, sku, requires_serial_tracking').eq('is_active', true),
        supabase.from('wms_locations').select('id, code, zone').eq('is_active', true),
      ]);

      if (serialsRes.error) throw serialsRes.error;

      // Enrich with product and location data
      const enrichedSerials = (serialsRes.data || []).map(serial => ({
        ...serial,
        product: productsRes.data?.find(p => p.id === serial.product_id),
        location: locationsRes.data?.find(l => l.id === serial.location_id),
      }));

      setSerialNumbers(enrichedSerials);
      setProducts(productsRes.data || []);
      setLocations(locationsRes.data || []);
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
    if (!formData.serial_number || !formData.product_id) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى إدخال الرقم التسلسلي والمنتج' : 'Please enter serial number and product',
      });
      return;
    }

    setSaving(true);
    try {
      const serialData = {
        serial_number: formData.serial_number,
        product_id: formData.product_id,
        status: formData.status,
        location_id: formData.location_id || null,
        lot_number: formData.lot_number || null,
        received_date: formData.received_date || null,
        expiry_date: formData.expiry_date || null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        notes: formData.notes || null,
      };

      if (editingSerial) {
        const { error } = await supabase
          .from('wms_serial_numbers')
          .update(serialData)
          .eq('id', editingSerial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('wms_serial_numbers')
          .insert(serialData);
        if (error) throw error;
      }

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: editingSerial
          ? (language === 'ar' ? 'تم تحديث الرقم التسلسلي' : 'Serial number updated')
          : (language === 'ar' ? 'تم إضافة الرقم التسلسلي' : 'Serial number added'),
      });

      setIsDialogOpen(false);
      resetForm();
      loadData();
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

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا الرقم التسلسلي؟' : 'Are you sure you want to delete this serial number?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('wms_serial_numbers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم الحذف' : 'Deleted',
        description: language === 'ar' ? 'تم حذف الرقم التسلسلي' : 'Serial number deleted',
      });

      loadData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
      });
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('wms_serial_numbers')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' ? 'تم تحديث الحالة' : 'Status updated',
      });

      loadData();
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
      serial_number: '',
      product_id: '',
      status: 'available',
      location_id: '',
      lot_number: '',
      received_date: '',
      expiry_date: '',
      cost: '',
      notes: '',
    });
    setEditingSerial(null);
  };

  const openEditDialog = (serial: SerialNumber) => {
    setEditingSerial(serial);
    setFormData({
      serial_number: serial.serial_number,
      product_id: serial.product_id,
      status: serial.status,
      location_id: serial.location_id || '',
      lot_number: serial.lot_number || '',
      received_date: serial.received_date || '',
      expiry_date: serial.expiry_date || '',
      cost: serial.cost?.toString() || '',
      notes: serial.notes || '',
    });
    setIsDialogOpen(true);
  };

  const filteredSerials = serialNumbers.filter(serial => {
    const matchesSearch =
      serial.serial_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      serial.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      serial.product?.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || serial.status === statusFilter;
    const matchesProduct = productFilter === 'all' || serial.product_id === productFilter;
    return matchesSearch && matchesStatus && matchesProduct;
  });

  const canManage = user?.role === 'admin' || user?.role === 'manager';

  // Products that require serial tracking
  const serialProducts = products.filter(p => p.requires_serial_tracking);

  return (
    <div className="min-h-screen">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Hash className="w-6 h-6" />
              {language === 'ar' ? 'تتبع الأرقام التسلسلية' : 'Serial Number Tracking'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'تتبع فردي لكل وحدة منتج' : 'Individual tracking for each product unit'}
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
                  {language === 'ar' ? 'إضافة رقم تسلسلي' : 'Add Serial Number'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingSerial
                      ? (language === 'ar' ? 'تعديل الرقم التسلسلي' : 'Edit Serial Number')
                      : (language === 'ar' ? 'إضافة رقم تسلسلي جديد' : 'Add New Serial Number')
                    }
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'الرقم التسلسلي' : 'Serial Number'} *</Label>
                    <Input
                      value={formData.serial_number}
                      onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                      placeholder="SN-XXXXXX"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'المنتج' : 'Product'} *</Label>
                    <Select
                      value={formData.product_id}
                      onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'ar' ? 'اختر المنتج' : 'Select product'} />
                      </SelectTrigger>
                      <SelectContent>
                        {serialProducts.map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} ({product.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{language === 'ar' ? 'الحالة' : 'Status'}</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label[language]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{language === 'ar' ? 'الموقع' : 'Location'}</Label>
                      <Select
                        value={formData.location_id}
                        onValueChange={(value) => setFormData({ ...formData, location_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={language === 'ar' ? 'اختر الموقع' : 'Select location'} />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map(loc => (
                            <SelectItem key={loc.id} value={loc.id}>
                              {loc.code} - {loc.zone}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{language === 'ar' ? 'رقم الدفعة' : 'Lot Number'}</Label>
                      <Input
                        value={formData.lot_number}
                        onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>{language === 'ar' ? 'التكلفة' : 'Cost'}</Label>
                      <Input
                        type="number"
                        value={formData.cost}
                        onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{language === 'ar' ? 'تاريخ الاستلام' : 'Received Date'}</Label>
                      <Input
                        type="date"
                        value={formData.received_date}
                        onChange={(e) => setFormData({ ...formData, received_date: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>{language === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'}</Label>
                      <Input
                        type="date"
                        value={formData.expiry_date}
                        onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                      />
                    </div>
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
                      : (language === 'ar' ? 'حفظ' : 'Save')
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
              placeholder={language === 'ar' ? 'بحث بالرقم التسلسلي أو المنتج...' : 'Search by serial number or product...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
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

          <Select value={productFilter} onValueChange={setProductFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'ar' ? 'جميع المنتجات' : 'All Products'}</SelectItem>
              {serialProducts.map(product => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {Object.entries(statusLabels).map(([status, label]) => (
            <Card key={status} className="glass-card">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {serialNumbers.filter(s => s.status === status).length}
                </div>
                <p className="text-sm text-muted-foreground">{label[language]}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Serial Numbers Table */}
        <Card className="glass-card">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : filteredSerials.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Hash className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{language === 'ar' ? 'لا توجد أرقام تسلسلية' : 'No serial numbers found'}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'الرقم التسلسلي' : 'Serial Number'}</TableHead>
                    <TableHead>{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الموقع' : 'Location'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead>{language === 'ar' ? 'تاريخ الاستلام' : 'Received'}</TableHead>
                    <TableHead>{language === 'ar' ? 'تاريخ الانتهاء' : 'Expiry'}</TableHead>
                    {canManage && <TableHead>{language === 'ar' ? 'إجراءات' : 'Actions'}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSerials.map((serial) => (
                    <TableRow key={serial.id}>
                      <TableCell className="font-mono font-medium">{serial.serial_number}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{serial.product?.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{serial.product?.sku}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {serial.location ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>{serial.location.code}</span>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {canManage ? (
                          <Select
                            value={serial.status}
                            onValueChange={(value) => updateStatus(serial.id, value)}
                          >
                            <SelectTrigger className="w-28">
                              <Badge className={statusColors[serial.status] || ''}>
                                {statusLabels[serial.status]?.[language] || serial.status}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(statusLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label[language]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className={statusColors[serial.status] || ''}>
                            {statusLabels[serial.status]?.[language] || serial.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {serial.received_date
                          ? format(new Date(serial.received_date), 'dd/MM/yyyy', {
                              locale: language === 'ar' ? ar : enUS,
                            })
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {serial.expiry_date
                          ? format(new Date(serial.expiry_date), 'dd/MM/yyyy', {
                              locale: language === 'ar' ? ar : enUS,
                            })
                          : '-'
                        }
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(serial)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(serial.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
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
}
