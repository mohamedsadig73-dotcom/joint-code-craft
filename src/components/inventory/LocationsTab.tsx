import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWarehouses, useInvLocations } from '@/hooks/useInventory';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, MapPin, Loader2 } from 'lucide-react';

export function LocationsTab() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const { warehouses } = useWarehouses();
  const [selectedWh, setSelectedWh] = useState<string>('');
  const { locations, loading, refetch } = useInvLocations(selectedWh || null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: '', name_ar: '', name_en: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!selectedWh || !form.code.trim() || !form.name_ar.trim() || !form.name_en.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('inv_locations').insert({
      warehouse_id: selectedWh,
      code: form.code.trim(),
      name_ar: form.name_ar.trim(),
      name_en: form.name_en.trim(),
      notes: form.notes.trim() || null,
      created_by: user?.id ?? null,
    } as never);
    setSaving(false);
    if (error) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: t('success'), description: t('locationCreated') });
    setForm({ code: '', name_ar: '', name_en: '', notes: '' });
    setOpen(false);
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
        <div className="flex-1">
          <Label>{t('warehouse')}</Label>
          <Select value={selectedWh} onValueChange={setSelectedWh}>
            <SelectTrigger><SelectValue placeholder={t('selectWarehouse')} /></SelectTrigger>
            <SelectContent>
              {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.code} - {language === 'ar' ? w.name_ar : w.name_en}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setOpen(true)} disabled={!selectedWh} className="gap-1.5">
          <Plus className="w-4 h-4" /> {t('addLocation')}
        </Button>
      </div>

      {!selectedWh ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">{t('selectWarehouseToView')}</CardContent></Card>
      ) : loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : locations.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>{t('noLocations')}</p></CardContent></Card>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {locations.map(l => (
            <Card key={l.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold">{l.code}</span>
                  {!l.is_active && <Badge variant="secondary">{t('inactive')}</Badge>}
                </div>
                <div className="text-sm mt-1">{language === 'ar' ? l.name_ar : l.name_en}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('addLocation')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t('code')}</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="A-01" /></div>
            <div><Label>{t('nameAr')}</Label><Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} /></div>
            <div><Label>{t('nameEn')}</Label><Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} /></div>
            <div><Label>{t('notes')}</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin" />}{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}