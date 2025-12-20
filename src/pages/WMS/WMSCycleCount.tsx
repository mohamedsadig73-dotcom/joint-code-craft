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
import { ClipboardCheck, Plus, Search, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface CycleCount {
  id: string;
  count_number: string;
  product_id: string | null;
  location_id: string | null;
  system_quantity: number | null;
  counted_quantity: number | null;
  variance: number | null;
  status: string;
  notes: string | null;
  counted_at: string | null;
  approved_at: string | null;
  created_at: string;
  product?: {
    sku: string;
    name: string;
  };
  location?: {
    code: string;
    zone: string;
  };
  counter?: {
    username: string;
  };
}

interface Product {
  id: string;
  sku: string;
  name: string;
}

interface Location {
  id: string;
  code: string;
  zone: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500',
  counted: 'bg-blue-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
};

const statusLabels: Record<string, { ar: string; en: string }> = {
  pending: { ar: 'قيد الانتظار', en: 'Pending' },
  counted: { ar: 'تم العد', en: 'Counted' },
  approved: { ar: 'معتمد', en: 'Approved' },
  rejected: { ar: 'مرفوض', en: 'Rejected' },
};

export default function WMSCycleCount() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [counts, setCounts] = useState<CycleCount[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    product_id: '',
    location_id: '',
    notes: '',
  });

  useEffect(() => {
    loadCounts();
    loadProducts();
    loadLocations();
  }, []);

  const loadCounts = async () => {
    try {
      const { data, error } = await supabase
        .from('wms_cycle_counts')
        .select(`
          *,
          product:wms_products(sku, name),
          location:wms_locations(code, zone),
          counter:profiles!wms_cycle_counts_counted_by_fkey(username)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCounts(data as any || []);
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
    const { data } = await supabase
      .from('wms_products')
      .select('id, sku, name')
      .eq('is_active', true)
      .order('name');
    setProducts(data || []);
  };

  const loadLocations = async () => {
    const { data } = await supabase
      .from('wms_locations')
      .select('id, code, zone')
      .eq('is_active', true)
      .order('code');
    setLocations(data || []);
  };

  const handleSubmit = async () => {
    if (!formData.product_id || !formData.location_id) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى اختيار المنتج والموقع' : 'Please select product and location',
      });
      return;
    }

    setSaving(true);
    try {
      // Get system quantity from inventory
      const { data: inventoryData } = await supabase
        .from('wms_inventory')
        .select('quantity')
        .eq('product_id', formData.product_id)
        .eq('location_id', formData.location_id)
        .single();

      const { data: countNumber } = await supabase.rpc('generate_cycle_count_number');
      
      const countData = {
        count_number: countNumber,
        product_id: formData.product_id,
        location_id: formData.location_id,
        system_quantity: inventoryData?.quantity || 0,
        status: 'pending',
        notes: formData.notes || null,
      };

      const { error } = await supabase
        .from('wms_cycle_counts')
        .insert(countData);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' ? 'تم إنشاء مهمة الجرد' : 'Cycle count task created',
      });

      setIsDialogOpen(false);
      resetForm();
      loadCounts();
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

  const updateCount = async (countId: string, countedQuantity: number) => {
    try {
      const count = counts.find(c => c.id === countId);
      if (!count) return;

      const variance = countedQuantity - (count.system_quantity || 0);

      const { error } = await supabase
        .from('wms_cycle_counts')
        .update({
          counted_quantity: countedQuantity,
          variance: variance,
          status: 'counted',
          counted_at: new Date().toISOString(),
          counted_by: user?.id,
        })
        .eq('id', countId);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم التحديث' : 'Updated',
        description: language === 'ar' ? 'تم تسجيل العد' : 'Count recorded',
      });

      loadCounts();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
      });
    }
  };

  const approveCount = async (countId: string, approved: boolean) => {
    try {
      const { error } = await supabase
        .from('wms_cycle_counts')
        .update({
          status: approved ? 'approved' : 'rejected',
          approved_at: approved ? new Date().toISOString() : null,
          approved_by: user?.id,
        })
        .eq('id', countId);

      if (error) throw error;

      toast({
        title: approved 
          ? (language === 'ar' ? 'تم الاعتماد' : 'Approved')
          : (language === 'ar' ? 'تم الرفض' : 'Rejected'),
      });

      loadCounts();
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
      product_id: '',
      location_id: '',
      notes: '',
    });
  };

  const filteredCounts = counts.filter(count => {
    const matchesSearch = 
      count.count_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      count.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      count.location?.code?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || count.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const canManage = user?.role === 'admin' || user?.role === 'manager';

  // Stats
  const pendingCount = counts.filter(c => c.status === 'pending').length;
  const countedCount = counts.filter(c => c.status === 'counted').length;
  const varianceCount = counts.filter(c => c.variance !== null && c.variance !== 0).length;

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardCheck className="w-6 h-6" />
              {language === 'ar' ? 'الجرد الدوري' : 'Cycle Count'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'مهام جرد المخزون والتسويات' : 'Inventory counting tasks and adjustments'}
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
                  {language === 'ar' ? 'مهمة جرد جديدة' : 'New Count Task'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {language === 'ar' ? 'إنشاء مهمة جرد جديدة' : 'Create New Count Task'}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'المنتج' : 'Product'} *</Label>
                    <Select
                      value={formData.product_id}
                      onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'ar' ? 'اختر المنتج...' : 'Select product...'} />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} ({product.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'الموقع' : 'Location'} *</Label>
                    <Select
                      value={formData.location_id}
                      onValueChange={(value) => setFormData({ ...formData, location_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'ar' ? 'اختر الموقع...' : 'Select location...'} />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.code} - {location.zone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
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
                  <ClipboardCheck className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'تم العد' : 'Counted'}</p>
                  <p className="text-2xl font-bold text-blue-600">{countedCount}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-yellow-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'مع فروقات' : 'With Variance'}</p>
                  <p className="text-2xl font-bold text-yellow-600">{varianceCount}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
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
              placeholder={language === 'ar' ? 'بحث برقم الجرد أو المنتج...' : 'Search by count number or product...'}
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

        {/* Counts Table */}
        <Card className="glass-card">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : filteredCounts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{language === 'ar' ? 'لا توجد مهام جرد' : 'No cycle count tasks found'}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'رقم الجرد' : 'Count #'}</TableHead>
                    <TableHead>{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الموقع' : 'Location'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'كمية النظام' : 'System Qty'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'الكمية الفعلية' : 'Counted Qty'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'الفرق' : 'Variance'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead>{language === 'ar' ? 'إجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCounts.map((count) => (
                    <TableRow key={count.id}>
                      <TableCell className="font-mono font-medium">{count.count_number}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{count.product?.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{count.product?.sku}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-mono text-sm">{count.location?.code}</p>
                          <p className="text-xs text-muted-foreground">{count.location?.zone}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{count.system_quantity ?? '-'}</TableCell>
                      <TableCell className="text-center">
                        {count.status === 'pending' && canManage ? (
                          <Input
                            type="number"
                            className="w-20 text-center mx-auto"
                            placeholder="0"
                            onBlur={(e) => {
                              const value = parseFloat(e.target.value);
                              if (!isNaN(value)) {
                                updateCount(count.id, value);
                              }
                            }}
                          />
                        ) : (
                          count.counted_quantity ?? '-'
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {count.variance !== null ? (
                          <span className={count.variance !== 0 ? 'text-red-500 font-medium' : 'text-green-500'}>
                            {count.variance > 0 ? '+' : ''}{count.variance}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[count.status] || 'bg-gray-500'}>
                          {statusLabels[count.status]?.[language] || count.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {count.status === 'counted' && canManage && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => approveCount(count.id, true)}
                              className="text-green-600"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => approveCount(count.id, false)}
                              className="text-red-600"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
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
