import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { BOX_UNITS } from '@/utils/boxNumberValidation';
import type { ItemMaster, ItemMasterInput } from '@/hooks/useItemsMaster';
import { Loader2, AlertCircle, Info, Image as ImageIcon, Truck, Warehouse } from 'lucide-react';
import { ItemImageUpload } from './ItemImageUpload';
import { ItemSuppliersTab } from './ItemSuppliersTab';
import { ItemWarehousesTab } from './ItemWarehousesTab';
import { useCategories, useSuppliers, useUnits } from '@/hooks/useDataSetup';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: ItemMaster | null;
  initialPartNo?: string;
  onSubmit: (values: ItemMasterInput) => Promise<ItemMaster | null>;
  existingPartNos: string[];
}

const DEFAULT: ItemMasterInput = {
  part_no: '',
  description: '',
  default_supplier: '',
  default_unit: 'PCS',
  image_path: null,
  notes: '',
  is_active: true,
};

export function ItemFormDialog({ open, onOpenChange, initial, initialPartNo, onSubmit, existingPartNos }: Props) {
  const { t } = useLanguage();
  const { rows: categories } = useCategories();
  const { rows: suppliers } = useSuppliers();
  const { rows: units } = useUnits();
  const [values, setValues] = useState<ItemMasterInput & {
    name_ar?: string | null; name_en?: string | null; brand?: string | null;
    model_no?: string | null; plate_no?: string | null; barcode?: string | null;
    min_qty?: number | null; max_qty?: number | null; has_expiry?: boolean | null;
    condition?: string | null; item_type?: string | null; category_id?: string | null;
  }>(DEFAULT);
  const [submitting, setSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [tab, setTab] = useState('details');

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setValues({
        part_no: initial.part_no,
        description: initial.description,
        default_supplier: initial.default_supplier ?? '',
        default_unit: initial.default_unit,
        image_path: initial.image_path,
        notes: initial.notes ?? '',
        is_active: initial.is_active,
        name_ar: initial.name_ar ?? '',
        name_en: initial.name_en ?? '',
        brand: initial.brand ?? '',
        model_no: initial.model_no ?? '',
        plate_no: initial.plate_no ?? '',
        barcode: initial.barcode ?? '',
        category_id: initial.category_id ?? null,
        min_qty: initial.min_qty ?? 0,
        max_qty: initial.max_qty ?? null,
        has_expiry: initial.has_expiry ?? false,
        condition: initial.condition ?? 'good',
        item_type: initial.item_type ?? 'item',
      } as never);
    } else {
      setValues({ ...DEFAULT, part_no: initialPartNo?.trim() ?? '' } as never);
    }
    setDuplicateWarning(false);
    setTab('details');
  }, [open, initial, initialPartNo]);

  useEffect(() => {
    if (!values.part_no) { setDuplicateWarning(false); return; }
    const norm = values.part_no.trim().toLowerCase();
    setDuplicateWarning(existingPartNos.some((p) => p.trim().toLowerCase() === norm));
  }, [values.part_no, existingPartNos]);

  const setField = (key: string, value: unknown) => {
    setValues((v) => ({ ...v, [key]: value as never }));
  };

  const handleSubmit = async () => {
    if (!values.part_no.trim() || !values.description.trim()) return;
    if (duplicateWarning) return;
    setSubmitting(true);
    const result = await onSubmit(values);
    setSubmitting(false);
    if (result) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? t('editItem') : t('addItem')}</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details" className="gap-1.5"><Info className="w-4 h-4" />{t('itemDetails')}</TabsTrigger>
            <TabsTrigger value="image" className="gap-1.5"><ImageIcon className="w-4 h-4" />{t('itemImage')}</TabsTrigger>
            <TabsTrigger value="suppliers" disabled={!initial} className="gap-1.5"><Truck className="w-4 h-4" />{t('suppliers')}</TabsTrigger>
            <TabsTrigger value="warehouses" disabled={!initial} className="gap-1.5"><Warehouse className="w-4 h-4" />{t('warehouses')}</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <Label>{t('partNo')} *</Label>
                <Input value={values.part_no} onChange={(e) => setField('part_no', e.target.value)} />
                {duplicateWarning && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />{t('itemAlreadyExists')}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>{t('nameAr')}</Label>
                <Input value={values.name_ar ?? ''} onChange={(e) => setField('name_ar', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('nameEn')}</Label>
                <Input value={values.name_en ?? ''} onChange={(e) => setField('name_en', e.target.value)} dir="ltr" />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label>{t('description')} *</Label>
                <Input value={values.description} onChange={(e) => setField('description', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('brand')}</Label>
                <Input value={values.brand ?? ''} onChange={(e) => setField('brand', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('modelNo')}</Label>
                <Input value={values.model_no ?? ''} onChange={(e) => setField('model_no', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('plateNo')}</Label>
                <Input value={values.plate_no ?? ''} onChange={(e) => setField('plate_no', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('barcode')}</Label>
                <Input value={values.barcode ?? ''} onChange={(e) => setField('barcode', e.target.value)} dir="ltr" />
              </div>
              <div className="space-y-1.5">
                <Label>{t('defaultUnit')} *</Label>
                <Select value={values.default_unit} onValueChange={(v) => setField('default_unit', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(units.length > 0 ? units.map((u) => u.code) : BOX_UNITS).map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('category')}</Label>
                <Select
                  value={values.category_id ?? '__none__'}
                  onValueChange={(v) => setField('category_id', v === '__none__' ? null : v)}
                >
                  <SelectTrigger><SelectValue placeholder={t('selectCategory')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {categories.filter((c) => c.is_active).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.code} - {c.name_ar || c.name_en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('defaultSupplier')}</Label>
                <Select
                  value={values.default_supplier || '__none__'}
                  onValueChange={(v) => setField('default_supplier', v === '__none__' ? '' : v)}
                >
                  <SelectTrigger><SelectValue placeholder={t('selectSupplier')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {suppliers.filter((s) => s.is_active).map((s) => (
                      <SelectItem key={s.id} value={s.name_ar || s.name_en}>
                        {s.code} - {s.name_ar || s.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('itemType')}</Label>
                <Select value={values.item_type ?? 'item'} onValueChange={(v) => setField('item_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="item">{t('item')}</SelectItem>
                    <SelectItem value="service">{t('service')}</SelectItem>
                    <SelectItem value="asset">{t('asset')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('condition')}</Label>
                <Select value={values.condition ?? 'good'} onValueChange={(v) => setField('condition', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">{t('conditionGood')}</SelectItem>
                    <SelectItem value="damaged">{t('conditionDamaged')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('minQty')}</Label>
                <Input type="number" min={0} value={values.min_qty ?? 0} onChange={(e) => setField('min_qty', Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('maxQty')}</Label>
                <Input type="number" min={0} value={values.max_qty ?? ''} onChange={(e) => setField('max_qty', e.target.value === '' ? null : Number(e.target.value))} />
              </div>
              <div className="md:col-span-2 flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label className="text-sm">{t('hasExpiry')}</Label>
                  <p className="text-xs text-muted-foreground">{t('hasExpiryDesc')}</p>
                </div>
                <Switch checked={!!values.has_expiry} onCheckedChange={(c) => setField('has_expiry', c)} />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label>{t('notes')}</Label>
                <Textarea rows={2} value={values.notes ?? ''} onChange={(e) => setField('notes', e.target.value)} />
              </div>
              {initial && (
                <div className="md:col-span-2 flex items-center justify-between rounded-md border p-3">
                  <div>
                    <Label className="text-sm">{t('itemActive')}</Label>
                    <p className="text-xs text-muted-foreground">{t('itemActiveDesc')}</p>
                  </div>
                  <Switch checked={values.is_active} onCheckedChange={(c) => setField('is_active', c)} />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="image" className="mt-4">
            <ItemImageUpload
              partNo={values.part_no}
              imagePath={values.image_path}
              onChange={(p) => setField('image_path', p)}
              cleanupOnReplace={!!initial}
            />
          </TabsContent>

          <TabsContent value="suppliers" className="mt-4">
            {initial ? <ItemSuppliersTab itemId={initial.id} /> : <p className="text-sm text-muted-foreground">{t('saveItemFirst')}</p>}
          </TabsContent>

          <TabsContent value="warehouses" className="mt-4">
            {initial ? <ItemWarehousesTab itemId={initial.id} /> : <p className="text-sm text-muted-foreground">{t('saveItemFirst')}</p>}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || duplicateWarning}>
            {submitting && <Loader2 className="w-4 h-4 me-1.5 animate-spin" />}
            {t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}