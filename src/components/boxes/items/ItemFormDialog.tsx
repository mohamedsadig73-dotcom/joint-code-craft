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
import { Loader2, AlertCircle, Info, Image as ImageIcon, Truck, Warehouse, Camera, Sparkles } from 'lucide-react';
import { ItemImageUpload } from './ItemImageUpload';
import { ItemSuppliersTab } from './ItemSuppliersTab';
import { ItemWarehousesTab } from './ItemWarehousesTab';
import { useCategories, useSuppliers, useUnits } from '@/hooks/useDataSetup';
import { Combobox } from '@/components/ui/Combobox';
import { CategoryTreeSelect } from '@/components/data-setup/CategoryTreeSelect';
import { validateItemWithRules } from '@/utils/itemSchema';
import { findSimilar } from '@/utils/stringSimilarity';
import { useAppSettings } from '@/hooks/useAppSettings';
import { BarcodeScannerDialog } from '@/components/scan/BarcodeScannerDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Check, X, RefreshCw } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: ItemMaster | null;
  initialPartNo?: string;
  onSubmit: (values: ItemMasterInput) => Promise<ItemMaster | null>;
  existingPartNos: string[];
  existingItems?: Array<{ id: string; description: string; name_ar?: string | null }>;
}

const DEFAULT: ItemMasterInput = {
  part_no: '',
  description: '',
  default_supplier: '',
  default_unit: 'PCS',
  image_path: null,
  notes: '',
  is_active: true,
  supplier_id: null,
};

