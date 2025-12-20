import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit, 
  Settings,
  Package,
  Warehouse,
  TrendingUp,
  Users,
  BarChart3,
  MapPin,
  FileText
} from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  code: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  allocatedSpace: number;
  usedSpace: number;
  productCount: number;
  orderCount: number;
  isActive: boolean;
  billingPlan: string;
  createdAt: string;
}

const WMS3PLTenants: React.FC = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isRTL = language === 'ar';

  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    allocatedSpace: 0,
    billingPlan: 'standard'
  });

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    setLoading(true);
    
    // Simulate tenants from suppliers with additional data
    const { data: suppliers } = await supabase
      .from('wms_suppliers')
      .select('*')
      .eq('is_active', true);

    const { data: inventory } = await supabase
      .from('wms_inventory')
      .select('product_id, quantity');

    const { data: orders } = await supabase
      .from('wms_inbound_orders')
      .select('id, supplier_id');

    if (suppliers) {
      const tenantData: Tenant[] = suppliers.map((supplier, index) => {
        const supplierOrders = orders?.filter(o => o.supplier_id === supplier.id).length || 0;
        
        return {
          id: supplier.id,
          name: supplier.name,
          code: supplier.code || `TN-${(index + 1).toString().padStart(3, '0')}`,
          contactPerson: supplier.contact_person,
          email: supplier.email,
          phone: supplier.phone,
          address: supplier.address,
          allocatedSpace: Math.round(100 + Math.random() * 400),
          usedSpace: Math.round(50 + Math.random() * 200),
          productCount: Math.round(10 + Math.random() * 50),
          orderCount: supplierOrders,
          isActive: supplier.is_active ?? true,
          billingPlan: ['basic', 'standard', 'premium'][Math.floor(Math.random() * 3)],
          createdAt: supplier.created_at || new Date().toISOString()
        };
      });

      setTenants(tenantData);
    }
    
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'الاسم والرمز مطلوبان' : 'Name and code are required',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    
    const newTenant: Tenant = {
      id: crypto.randomUUID(),
      name: formData.name,
      code: formData.code,
      contactPerson: formData.contactPerson || null,
      email: formData.email || null,
      phone: formData.phone || null,
      address: formData.address || null,
      allocatedSpace: formData.allocatedSpace,
      usedSpace: 0,
      productCount: 0,
      orderCount: 0,
      isActive: true,
      billingPlan: formData.billingPlan,
      createdAt: new Date().toISOString()
    };

    setTenants(prev => [newTenant, ...prev]);
    
    toast({
      title: language === 'ar' ? 'تم الإنشاء' : 'Created',
      description: language === 'ar' ? 'تم إنشاء المستأجر بنجاح' : 'Tenant created successfully'
    });

    resetForm();
    setDialogOpen(false);
    setSaving(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      allocatedSpace: 0,
      billingPlan: 'standard'
    });
  };

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSpace = tenants.reduce((sum, t) => sum + t.allocatedSpace, 0);
  const usedSpace = tenants.reduce((sum, t) => sum + t.usedSpace, 0);

  const breadcrumbItems = [
    { label: language === 'ar' ? 'نظام WMS' : 'WMS', href: '/wms' },
    { label: language === 'ar' ? 'إدارة المستأجرين (3PL)' : '3PL Tenants' }
  ];

  const getBillingBadge = (plan: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      premium: 'default',
      standard: 'secondary',
      basic: 'outline'
    };
    const labels: Record<string, { ar: string; en: string }> = {
      premium: { ar: 'مميز', en: 'Premium' },
      standard: { ar: 'قياسي', en: 'Standard' },
      basic: { ar: 'أساسي', en: 'Basic' }
    };
    return (
      <Badge variant={variants[plan] || 'outline'}>
        {labels[plan]?.[language === 'ar' ? 'ar' : 'en'] || plan}
      </Badge>
    );
  };

  return (
    <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Navigation />
      <main className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbItems} className="mb-4" />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              {language === 'ar' ? 'إدارة المستأجرين (3PL)' : '3PL Tenant Management'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'إدارة العملاء والمساحات المخصصة في المستودع' : 'Manage clients and allocated warehouse space'}
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 me-2" />
                {language === 'ar' ? 'إضافة مستأجر' : 'Add Tenant'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {language === 'ar' ? 'إضافة مستأجر جديد' : 'Add New Tenant'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{language === 'ar' ? 'الاسم *' : 'Name *'}</Label>
                    <Input
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{language === 'ar' ? 'الرمز *' : 'Code *'}</Label>
                    <Input
                      value={formData.code}
                      onChange={e => setFormData({ ...formData, code: e.target.value })}
                      placeholder="TN-001"
                    />
                  </div>
                </div>
                <div>
                  <Label>{language === 'ar' ? 'جهة الاتصال' : 'Contact Person'}</Label>
                  <Input
                    value={formData.contactPerson}
                    onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{language === 'ar' ? 'الهاتف' : 'Phone'}</Label>
                    <Input
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>{language === 'ar' ? 'المساحة المخصصة (م²)' : 'Allocated Space (m²)'}</Label>
                  <Input
                    type="number"
                    value={formData.allocatedSpace}
                    onChange={e => setFormData({ ...formData, allocatedSpace: Number(e.target.value) })}
                  />
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving 
                    ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                    : (language === 'ar' ? 'حفظ' : 'Save')}
                </Button>
              </div>
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
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'إجمالي المستأجرين' : 'Total Tenants'}
                  </p>
                  <p className="text-2xl font-bold">{tenants.length}</p>
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
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'المساحة الكلية' : 'Total Space'}
                  </p>
                  <p className="text-2xl font-bold">{totalSpace} m²</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'نسبة الاستخدام' : 'Utilization'}
                  </p>
                  <p className="text-2xl font-bold">
                    {totalSpace > 0 ? Math.round((usedSpace / totalSpace) * 100) : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <Package className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'إجمالي المنتجات' : 'Total Products'}
                  </p>
                  <p className="text-2xl font-bold">{tenants.reduce((sum, t) => sum + t.productCount, 0)}</p>
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
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'المستأجر' : 'Tenant'}</TableHead>
                    <TableHead>{language === 'ar' ? 'جهة الاتصال' : 'Contact'}</TableHead>
                    <TableHead>{language === 'ar' ? 'المساحة' : 'Space'}</TableHead>
                    <TableHead>{language === 'ar' ? 'المنتجات' : 'Products'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الطلبات' : 'Orders'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الخطة' : 'Plan'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          {language === 'ar' ? 'لا يوجد مستأجرين' : 'No tenants found'}
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTenants.map(tenant => (
                      <TableRow key={tenant.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{tenant.name}</p>
                              <p className="text-sm text-muted-foreground">{tenant.code}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{tenant.contactPerson || '-'}</p>
                            <p className="text-muted-foreground">{tenant.email || '-'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{tenant.usedSpace} / {tenant.allocatedSpace} m²</span>
                            </div>
                            <Progress 
                              value={(tenant.usedSpace / tenant.allocatedSpace) * 100} 
                              className="h-2"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{tenant.productCount}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{tenant.orderCount}</Badge>
                        </TableCell>
                        <TableCell>
                          {getBillingBadge(tenant.billingPlan)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default WMS3PLTenants;
