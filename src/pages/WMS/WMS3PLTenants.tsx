import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Building2, Plus, Edit, Trash2, Users, Calendar, Package, Search, Warehouse, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { Progress } from '@/components/ui/progress';

export default function WMS3PLTenants() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isRTL = language === 'ar';
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    tenant_code: '',
    tenant_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    contract_start: '',
    contract_end: '',
    storage_allocation: '',
    billing_cycle: 'monthly',
    notes: ''
  });

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['wms-3pl-tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wms_3pl_tenants')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('wms_3pl_tenants').insert({
        tenant_code: data.tenant_code,
        tenant_name: data.tenant_name,
        contact_person: data.contact_person || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        contract_start: data.contract_start || null,
        contract_end: data.contract_end || null,
        storage_allocation: data.storage_allocation ? parseFloat(data.storage_allocation) : null,
        billing_cycle: data.billing_cycle,
        notes: data.notes || null,
        created_by: user?.id
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wms-3pl-tenants'] });
      toast({ title: language === 'ar' ? 'تم إضافة المستأجر بنجاح' : 'Tenant added successfully' });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'خطأ' : 'Error', variant: 'destructive' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { error } = await supabase
        .from('wms_3pl_tenants')
        .update({
          tenant_code: data.tenant_code,
          tenant_name: data.tenant_name,
          contact_person: data.contact_person || null,
          email: data.email || null,
          phone: data.phone || null,
          address: data.address || null,
          contract_start: data.contract_start || null,
          contract_end: data.contract_end || null,
          storage_allocation: data.storage_allocation ? parseFloat(data.storage_allocation) : null,
          billing_cycle: data.billing_cycle,
          notes: data.notes || null
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wms-3pl-tenants'] });
      toast({ title: language === 'ar' ? 'تم تحديث المستأجر بنجاح' : 'Tenant updated successfully' });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'خطأ' : 'Error', variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('wms_3pl_tenants').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wms-3pl-tenants'] });
      toast({ title: language === 'ar' ? 'تم حذف المستأجر بنجاح' : 'Tenant deleted successfully' });
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'خطأ' : 'Error', variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setFormData({
      tenant_code: '',
      tenant_name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      contract_start: '',
      contract_end: '',
      storage_allocation: '',
      billing_cycle: 'monthly',
      notes: ''
    });
    setEditingTenant(null);
  };

  const handleEdit = (tenant: any) => {
    setEditingTenant(tenant);
    setFormData({
      tenant_code: tenant.tenant_code,
      tenant_name: tenant.tenant_name,
      contact_person: tenant.contact_person || '',
      email: tenant.email || '',
      phone: tenant.phone || '',
      address: tenant.address || '',
      contract_start: tenant.contract_start || '',
      contract_end: tenant.contract_end || '',
      storage_allocation: tenant.storage_allocation?.toString() || '',
      billing_cycle: tenant.billing_cycle || 'monthly',
      notes: tenant.notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTenant) {
      updateMutation.mutate({ ...formData, id: editingTenant.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredTenants = tenants.filter((t: any) =>
    t.tenant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.tenant_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeTenants = tenants.filter((t: any) => t.is_active);
  const totalStorage = tenants.reduce((sum: number, t: any) => sum + (t.storage_allocation || 0), 0);

  const breadcrumbItems = [
    { label: language === 'ar' ? 'نظام WMS' : 'WMS', href: '/wms' },
    { label: language === 'ar' ? 'إدارة المستأجرين (3PL)' : '3PL Tenants' }
  ];

  const getBillingLabel = (cycle: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      weekly: { ar: 'أسبوعي', en: 'Weekly' },
      monthly: { ar: 'شهري', en: 'Monthly' },
      quarterly: { ar: 'ربع سنوي', en: 'Quarterly' },
      yearly: { ar: 'سنوي', en: 'Yearly' }
    };
    return labels[cycle]?.[language === 'ar' ? 'ar' : 'en'] || cycle;
  };

  return (
    <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Navigation />
      <main className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbItems} className="mb-4" />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              {language === 'ar' ? 'إدارة المستأجرين (3PL)' : '3PL Tenant Management'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'إدارة العملاء والمساحات المخصصة' : 'Manage clients and allocated space'}
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                {language === 'ar' ? 'إضافة مستأجر' : 'Add Tenant'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTenant ? (language === 'ar' ? 'تعديل مستأجر' : 'Edit Tenant') : (language === 'ar' ? 'إضافة مستأجر جديد' : 'Add New Tenant')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'رمز المستأجر *' : 'Tenant Code *'}</Label>
                    <Input
                      value={formData.tenant_code}
                      onChange={(e) => setFormData({ ...formData, tenant_code: e.target.value })}
                      placeholder="TN-001"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'اسم المستأجر *' : 'Tenant Name *'}</Label>
                    <Input
                      value={formData.tenant_name}
                      onChange={(e) => setFormData({ ...formData, tenant_name: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'الهاتف' : 'Phone'}</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'دورة الفوترة' : 'Billing Cycle'}</Label>
                    <Select value={formData.billing_cycle} onValueChange={(v) => setFormData({ ...formData, billing_cycle: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">{language === 'ar' ? 'أسبوعي' : 'Weekly'}</SelectItem>
                        <SelectItem value="monthly">{language === 'ar' ? 'شهري' : 'Monthly'}</SelectItem>
                        <SelectItem value="quarterly">{language === 'ar' ? 'ربع سنوي' : 'Quarterly'}</SelectItem>
                        <SelectItem value="yearly">{language === 'ar' ? 'سنوي' : 'Yearly'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'بداية العقد' : 'Contract Start'}</Label>
                    <Input
                      type="date"
                      value={formData.contract_start}
                      onChange={(e) => setFormData({ ...formData, contract_start: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'نهاية العقد' : 'Contract End'}</Label>
                    <Input
                      type="date"
                      value={formData.contract_end}
                      onChange={(e) => setFormData({ ...formData, contract_end: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'المساحة (م²)' : 'Space (m²)'}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.storage_allocation}
                      onChange={(e) => setFormData({ ...formData, storage_allocation: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'العنوان' : 'Address'}</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
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
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingTenant ? (language === 'ar' ? 'تحديث' : 'Update') : (language === 'ar' ? 'إنشاء' : 'Create')}
                  </Button>
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
                <div className="p-3 rounded-lg bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي المستأجرين' : 'Total Tenants'}</p>
                  <p className="text-2xl font-bold">{tenants.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <Users className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'النشطون' : 'Active'}</p>
                  <p className="text-2xl font-bold">{activeTenants.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Warehouse className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي المساحة' : 'Total Space'}</p>
                  <p className="text-2xl font-bold">{totalStorage.toFixed(0)} m²</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <Calendar className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'العقود النشطة' : 'Active Contracts'}</p>
                  <p className="text-2xl font-bold">{activeTenants.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={language === 'ar' ? 'بحث عن مستأجر...' : 'Search tenants...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="ps-10"
            />
          </div>
        </div>

        {/* Tenants Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {language === 'ar' ? 'قائمة المستأجرين' : 'Tenants List'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : filteredTenants.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{language === 'ar' ? 'لا يوجد مستأجرين' : 'No tenants found'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'المستأجر' : 'Tenant'}</TableHead>
                      <TableHead>{language === 'ar' ? 'جهة الاتصال' : 'Contact'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المساحة' : 'Space'}</TableHead>
                      <TableHead>{language === 'ar' ? 'دورة الفوترة' : 'Billing'}</TableHead>
                      <TableHead>{language === 'ar' ? 'العقد' : 'Contract'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTenants.map((tenant: any) => (
                      <TableRow key={tenant.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{tenant.tenant_name}</p>
                              <p className="text-sm text-muted-foreground font-mono">{tenant.tenant_code}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{tenant.contact_person || '-'}</p>
                            <p className="text-muted-foreground">{tenant.email || '-'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {tenant.storage_allocation ? `${tenant.storage_allocation} m²` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getBillingLabel(tenant.billing_cycle)}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {tenant.contract_start && (
                              <p>{format(new Date(tenant.contract_start), 'yyyy-MM-dd')}</p>
                            )}
                            {tenant.contract_end && (
                              <p className="text-muted-foreground">→ {format(new Date(tenant.contract_end), 'yyyy-MM-dd')}</p>
                            )}
                            {!tenant.contract_start && !tenant.contract_end && '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={tenant.is_active ? 'default' : 'secondary'}>
                            {tenant.is_active ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(tenant)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(tenant.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}