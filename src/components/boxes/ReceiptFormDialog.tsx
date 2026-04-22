import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { receiptSchema, normalizeBoxNo, BOX_UNITS, BOX_DESTINATIONS, BOX_STATUSES } from '@/utils/boxNumberValidation';
import type { BoxReceipt, BoxReceiptInput } from '@/hooks/useBoxReceipts';
import { ReceiptImageUpload } from './ReceiptImageUpload';
import { Loader2 } from 'lucide-react';

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
  box_no: 'B-01',
  receipt_date: new Date().toISOString().slice(0, 10),
  status: 'received',
  notes: '',
  image_path: null,
};

export function ReceiptFormDialog({ open, onOpenChange, initial, onSubmit, existingSuppliers, existingBoxes }: Props) {
  const { t } = useLanguage();
  const [values, setValues] = useState<BoxReceiptInput>(DEFAULT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (initial) {
        setValues({
          supplier: initial.supplier,
          part_no: initial.part_no,
          description: initial.description,
          qty: initial.qty,
          unit: initial.unit,
          destination: initial.destination,
          place: initial.place,
          box_no: initial.box_no,
          receipt_date: initial.receipt_date,
          status: initial.status,
          notes: initial.notes,
          image_path: initial.image_path,
        });
      } else {
        setValues(DEFAULT);
      }
      setErrors({});
    }
  }, [open, initial]);

  const setField = <K extends keyof BoxReceiptInput>(key: K, value: BoxReceiptInput[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
  };

  const handleSubmit = async () => {
    const normalized = { ...values, box_no: normalizeBoxNo(values.box_no) };
    const parsed = receiptSchema.safeParse(normalized);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        errs[i.path[0] as string] = t(i.message) || i.message;
      });
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    const result = await onSubmit(parsed.data as BoxReceiptInput);
    setSubmitting(false);
    if (result) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? t('editReceipt') : t('addReceipt')}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
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
            <Label>{t('partNo')} *</Label>
            <Input value={values.part_no} onChange={(e) => setField('part_no', e.target.value)} />
            {errors.part_no && <p className="text-xs text-destructive">{errors.part_no}</p>}
          </div>

          <div className="md:col-span-2 space-y-1.5">
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

          <div className="space-y-1.5">
            <Label>{t('boxNo')} *</Label>
            <Input
              list="boxes-existing"
              value={values.box_no}
              onChange={(e) => setField('box_no', e.target.value)}
              onBlur={(e) => setField('box_no', normalizeBoxNo(e.target.value))}
            />
            <datalist id="boxes-existing">
              {existingBoxes.map((b) => <option key={b} value={b} />)}
            </datalist>
            {errors.box_no && <p className="text-xs text-destructive">{errors.box_no}</p>}
          </div>

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

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 me-1.5 animate-spin" />}
            {t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}