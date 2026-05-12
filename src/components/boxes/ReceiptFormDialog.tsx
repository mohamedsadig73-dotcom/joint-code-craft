import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useLanguage } from '@/contexts/LanguageContext';
import { receiptSchema, normalizeBoxNo, BOX_UNITS, BOX_DESTINATIONS, BOX_STATUSES } from '@/utils/boxNumberValidation';
import type { BoxReceipt, BoxReceiptInput } from '@/hooks/useBoxReceipts';
import { ReceiptImageUpload } from './ReceiptImageUpload';
import { Loader2, Package, PackageOpen, Info } from 'lucide-react';
import { ItemPickerCombobox } from './items/ItemPickerCombobox';
import { ItemFormDialog } from './items/ItemFormDialog';
import { useItemsMaster } from '@/hooks/useItemsMaster';
import { useBoxReceipts } from '@/hooks/useBoxReceipts';
import { useDuplicateRules } from '@/hooks/useDuplicateRules';
import { findReceiptConflict } from '@/utils/boxDuplicateAnalysis';
import { AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: BoxReceipt | null;
  onSubmit: (values: BoxReceiptInput) => Promise<unknown>;
  existingSuppliers: string[];
  existingBoxes: string[];
}

const DEFAULT: BoxReceiptInput = {
  supplier: '',
  part_no: '',
  description: '',
  qty: 1,
  unit: 'PCS',
  destination: 'unspecified',
  place: 'مخزنة بالمخزن (B)',
  packing_type: 'boxed',
  box_no: 'B-01',
  receipt_date: new Date().toISOString().slice(0, 10),
  status: 'received',
  notes: '',
  image_path: null,
  invoice_number: null,
  item_id: null,
};

