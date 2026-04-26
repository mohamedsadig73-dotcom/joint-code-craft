import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/contexts/LanguageContext';
import { BOX_UNITS } from '@/utils/boxNumberValidation';
import type { ItemMaster, ItemMasterInput } from '@/hooks/useItemsMaster';
import { Loader2, AlertCircle } from 'lucide-react';
import { ItemImageUpload } from './ItemImageUpload';

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
  const [values, setValues] = useState<ItemMasterInput>(DEFAULT);
  const [submitting, setSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(false);

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
      });
    } else {
      setValues({ ...DEFAULT, part_no: initialPartNo?.trim() ?? '' });
    }
    setDuplicateWarning(false);
  }, [open, initial, initialPartNo]);

  useEffect(() => {
    if (!values.part_no || initial) {
      setDuplicateWarning(false);
      return;
    }
    const norm = values.part_no.trim().toLowerCase();
    setDuplicateWarning(existingPartNos.some((p) => p.trim().toLowerCase() === norm));
  }, [values.part_no, existingPartNos, initial]);

  const setField = <K extends keyof ItemMasterInput>(key: K, value: ItemMasterInput[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
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
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? t('editItem') : t('addItem')}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div className="md:col-span-2 space-y-1.5">
            <Label>{t('partNo')} *</Label>
            <Input
              value={values.part_no}
              onChange={(e) => setField('part_no', e.target.value)}
              disabled={!!initial}
            />
            {duplicateWarning && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {t('itemAlreadyExists')}
              </p>
            )}
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <Label>{t('description')} *</Label>
            <Input value={values.description} onChange={(e) => setField('description', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>{t('defaultSupplier')}</Label>
            <Input
              value={values.default_supplier ?? ''}
              onChange={(e) => setField('default_supplier', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t('defaultUnit')} *</Label>
            <Select
              value={values.default_unit}
              onValueChange={(v) => setField('default_unit', v as ItemMasterInput['default_unit'])}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BOX_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <Label>{t('notes')}</Label>
            <Textarea rows={2} value={values.notes ?? ''} onChange={(e) => setField('notes', e.target.value)} />
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <Label>{t('itemImage')}</Label>
            <ItemImageUpload
              partNo={values.part_no}
              imagePath={values.image_path}
              onChange={(p) => setField('image_path', p)}
              cleanupOnReplace={!!initial}
            />
          </div>

          {initial && (
            <div className="md:col-span-2 flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="text-sm">{t('itemActive')}</Label>
                <p className="text-xs text-muted-foreground">{t('itemActiveDesc')}</p>
              </div>
              <Switch
                checked={values.is_active}
                onCheckedChange={(c) => setField('is_active', c)}
              />
            </div>
          )}
        </div>

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