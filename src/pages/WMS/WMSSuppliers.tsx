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
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Truck, Plus, Search, Edit, Trash2, Phone, Mail, MapPin } from 'lucide-react';

interface Supplier {
  id: string;
  code: string | null;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  payment_terms: string | null;
  lead_time_days: number | null;
  is_active: boolean;
  notes: string | null;
}

export default function WMSSuppliers() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    payment_terms: '',
    lead_time_days: '',
    is_active: true,
    notes: '',
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('wms_suppliers')
        .select('*')
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
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
    if (!formData.name) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى إدخال اسم المورد' : 'Please enter supplier name',
      });
      return;
    }

    setSaving(true);
    try {
      const supplierData = {
        code: formData.code || null,
        name: formData.name,
        contact_person: formData.contact_person || null,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        city: formData.city || null,
        country: formData.country || null,
        payment_terms: formData.payment_terms || null,
        lead_time_days: formData.lead_time_days ? parseInt(formData.lead_time_days) : null,
        is_active: formData.is_active,
        notes: formData.notes || null,
        created_by: user?.id,
      };

      if (editingSupplier) {
        const { error } = await supabase
          .from('wms_suppliers')
          .update(supplierData)
          .eq('id', editingSupplier.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('wms_suppliers')
          .insert(supplierData);
        if (error) throw error;
      }

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: editingSupplier 
          ? (language === 'ar' ? 'تم تحديث المورد' : 'Supplier updated')
          : (language === 'ar' ? 'تم إضافة المورد' : 'Supplier added'),
      });

      setIsDialogOpen(false);
      resetForm();
      loadSuppliers();
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
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا المورد؟' : 'Are you sure you want to delete this supplier?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('wms_suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم الحذف' : 'Deleted',
        description: language === 'ar' ? 'تم حذف المورد بنجاح' : 'Supplier deleted successfully',
      });

      loadSuppliers();
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
      code: '',
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: '',
      payment_terms: '',
      lead_time_days: '',
      is_active: true,
      notes: '',
    });
    setEditingSupplier(null);
  };

  const openEditDialog = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      code: supplier.code || '',
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      city: supplier.city || '',
      country: supplier.country || '',
      payment_terms: supplier.payment_terms || '',
      lead_time_days: supplier.lead_time_days?.toString() || '',
      is_active: supplier.is_active,
      notes: supplier.notes || '',
    });
    setIsDialogOpen(true);
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (supplier.code && supplier.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (supplier.contact_person && supplier.contact_person.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
              <Truck className="w-6 h-6" />
              {language === 'ar' ? 'إدارة الموردين' : 'Supplier Management'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'إضافة وإدارة الموردين والمصادر' : 'Add and manage suppliers and sources'}
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
                  {language === 'ar' ? 'إضافة مورد' : 'Add Supplier'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingSupplier 
                      ? (language === 'ar' ? 'تعديل المورد' : 'Edit Supplier')
                      : (language === 'ar' ? 'إضافة مورد جديد' : 'Add New Supplier')
                    }
                  </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'كود المورد' : 'Supplier Code'}</Label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="SUP-001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'اسم المورد' : 'Supplier Name'} *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'جهة الاتصال' : 'Contact Person'}</Label>
                    <Input
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'رقم الهاتف' : 'Phone'}</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'المدينة' : 'City'}</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'الدولة' : 'Country'}</Label>
                    <Input
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'شروط الدفع' : 'Payment Terms'}</Label>
                    <Input
                      value={formData.payment_terms}
                      onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                      placeholder={language === 'ar' ? 'مثال: 30 يوم' : 'e.g. Net 30'}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'مدة التسليم (أيام)' : 'Lead Time (days)'}</Label>
                    <Input
                      type="number"
                      value={formData.lead_time_days}
                      onChange={(e) => setFormData({ ...formData, lead_time_days: e.target.value })}
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label>{language === 'ar' ? 'العنوان' : 'Address'}</Label>
                    <Textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div className="md:col-span-2 flex items-center gap-2">
                    <Checkbox
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: !!checked })}
                    />
                    <Label htmlFor="is_active">
                      {language === 'ar' ? 'مورد نشط' : 'Active Supplier'}
                    </Label>
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

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={language === 'ar' ? 'بحث بالاسم أو الكود...' : 'Search by name or code...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-10"
            />
          </div>
        </div>

        {/* Suppliers Table */}
        <Card className="glass-card">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{language === 'ar' ? 'لا يوجد موردون' : 'No suppliers found'}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'المورد' : 'Supplier'}</TableHead>
                    <TableHead>{language === 'ar' ? 'جهة الاتصال' : 'Contact'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الموقع' : 'Location'}</TableHead>
                    <TableHead>{language === 'ar' ? 'مدة التسليم' : 'Lead Time'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                    {canManage && <TableHead>{language === 'ar' ? 'إجراءات' : 'Actions'}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{supplier.name}</p>
                          {supplier.code && (
                            <p className="text-xs text-muted-foreground font-mono">{supplier.code}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {supplier.contact_person && (
                            <p className="text-sm">{supplier.contact_person}</p>
                          )}
                          {supplier.phone && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              {supplier.phone}
                            </div>
                          )}
                          {supplier.email && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="w-3 h-3" />
                              {supplier.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {supplier.city || supplier.country ? (
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            {[supplier.city, supplier.country].filter(Boolean).join(', ')}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {supplier.lead_time_days ? (
                          <span>{supplier.lead_time_days} {language === 'ar' ? 'يوم' : 'days'}</span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={supplier.is_active ? 'default' : 'secondary'}>
                          {supplier.is_active 
                            ? (language === 'ar' ? 'نشط' : 'Active')
                            : (language === 'ar' ? 'غير نشط' : 'Inactive')
                          }
                        </Badge>
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(supplier)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(supplier.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
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