export function ItemFormDialog({ open, onOpenChange, initial, initialPartNo, onSubmit, existingPartNos, existingItems = [] }: Props) {
  const { t, language } = useLanguage();
  const { rows: categories } = useCategories();
  const { rows: suppliers } = useSuppliers();
  const { rows: units } = useUnits();
  const { categoryRequired, defaultCategoryId } = useAppSettings();
  const [values, setValues] = useState<ItemMasterInput & {
    name_ar?: string | null; name_en?: string | null; brand?: string | null;
    model_no?: string | null; plate_no?: string | null; barcode?: string | null;
    min_qty?: number | null; max_qty?: number | null; has_expiry?: boolean | null;
    condition?: string | null; item_type?: string | null; category_id?: string | null;
    supplier_id?: string | null;
    is_dormant?: boolean | null;
    classification_id?: string | null;
  }>(DEFAULT);
  const [submitting, setSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tab, setTab] = useState('details');
  const [scanOpen, setScanOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<{
    description_en?: string;
    description_ar?: string;
    category_code?: string | null;
    category_id?: string | null;
    category_label?: string | null;
  } | null>(null);

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
        supplier_id: initial.supplier_id ?? null,
        is_dormant: (initial as any).is_dormant ?? false,
        classification_id: (initial as any).classification_id ?? null,
        min_qty: initial.min_qty ?? 0,
        max_qty: initial.max_qty ?? null,
        has_expiry: initial.has_expiry ?? false,
        condition: initial.condition ?? 'good',
        item_type: initial.item_type ?? 'item',
      } as never);
    } else {
      setValues({
        ...DEFAULT,
        part_no: initialPartNo?.trim() ?? '',
        category_id: defaultCategoryId ?? null,
      } as never);
    }
    setDuplicateWarning(false);
    setErrors({});
    setTab('details');
    setAiSuggestion(null);
    setAiError(null);
  }, [open, initial, initialPartNo]);

  useEffect(() => {
    if (!values.part_no) { setDuplicateWarning(false); return; }
    const norm = values.part_no.trim().toLowerCase();
    setDuplicateWarning(existingPartNos.some((p) => p.trim().toLowerCase() === norm));
  }, [values.part_no, existingPartNos]);

  const setField = (key: string, value: unknown) => {
    setValues((v) => ({ ...v, [key]: value as never }));
    setErrors((e) => {
      if (!e[key]) return e;
      const n = { ...e };
      delete n[key];
      return n;
    });
  };

  const handleSubmit = async () => {
    const v = validateItemWithRules(values, { categoryRequired, defaultCategoryId });
    if (!v.ok) {
      setErrors(v.errors);
      setTab('details');
      return;
    }
    if (duplicateWarning) return;
    setSubmitting(true);
    const result = await onSubmit(v.patched);
    setSubmitting(false);
    if (result) onOpenChange(false);
  };

  const similarNames = (() => {
    const candidate = (values.name_ar || values.description || '').trim();
    if (!candidate || candidate.length < 3) return [];
    return findSimilar(
      candidate,
      existingItems.filter((i) => i.id !== initial?.id),
      (i) => i.name_ar || i.description || ''
    );
  })();

  const unitOptions = (units.length > 0
    ? units.map((u) => ({ value: u.code, label: u.name_ar || u.name_en || u.code, hint: u.code }))
    : BOX_UNITS.map((u) => ({ value: u, label: u })));
  // Bind supplier picker to supplier_id (UUID), not the free-text name.
  const supplierOptions = suppliers
    .filter((s) => s.is_active)
    .map((s) => ({
      value: s.id,
      label: s.name_ar || s.name_en,
      hint: s.code,
    }));

  const handleAiSuggest = async () => {
    if (aiBusy) return;
    setAiError(null);
    if (!values.part_no && !values.name_ar && !values.brand) {
      setAiError(t('aiSuggestNeedsInput') || 'أدخل رمز القطعة أو الاسم أو الماركة أولاً');
      return;
    }
    setAiBusy(true);
    // Clear any previous suggestion so the user always sees the latest result
    setAiSuggestion(null);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-item-details', {
        body: {
          part_no: values.part_no,
          name_ar: values.name_ar,
          name_en: values.name_en,
          brand: values.brand,
          model_no: values.model_no,
          notes: values.notes,
          categories: categories
            .filter((c) => c.is_active)
            .map((c) => ({ code: c.code, name_ar: c.name_ar, name_en: c.name_en })),
        },
      });
      if (error) {
        // Edge Function errors expose useful context (rate limits, payment, etc.)
        const ctxStatus = (error as any)?.context?.status as number | undefined;
        if (ctxStatus === 429) {
          throw new Error(language === 'ar' ? 'تم تجاوز حد الاستخدام، حاول لاحقاً.' : 'Rate limit exceeded, please try again later.');
        }
        if (ctxStatus === 402) {
          throw new Error(language === 'ar' ? 'يلزم شحن رصيد الذكاء الاصطناعي للاستمرار.' : 'AI credits required to continue.');
        }
        throw new Error(error.message || (language === 'ar' ? 'تعذر الاتصال بخدمة الاقتراحات.' : 'Failed to reach suggestions service.'));
      }
      const suggestion = data as { description_en?: string; description_ar?: string; category_code?: string | null };
      const matched = suggestion.category_code
        ? categories.find((c) => c.code === suggestion.category_code)
        : null;
      const hasAny =
        suggestion.description_en || suggestion.description_ar || matched;
      if (!hasAny) {
        setAiError(t('aiNoSuggestions') || 'لم يقترح المساعد أي قيم. حاول إدخال مزيد من التفاصيل.');
      } else {
        setAiSuggestion({
          description_en: suggestion.description_en,
          description_ar: suggestion.description_ar,
          category_code: suggestion.category_code,
          category_id: matched?.id ?? null,
          category_label: matched ? (matched.name_ar || matched.name_en || matched.code) : null,
        });
      }
    } catch (e: any) {
      setAiError(e?.message || (language === 'ar' ? 'فشل اقتراح الذكاء الاصطناعي' : 'AI suggest failed'));
    } finally {
      setAiBusy(false);
    }
  };

  const applyAiSuggestion = () => {
    // Hard guard: never apply while a request is in flight or after a failure
    if (!aiSuggestion || aiBusy) return;
    setValues((v) => {
      const next: any = { ...v };
      if (aiSuggestion.description_en) next.name_en = aiSuggestion.description_en;
      if (aiSuggestion.description_ar) next.description = aiSuggestion.description_ar;
      if (aiSuggestion.category_id) next.category_id = aiSuggestion.category_id;
      return next;
    });
    toast.success(t('aiSuggestApplied') || 'تم تطبيق اقتراحات الذكاء الاصطناعي');
    setAiSuggestion(null);
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
                {errors.part_no && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />{errors.part_no}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>{t('nameAr')}</Label>
                <Input value={values.name_ar ?? ''} onChange={(e) => setField('name_ar', e.target.value)} />
                {errors.name_ar && <p className="text-xs text-destructive">{errors.name_ar}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>{t('nameEn')}</Label>
                <Input value={values.name_en ?? ''} onChange={(e) => setField('name_en', e.target.value)} dir="ltr" />
              </div>
              {similarNames.length > 0 && (
                <div className="md:col-span-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-2.5 text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-amber-800 dark:text-amber-300 mb-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {t('similarNamesFound')}
                  </div>
                  <ul className="space-y-0.5 text-amber-900 dark:text-amber-200">
                    {similarNames.map((m) => (
                      <li key={m.row.id}>
                        • {m.row.name_ar || m.row.description}{' '}
                        <span className="opacity-70">({Math.round(m.score * 100)}%)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(aiBusy || aiError || aiSuggestion) && (
                <div className="md:col-span-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-medium text-primary">
                    <Sparkles className="w-3.5 h-3.5" />
                    {t('aiSuggest') || 'اقتراح بالذكاء الاصطناعي'}
                  </div>
                  {aiBusy && (
                    <div
                      role="status"
                      aria-live="polite"
                      className="flex items-center gap-2 text-primary font-medium"
                    >
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('aiThinking') || 'جاري توليد الاقتراحات...'}</span>
                    </div>
                  )}
                  {aiError && !aiBusy && (
                    <div className="space-y-2">
                      <div className="flex items-start gap-1.5 text-destructive">
                        <AlertCircle className="w-3.5 h-3.5 mt-0.5" />
                        <span>{aiError}</span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleAiSuggest}
                        disabled={aiBusy}
                        className="h-7 px-2"
                      >
                        <RefreshCw className="w-3.5 h-3.5 me-1" />
                        {t('retry') || (language === 'ar' ? 'إعادة المحاولة' : 'Retry')}
                      </Button>
                    </div>
                  )}
                  {aiSuggestion && !aiBusy && (
                    <div className="space-y-1.5">
                      {aiSuggestion.description_ar && (
                        <div><span className="opacity-70 me-1">{t('description')}:</span>{aiSuggestion.description_ar}</div>
                      )}
                      {aiSuggestion.description_en && (
                        <div dir="ltr"><span className="opacity-70 me-1">EN:</span>{aiSuggestion.description_en}</div>
                      )}
                      {aiSuggestion.category_label && (
                        <div><span className="opacity-70 me-1">{t('category')}:</span>{aiSuggestion.category_label}</div>
                      )}
                      <div className="flex gap-2 pt-1">
                        <Button type="button" size="sm" variant="default" onClick={applyAiSuggestion} disabled={aiBusy} className="h-7 px-2">
                          <Check className="w-3.5 h-3.5 me-1" />
                          {t('apply') || 'تطبيق'}
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setAiSuggestion(null)} disabled={aiBusy} className="h-7 px-2">
                          <X className="w-3.5 h-3.5 me-1" />
                          {t('discard') || 'تجاهل'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="md:col-span-2 space-y-1.5">
                <Label>{t('description')} *</Label>
                <Input value={values.description} onChange={(e) => setField('description', e.target.value)} />
                {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
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
                <div className="flex gap-2">
                  <Input value={values.barcode ?? ''} onChange={(e) => setField('barcode', e.target.value)} dir="ltr" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setScanOpen(true)}
                    title={t('scanBarcode') || 'مسح الباركود بالكاميرا'}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t('defaultUnit')} *</Label>
                <Combobox
                  options={unitOptions}
                  value={values.default_unit}
                  onChange={(v) => setField('default_unit', v ?? 'PCS')}
                  allowClear={false}
                  placeholder={t('defaultUnit')}
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  {t('category')} {categoryRequired && <span className="text-destructive">*</span>}
                </Label>
                <CategoryTreeSelect
                  categories={categories}
                  value={values.category_id ?? null}
                  onChange={(id) => setField('category_id', id)}
                />
                {errors.category_id && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />{errors.category_id}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>{t('defaultSupplier')}</Label>
                <Combobox
                  options={supplierOptions}
                  value={values.supplier_id || null}
                  onChange={(id) => {
                    setField('supplier_id', id);
                    const sup = suppliers.find((s) => s.id === id);
                    setField('default_supplier', sup ? (sup.name_ar || sup.name_en) : '');
                  }}
                  placeholder={t('selectSupplier')}
                />
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

        <DialogFooter className="mt-4 flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleAiSuggest}
            disabled={aiBusy || submitting}
            className="me-auto"
          >
            {aiBusy ? <Loader2 className="w-4 h-4 me-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 me-1.5" />}
            {t('aiSuggest') || 'اقتراح بالذكاء الاصطناعي'}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || duplicateWarning}>
            {submitting && <Loader2 className="w-4 h-4 me-1.5 animate-spin" />}
            {t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
      <BarcodeScannerDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        onResult={(text) => setField('barcode', text)}
      />
    </Dialog>
  );
}