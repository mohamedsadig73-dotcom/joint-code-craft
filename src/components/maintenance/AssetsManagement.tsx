import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { wmsToast } from '@/lib/wmsToast';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { SuccessAnimation, useSuccessAnimation } from '@/components/ui/SuccessAnimation';
import { assetTypeLabels, emptyStateMessages } from '@/constants/statusLabels';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { AssetMobileCard } from './MaintenanceMobileCard';
import { StandardModal } from '@/components/ui/StandardModal';
import { FormSection, FormField } from '@/components/ui/StandardForm';
import { UnifiedFilterBar } from '@/components/ui/UnifiedFilterBar';

const ASSET_TYPES = Object.entries(assetTypeLabels).map(([value, label]) => ({ value, label }));

interface Asset {
  id: string;
  name: string;
  code: string | null;
  type: string;
  location: string;
  site: string | null;
  description: string | null;
  purchase_date: string | null;
  warranty_expiry: string | null;
  notes: string | null;
  active: boolean;
}

export function AssetsManagement() {
  const isMobile = useIsMobile();
  const { t } = useLanguage();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const { trigger: triggerSuccess, SuccessAnimation: SuccessAnimationComponent } = useSuccessAnimation();
  const [formData, setFormData] = useState<{
    name: string;
    code: string;
    type: 'electrical' | 'plumbing' | 'hvac' | 'safety' | 'equipment' | 'building' | 'other';
    location: string;
    site: string;
    description: string;
    purchase_date: string;
    warranty_expiry: string;
    notes: string;
    active: boolean;
  }>({
    name: '',
    code: '',
    type: 'equipment',
    location: '',
    site: '',
    description: '',
    purchase_date: '',
    warranty_expiry: '',
    notes: '',
    active: true,
  });

  const loadAssets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_assets')
        .select('*')
        .order('name');

      if (error) throw error;
      setAssets(data || []);
    } catch (error: any) {
      wmsToast.error('خطأ', { description: error.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filtered = useMemo(() => assets.filter(a => {
    const m1 = !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.code || '').toLowerCase().includes(search.toLowerCase()) ||
      a.location.toLowerCase().includes(search.toLowerCase());
    const m2 = typeFilter === 'all' || a.type === typeFilter;
    const m3 = statusFilter === 'all' || (statusFilter === 'active' ? a.active : !a.active);
    return m1 && m2 && m3;
  }), [assets, search, typeFilter, statusFilter]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.location) {
      wmsToast.error('خطأ', { description: 'يرجى تعبئة الحقول المطلوبة' });
      return;
    }
    setSubmitting(true);
    try {
      if (editingAsset) {
        const { error } = await supabase
          .from('maintenance_assets')
          .update(formData)
          .eq('id', editingAsset.id);
        if (error) throw error;
        triggerSuccess('success', 'تم تحديث الأصل بنجاح');
        wmsToast.success('تم تحديث الأصل بنجاح');
      } else {
        const { error } = await supabase
          .from('maintenance_assets')
          .insert([formData]);
        if (error) throw error;
        triggerSuccess('success', 'تم إضافة الأصل بنجاح');
        wmsToast.success('تم إضافة الأصل بنجاح');
      }
      
      setDialogOpen(false);
      resetForm();
      loadAssets();
    } catch (error: any) {
      wmsToast.error('خطأ', { description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الأصل؟')) return;
    
    try {
      const { error } = await supabase
        .from('maintenance_assets')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      triggerSuccess('success', 'تم حذف الأصل بنجاح');
      wmsToast.success('تم حذف الأصل بنجاح');
      loadAssets();
    } catch (error: any) {
      wmsToast.error('خطأ', { description: error.message });
    }
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name,
      code: asset.code || '',
      type: asset.type as 'electrical' | 'plumbing' | 'hvac' | 'safety' | 'equipment' | 'building' | 'other',
      location: asset.location,
      site: asset.site || '',
      description: asset.description || '',
      purchase_date: asset.purchase_date || '',
      warranty_expiry: asset.warranty_expiry || '',
      notes: asset.notes || '',
      active: asset.active ?? true,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingAsset(null);
    setFormData({
      name: '',
      code: '',
      type: 'equipment',
      location: '',
      site: '',
      description: '',
      purchase_date: '',
      warranty_expiry: '',
      notes: '',
      active: true,
    });
  };

  const getTypeLabel = (type: string) => {
    return ASSET_TYPES.find(t => t.value === type)?.label || type;
  };

  return (
    <div className="space-y-6">
      <SuccessAnimationComponent />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">إدارة الأصول والمعدات</h2>
          <p className="text-muted-foreground">تسجيل ومتابعة الأصول والمعدات</p>
        </div>
        <Button className="gap-2" onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="w-4 h-4" />
          إضافة أصل جديد
        </Button>
      </div>

      <UnifiedFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="بحث بالاسم / الرمز / الموقع"
        filters={
          <>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="النوع" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأنواع</SelectItem>
                {ASSET_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="inactive">غير نشط</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
        activeChips={[
          typeFilter !== 'all' && { key: 'type', label: `النوع: ${getTypeLabel(typeFilter)}`, onRemove: () => setTypeFilter('all') },
          statusFilter !== 'all' && { key: 'status', label: `الحالة: ${statusFilter === 'active' ? 'نشط' : 'غير نشط'}`, onRemove: () => setStatusFilter('all') },
        ].filter(Boolean) as any}
        onReset={() => { setSearch(''); setTypeFilter('all'); setStatusFilter('all'); }}
      />

      <StandardModal
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}
        title={editingAsset ? 'تعديل الأصل' : 'إضافة أصل جديد'}
        size="lg"
        formId="asset-form"
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel={editingAsset ? 'تحديث' : 'إضافة'}
      >
        <FormSection columns={2}>
          <FormField label="اسم الأصل" required>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          </FormField>
          <FormField label="الرمز/الكود">
            <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
          </FormField>
          <FormField label="النوع" required>
            <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ASSET_TYPES.map(type => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="الموقع" required>
            <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
          </FormField>
          <FormField label="المنشأة">
            <Input value={formData.site} onChange={(e) => setFormData({ ...formData, site: e.target.value })} />
          </FormField>
          <FormField label="تاريخ الشراء">
            <Input type="date" value={formData.purchase_date} onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })} />
          </FormField>
          <FormField label="تاريخ انتهاء الضمان" fullWidth>
            <Input type="date" value={formData.warranty_expiry} onChange={(e) => setFormData({ ...formData, warranty_expiry: e.target.value })} />
          </FormField>
          <FormField label="الوصف" fullWidth>
            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
          </FormField>
          <FormField label="ملاحظات" fullWidth>
            <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} />
          </FormField>
          <FormField label="الحالة" fullWidth>
            <div className="flex items-center gap-2">
              <Switch checked={formData.active} onCheckedChange={(checked) => setFormData({ ...formData, active: checked })} />
              <span className="text-sm">{formData.active ? 'أصل نشط' : 'غير نشط'}</span>
            </div>
          </FormField>
        </FormSection>
      </StandardModal>

      {/* Mobile View */}
      {isMobile ? (
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              variant="maintenance"
              title={emptyStateMessages.assets.title}
              description={emptyStateMessages.assets.description}
              actionLabel={t('addAsset') || 'إضافة أصل جديد'}
              onAction={() => setDialogOpen(true)}
            />
          ) : (
            filtered.map((asset) => (
              <AssetMobileCard
                key={asset.id}
                asset={asset}
                typeLabel={getTypeLabel(asset.type)}
                onEdit={() => handleEdit(asset)}
                onDelete={() => handleDelete(asset.id)}
              />
            ))
          )}
        </div>
      ) : (
        /* Desktop Table View */
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('assetName') || 'الاسم'}</TableHead>
                <TableHead>{t('code') || 'الرمز'}</TableHead>
                <TableHead>{t('type')}</TableHead>
                <TableHead>{t('location') || 'الموقع'}</TableHead>
                <TableHead>{t('site') || 'المنشأة'}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead className="text-left">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeleton rows={5} columns={7} />
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState
                      variant="maintenance"
                      title={emptyStateMessages.assets.title}
                      description={emptyStateMessages.assets.description}
                      actionLabel={t('addAsset') || 'إضافة أصل جديد'}
                      onAction={() => setDialogOpen(true)}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell>{asset.code || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getTypeLabel(asset.type)}</Badge>
                    </TableCell>
                    <TableCell>{asset.location}</TableCell>
                    <TableCell>{asset.site || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={asset.active ? 'default' : 'secondary'}>
                        {asset.active ? t('active') || 'نشط' : t('inactive') || 'غير نشط'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(asset)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(asset.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
