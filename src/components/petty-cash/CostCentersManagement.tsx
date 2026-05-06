import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CostCenter {
  id: string;
  name: string;
  name_ar: string;
  description: string | null;
  active: boolean;
}

export function CostCentersManagement() {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<CostCenter | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    description: ''
  });

  useEffect(() => {
    loadCostCenters();
  }, []);

  const loadCostCenters = async () => {
    try {
      const { data, error } = await supabase
        .from('cost_centers')
        .select('*')
        .order('name');

      if (error) throw error;
      setCostCenters(data || []);
    } catch (error) {
      console.error('Error loading cost centers:', error);
      toast.error(t('errorLoadingData'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (center?: CostCenter) => {
    if (center) {
      setEditingCenter(center);
      setFormData({
        name: center.name,
        name_ar: center.name_ar,
        description: center.description || ''
      });
    } else {
      setEditingCenter(null);
      setFormData({ name: '', name_ar: '', description: '' });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCenter) {
        const { error } = await supabase
          .from('cost_centers')
          .update({
            name: formData.name,
            name_ar: formData.name_ar,
            description: formData.description || null
          })
          .eq('id', editingCenter.id);

        if (error) throw error;
        toast.success(t('costCenterUpdated'));
      } else {
        const { error } = await supabase
          .from('cost_centers')
          .insert({
            name: formData.name,
            name_ar: formData.name_ar,
            description: formData.description || null
          });

        if (error) throw error;
        toast.success(t('costCenterAdded'));
      }

      setDialogOpen(false);
      loadCostCenters();
    } catch (error) {
      console.error('Error saving cost center:', error);
      toast.error(t('errorOccurred'));
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('cost_centers')
        .update({ active })
        .eq('id', id);

      if (error) throw error;
      loadCostCenters();
    } catch (error) {
      console.error('Error updating cost center:', error);
      toast.error(t('errorOccurred'));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from('cost_centers')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;
      toast.success(t('costCenterDeleted'));
      loadCostCenters();
    } catch (error) {
      console.error('Error deleting cost center:', error);
      toast.error(t('errorOccurred'));
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h2 className="text-xl font-semibold">{t('costCentersManagement')}</h2>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          {t('addCostCenter')}
        </Button>
      </div>

      <Card className="glass-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('nameEn')}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('nameAr')}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('description')}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('status')}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costCenters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {t('noCostCentersFound')}
                  </TableCell>
                </TableRow>
              ) : (
                costCenters.map((center) => (
                  <TableRow key={center.id}>
                    <TableCell>{center.name}</TableCell>
                    <TableCell>{center.name_ar}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{center.description || '-'}</TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Switch
                          checked={center.active}
                          onCheckedChange={(checked) => handleToggleActive(center.id, checked)}
                        />
                        <Badge className={center.active ? 'bg-green-500/20 text-green-700' : 'bg-red-500/20 text-red-700'}>
                          {center.active ? t('active') : t('inactive')}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`flex gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleOpenDialog(center)}
                          className="h-8 w-8"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteId(center.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
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
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>
              {editingCenter ? t('editCostCenter') : t('addCostCenter')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('nameEn')} *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Administrative Office"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t('nameAr')} *</Label>
              <Input
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                placeholder="مثال: المكتب الإداري"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t('description')}</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('descriptionPlaceholder')}
              />
            </div>
            <div className={`flex gap-3 pt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Button type="submit" className="flex-1">
                {editingCenter ? t('update') : t('add')}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t('cancel')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteCostCenterConfirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