export function ReceiptFormDialog({ open, onOpenChange, initial, onSubmit, existingSuppliers, existingBoxes }: Props) {
  const { t } = useLanguage();
  const { items, createItem } = useItemsMaster();
  const { receipts: allReceipts } = useBoxReceipts();
  const { rules: dupRules } = useDuplicateRules();
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [pendingNewPartNo, setPendingNewPartNo] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [values, setValues] = useState<BoxReceiptInput>(DEFAULT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [overrideConflict, setOverrideConflict] = useState(false);

  useEffect(() => {
    if (open) {
      setOverrideConflict(false);
      if (initial) {
        setValues({
          supplier: initial.supplier,
          part_no: initial.part_no,
          description: initial.description,
          qty: initial.qty,
          unit: initial.unit,
          destination: initial.destination,
          place: initial.place,
          packing_type: initial.packing_type ?? 'boxed',
          box_no: initial.box_no,
          receipt_date: initial.receipt_date,
          status: initial.status,
          notes: initial.notes,
          image_path: initial.image_path,
          invoice_number: initial.invoice_number ?? null,
          item_id: initial.item_id ?? null,
        });
        const found = items.find(
          (i) => i.part_no.trim().toLowerCase() === initial.part_no.trim().toLowerCase()
        );
        setSelectedItemId(initial.item_id ?? found?.id ?? null);
      } else {
        setValues(DEFAULT);
        setSelectedItemId(null);
      }
      setErrors({});
    }
  }, [open, initial, items]);

  const setField = <K extends keyof BoxReceiptInput>(key: K, value: BoxReceiptInput[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
  };

  const handleSelectItem = (item: typeof items[number]) => {
    setSelectedItemId(item.id);
    setValues((v) => ({
      ...v,
      part_no: item.part_no,
      description: item.description || v.description,
      supplier: item.default_supplier || v.supplier,
      unit: item.default_unit,
      image_path: item.image_path ?? v.image_path,
      item_id: item.id,
    }));
    setErrors((e) => ({ ...e, part_no: '', description: '', supplier: '' }));
  };

  const handleCreateItemRequest = (partNo: string) => {
    setPendingNewPartNo(partNo);
    setItemDialogOpen(true);
  };

  const handleItemCreated = async (input: Parameters<typeof createItem>[0]) => {
    const created = await createItem(input);
    if (created) handleSelectItem(created);
    return created;
  };

  const handleSubmit = async () => {
    const normalized = {
      ...values,
      box_no: values.packing_type === 'loose' ? null : normalizeBoxNo(values.box_no ?? ''),
    };
    const parsed = receiptSchema.safeParse(normalized);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        errs[i.path[0] as string] = t(i.message) || i.message;
      });
      setErrors(errs);
      return;
    }
    // Duplicate guard
    const conflict = findReceiptConflict(parsed.data as BoxReceiptInput, allReceipts, dupRules, initial?.id ?? null);
    if (conflict && dupRules.block_on_save && !overrideConflict) {
      setErrors((e) => ({ ...e, _conflict: t('duplicateBlocked') }));
      return;
    }
    setSubmitting(true);
    const result = await onSubmit(parsed.data as BoxReceiptInput);
    setSubmitting(false);
    if (result) onOpenChange(false);
  };

  const liveConflict = (() => {
    if (!values.part_no) return null;
    const candidate = {
      ...values,
      box_no: values.packing_type === 'loose' ? null : normalizeBoxNo(values.box_no ?? ''),
    };
    return findReceiptConflict(candidate, allReceipts, dupRules, initial?.id ?? null);
  })();

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? t('editReceipt') : t('addReceipt')}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div className="md:col-span-2 space-y-1.5">
            <Label>{t('packingType')} *</Label>
            <RadioGroup
              value={values.packing_type}
              onValueChange={(v) => setField('packing_type', v as 'boxed' | 'loose')}
              className="grid grid-cols-1 sm:grid-cols-2 gap-2"
            >
              <label
                htmlFor="pt-boxed"
                className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
                  values.packing_type === 'boxed'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/40'
                }`}
              >
                <RadioGroupItem value="boxed" id="pt-boxed" className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 font-medium text-sm">
                    <Package className="w-4 h-4 text-blue-600" />
                    {t('boxed')}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('packingTypeBoxedDesc')}</p>
                </div>
              </label>
              <label
                htmlFor="pt-loose"
                className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
                  values.packing_type === 'loose'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/40'
                }`}
              >
                <RadioGroupItem value="loose" id="pt-loose" className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 font-medium text-sm">
                    <PackageOpen className="w-4 h-4 text-purple-600" />
                    {t('loose')}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('packingTypeLooseDesc')}</p>
                </div>
              </label>
            </RadioGroup>
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <Label>{t('partNo')} *</Label>
            <ItemPickerCombobox
              items={items.filter((i) => i.is_active)}
              value={selectedItemId}
              onSelect={handleSelectItem}
              onCreateNew={handleCreateItemRequest}
            />
            {errors.part_no && <p className="text-xs text-destructive">{errors.part_no}</p>}
            {!selectedItemId && (
              <p className="text-xs text-muted-foreground">{t('pickItemFromMaster')}</p>
            )}
            {initial && selectedItemId && initial.part_no !== values.part_no && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {t('partNoChangedNotice')}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>{t('supplier')} *</Label>
            <Input
              list="boxes-suppliers"
              value={values.supplier}
              onChange={(e) => setField('supplier', e.target.value)}
            />
            <datalist id="boxes-suppliers">
              {existingSuppliers.map((s) => <option key={s} value={s} />)}
            </datalist>
            {errors.supplier && <p className="text-xs text-destructive">{errors.supplier}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>{t('invoiceNumber')}</Label>
            <Input
              value={values.invoice_number ?? ''}
              onChange={(e) => setField('invoice_number', e.target.value || null)}
              placeholder={t('invoiceNumberOptional')}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t('description')} *</Label>
            <Input value={values.description} onChange={(e) => setField('description', e.target.value)} />
            {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>{t('qty')} *</Label>
            <Input
              type="number"
              min={1}
              value={values.qty}
              onChange={(e) => setField('qty', Number(e.target.value))}
            />
            {errors.qty && <p className="text-xs text-destructive">{errors.qty}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>{t('unit')} *</Label>
            <Select value={values.unit} onValueChange={(v) => setField('unit', v as BoxReceiptInput['unit'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BOX_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t('destination')} *</Label>
            <Select value={values.destination} onValueChange={(v) => setField('destination', v as BoxReceiptInput['destination'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BOX_DESTINATIONS.map((d) => <SelectItem key={d} value={d}>{t(`dest_${d}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t('place')}</Label>
            <Input value={values.place ?? ''} onChange={(e) => setField('place', e.target.value)} />
          </div>

          {values.packing_type === 'boxed' ? (
            <div className="space-y-1.5">
              <Label>{t('boxNo')} *</Label>
              <Input
                list="boxes-existing"
                value={values.box_no ?? ''}
                onChange={(e) => setField('box_no', e.target.value)}
                onBlur={(e) => setField('box_no', normalizeBoxNo(e.target.value))}
              />
              <datalist id="boxes-existing">
                {existingBoxes.map((b) => <option key={b} value={b} />)}
              </datalist>
              {errors.box_no && <p className="text-xs text-destructive">{errors.box_no}</p>}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="opacity-50">{t('boxNo')}</Label>
              <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground h-10">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t('packingTypeLooseDesc')}</span>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>{t('date')} *</Label>
            <Input type="date" value={values.receipt_date} onChange={(e) => setField('receipt_date', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>{t('status')}</Label>
            <Select value={values.status} onValueChange={(v) => setField('status', v as BoxReceiptInput['status'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BOX_STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`boxStatus_${s}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <Label>{t('notes')}</Label>
            <Textarea rows={2} value={values.notes ?? ''} onChange={(e) => setField('notes', e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <Label className="mb-1.5 block">{t('productImage')}</Label>
            <ReceiptImageUpload
              partNo={values.part_no}
              imagePath={values.image_path}
              onChange={(p) => setField('image_path', p)}
            />
          </div>
        </div>

        {liveConflict && (
          <div className={`mt-4 p-3 rounded-md border text-xs flex items-start gap-2 ${
            dupRules.block_on_save && !overrideConflict
              ? 'border-destructive/50 bg-destructive/10 text-destructive'
              : 'border-warning/50 bg-warning/10'
          }`}>
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{t('duplicateConflictDetected')}</div>
              <div className="opacity-90 mt-0.5">
                {t('duplicateConflictMatches')
                  .replace('{serial}', `#${liveConflict.serial_no}`)
                  .replace('{box}', liveConflict.box_no ?? '—')
                  .replace('{supplier}', liveConflict.supplier)
                  .replace('{invoice}', liveConflict.invoice_number ?? '—')}
              </div>
              <div className="opacity-75 mt-1">
                {t('duplicateRulesActive')}: {dupRules.fields.join(' + ')}
              </div>
              {dupRules.block_on_save && (
                <label className="mt-2 inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overrideConflict}
                    onChange={(e) => setOverrideConflict(e.target.checked)}
                  />
                  <span>{t('overrideAndSave')}</span>
                </label>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t('cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || (!!liveConflict && dupRules.block_on_save && !overrideConflict)}
          >
            {submitting && <Loader2 className="w-4 h-4 me-1.5 animate-spin" />}
            {t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      <ItemFormDialog
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        initialPartNo={pendingNewPartNo}
        onSubmit={handleItemCreated}
        existingPartNos={items.map((i) => i.part_no)}
      />
    </>
  );
}