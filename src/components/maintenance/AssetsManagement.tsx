import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { SuccessAnimation, useSuccessAnimation } from '@/components/ui/SuccessAnimation';
import { emptyStateMessages } from '@/constants/statusLabels';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { AssetMobileCard } from './MaintenanceMobileCard';

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

  // Asset types with translations
  const ASSET_TYPES = [
    { value: 'electrical', label: t('electrical') },
    { value: 'plumbing', label: t('plumbing') },
    { value: 'hvac', label: t('hvac') },
    { value: 'safety', label: t('safety') },
    { value: 'equipment', label: t('equipment') },
    { value: 'building', label: t('building') },
    { value: 'other', label: t('other') },
  ];

  const loadAssets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_assets')
        .select('*')
        .order('name');

      if (error) throw error;
      setAssets(data || []);
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAsset) {
        const { error } = await supabase
          .from('maintenance_assets')
          .update(formData)
          .eq('id', editingAsset.id);
        if (error) throw error;
        triggerSuccess('success', t('assetUpdatedSuccess'));
        toast({ title: t('assetUpdatedSuccess') });
      } else {
        const { error } = await supabase
          .from('maintenance_assets')
          .insert([formData]);
        if (error) throw error;
        triggerSuccess('success', t('assetAddedSuccess'));
        toast({ title: t('assetAddedSuccess') });
      }
      
      setDialogOpen(false);
      resetForm();
      loadAssets();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('confirmDeleteAsset'))) return;
    
    try {
      const { error } = await supabase
        .from('maintenance_assets')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      triggerSuccess('success', t('assetDeletedSuccess'));
      toast({ title: t('assetDeletedSuccess') });
      loadAssets();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
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
          <h2 className="text-2xl font-bold">{t('assetsTitle')}</h2>
          <p className="text-muted-foreground">{t('assetsDesc')}</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              {t('addNewAsset')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAsset ? t('editAssetTitle') : t('addAssetTitle')}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('assetNameLabel')} *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">{t('codeLabel')}</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">{t('typeLabel')} *</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      type: value as 'electrical' | 'plumbing' | 'hvac' | 'safety' | 'equipment' | 'building' | 'other'
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">{t('locationLabel')} *</Label>
                  <Input
                    id="location"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="site">{t('siteLabel')}</Label>
                  <Input
                    id="site"
                    value={formData.site}
                    onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchase_date">{t('purchaseDateLabel')}</Label>
                  <Input
                    id="purchase_date"
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="warranty_expiry">{t('warrantyExpiryLabel')}</Label>
                  <Input
                    id="warranty_expiry"
                    type="date"
                    value={formData.warranty_expiry}
                    onChange={(e) => setFormData({ ...formData, warranty_expiry: e.target.value })}
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="description">{t('descriptionLabel')}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="notes">{t('notesLabel')}</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                  />
                  <Label htmlFor="active">{t('activeAsset')}</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  {t('cancel')}
                </Button>
                <Button type="submit">
                  {editingAsset ? t('update') : t('add')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Mobile View */}
      {isMobile ? (
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : assets.length === 0 ? (
            <EmptyState
              variant="maintenance"
              title={emptyStateMessages.assets.title}
              description={emptyStateMessages.assets.description}
              actionLabel={t('addNewAsset')}
              onAction={() => setDialogOpen(true)}
            />
          ) : (
            assets.map((asset) => (
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
                <TableHead>{t('assetName')}</TableHead>
                <TableHead>{t('code')}</TableHead>
                <TableHead>{t('type')}</TableHead>
                <TableHead>{t('location')}</TableHead>
                <TableHead>{t('site')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead className="text-left">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeleton rows={5} columns={7} />
              ) : assets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState
                      variant="maintenance"
                      title={emptyStateMessages.assets.title}
                      description={emptyStateMessages.assets.description}
                      actionLabel={t('addNewAsset')}
                      onAction={() => setDialogOpen(true)}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                assets.map((asset) => (
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
                        {asset.active ? t('active') : t('inactive')}
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