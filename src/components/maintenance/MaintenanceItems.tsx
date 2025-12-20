import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Plus, Edit, Trash2, Calendar, DollarSign, Eye } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { SuccessAnimation, useSuccessAnimation } from '@/components/ui/SuccessAnimation';
import { frequencyLabels, emptyStateMessages } from '@/constants/statusLabels';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { MaintenanceMobileCard } from './MaintenanceMobileCard';
import { formatNumber, formatCurrency, formatDateArabic } from '@/utils/numberFormat';

interface MaintenanceItem {
  id: string;
  name: string;
  description: string | null;
  frequency: string;
  start_date: string;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  estimated_cost: number | null;
  reminder_days: number;
  notes: string | null;
  active: boolean;
  asset_id: string | null;
  vendor_id: string | null;
}

interface Asset {
  id: string;
  name: string;
}

interface Vendor {
  id: string;
  name: string;
}

export function MaintenanceItems() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { language, t } = useLanguage();
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MaintenanceItem | null>(null);
  const { trigger: triggerSuccess, SuccessAnimation: SuccessAnimationComponent } = useSuccessAnimation();
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    frequency: 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'ad_hoc';
    start_date: string;
    estimated_cost: string;
    reminder_days: string;
    notes: string;
    active: boolean;
    asset_id: string;
    vendor_id: string;
  }>({
    name: '',
    description: '',
    frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    estimated_cost: '',
    reminder_days: '7',
    notes: '',
    active: true,
    asset_id: '',
    vendor_id: '',
  });

  // Frequency options with translations
  const FREQUENCIES = [
    { value: 'monthly', label: t('monthly') },
    { value: 'quarterly', label: t('quarterly') },
    { value: 'semiannual', label: t('semiannual') },
    { value: 'annual', label: t('annual') },
    { value: 'ad_hoc', label: t('adHoc') },
  ];

  const loadData = useCallback(async () => {
    try {
      const [itemsRes, assetsRes, vendorsRes] = await Promise.all([
        supabase.from('maintenance_items').select('*').order('name'),
        supabase.from('maintenance_assets').select('id, name').eq('active', true),
        supabase.from('maintenance_vendors').select('id, name').eq('active', true),
      ]);

      if (itemsRes.error) throw itemsRes.error;
      if (assetsRes.error) throw assetsRes.error;
      if (vendorsRes.error) throw vendorsRes.error;

      setItems(itemsRes.data || []);
      setAssets(assetsRes.data || []);
      setVendors(vendorsRes.data || []);
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
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
        reminder_days: parseInt(formData.reminder_days),
        asset_id: formData.asset_id || null,
        vendor_id: formData.vendor_id || null,
      };

      if (editingItem) {
        const { error } = await supabase
          .from('maintenance_items')
          .update(submitData)
          .eq('id', editingItem.id);
        if (error) throw error;
        triggerSuccess('success', t('itemUpdatedSuccess'));
        toast({ title: t('itemUpdatedSuccess') });
      } else {
        const { data: newItem, error } = await supabase
          .from('maintenance_items')
          .insert([submitData])
          .select()
          .single();
        
        if (error) throw error;
        
        // Generate annual schedule for new item
        const currentYear = new Date().getFullYear();
        const { error: scheduleError } = await supabase
          .rpc('generate_maintenance_schedule', {
            _item_id: newItem.id,
            _year: currentYear,
          });
        
        if (scheduleError) throw scheduleError;
        triggerSuccess('success', t('scheduleGeneratedSuccess'));
        toast({ title: t('scheduleGeneratedSuccess') });
      }
      
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('confirmDeleteItem'))) return;
    
    try {
      const { error } = await supabase
        .from('maintenance_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      triggerSuccess('success', t('itemDeletedSuccess'));
      toast({ title: t('itemDeletedSuccess') });
      loadData();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (item: MaintenanceItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      frequency: item.frequency as 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'ad_hoc',
      start_date: item.start_date,
      estimated_cost: item.estimated_cost?.toString() || '',
      reminder_days: item.reminder_days.toString(),
      notes: item.notes || '',
      active: item.active ?? true,
      asset_id: item.asset_id || '',
      vendor_id: item.vendor_id || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      frequency: 'monthly',
      start_date: new Date().toISOString().split('T')[0],
      estimated_cost: '',
      reminder_days: '7',
      notes: '',
      active: true,
      asset_id: '',
      vendor_id: '',
    });
  };

  const getFrequencyLabel = (freq: string) => {
    return FREQUENCIES.find(f => f.value === freq)?.label || freq;
  };

  return (
    <div className="space-y-6">
      <SuccessAnimationComponent />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t('maintenanceItemsTitle')}</h2>
          <p className="text-muted-foreground">{t('maintenanceItemsDesc')}</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              {t('addNewItem')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? t('editMaintenanceItem') : t('addMaintenanceItemTitle')}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="name">{t('itemNameLabel')} *</Label>
                  <Input
                    id="name"
                    required
                    placeholder={t('itemNamePlaceholder')}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="asset_id">{t('linkedAsset')}</Label>
                  <Select value={formData.asset_id || 'none'} onValueChange={(value) => setFormData({ ...formData, asset_id: value === 'none' ? '' : value })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectAssetPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('noAssetOption')}</SelectItem>
                      {assets.map(asset => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vendor_id">{t('executingParty')}</Label>
                  <Select value={formData.vendor_id || 'none'} onValueChange={(value) => setFormData({ ...formData, vendor_id: value === 'none' ? '' : value })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectVendorPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('noVendorOption')}</SelectItem>
                      {vendors.map(vendor => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frequency">{t('repetition')} *</Label>
                  <Select 
                    value={formData.frequency} 
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      frequency: value as 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'ad_hoc'
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map(freq => (
                        <SelectItem key={freq.value} value={freq.value}>
                          {freq.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start_date">{t('startDateLabel')} *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimated_cost">{t('estimatedCostLabel')}</Label>
                  <Input
                    id="estimated_cost"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.estimated_cost}
                    onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reminder_days">{t('reminderBeforeDays')}</Label>
                  <Input
                    id="reminder_days"
                    type="number"
                    min="1"
                    value={formData.reminder_days}
                    onChange={(e) => setFormData({ ...formData, reminder_days: e.target.value })}
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
                  <Label htmlFor="active">{t('activeItem')}</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  {t('cancel')}
                </Button>
                <Button type="submit">
                  {editingItem ? t('update') : t('add')}
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
          ) : items.length === 0 ? (
            <EmptyState
              variant="maintenance"
              title={emptyStateMessages.maintenance.title}
              description={emptyStateMessages.maintenance.description}
              actionLabel={t('addNewItem')}
              onAction={() => setDialogOpen(true)}
            />
          ) : (
            items.map((item) => (
              <MaintenanceMobileCard
                key={item.id}
                item={item}
                frequencyLabel={getFrequencyLabel(item.frequency)}
                onEdit={() => handleEdit(item)}
                onDelete={() => handleDelete(item.id)}
                onView={() => navigate(`/maintenance/item/${item.id}`)}
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
                <TableHead>{t('itemName')}</TableHead>
                <TableHead>{t('frequency')}</TableHead>
                <TableHead>{t('lastMaintenance')}</TableHead>
                <TableHead>{t('nextMaintenance')}</TableHead>
                <TableHead>{t('estimatedCost')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead className="text-left">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeleton rows={5} columns={7} />
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState
                      variant="maintenance"
                      title={emptyStateMessages.maintenance.title}
                      description={emptyStateMessages.maintenance.description}
                      actionLabel={t('addNewItem')}
                      onAction={() => setDialogOpen(true)}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getFrequencyLabel(item.frequency)}</Badge>
                    </TableCell>
                    <TableCell>
                      {item.last_maintenance_date ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {formatDateArabic(item.last_maintenance_date)}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {item.next_maintenance_date ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {formatDateArabic(item.next_maintenance_date)}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {item.estimated_cost ? (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          {formatCurrency(item.estimated_cost)}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.active ? 'default' : 'secondary'}>
                        {item.active ? t('active') : t('inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/maintenance/item/${item.id}`)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(item.id)}
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