import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useItemsMaster, type ItemMaster } from '@/hooks/useItemsMaster';
import { useToast } from '@/hooks/use-toast';
import { BOX_UNITS } from '@/utils/boxNumberValidation';
import { Loader2, Plus, AlertCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPartNo?: string;
  initialSupplier?: string;
  onCreated: (item: ItemMaster) => void;
}

export function QuickAddItemDialog({ open, onOpenChange, initialPartNo, initialSupplier, onCreated }: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { items, createItem, findByPartNo } = useItemsMaster();

  const [partNo, setPartNo] = useState('');
  const [description, setDescription] = useState('');
  const [defaultUnit, setDefaultUnit] = useState<ItemMaster['default_unit']>('PCS');
  const [defaultSupplier, setDefaultSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setPartNo((initialPartNo ?? '').trim());
      setDescription('');
      setDefaultUnit('PCS');
      setDefaultSupplier((initialSupplier ?? '').trim());
      setNotes('');
      setSubmitting(false);
    }
  }, [open, initialPartNo, initialSupplier]);

  const duplicate = partNo.trim() ? findByPartNo(partNo) : undefined;

  const handleUseExisting = () => {
    if (duplicate) {
      onCreated(duplicate);
      onOpenChange(false);
    }
  };

  const handleSave = async () => {
    if (!partNo.trim()) {
      toast({ title: t('error'), description: `${t('partNo')} ${t('required')}`, variant: 'destructive' });
      return;
    }
    if (!description.trim()) {
      toast({ title: t('error'), description: `${t('description')} ${t('required')}`, variant: 'destructive' });
      return;
    }
    if (duplicate) {
      // Surface duplicate via inline panel — do not call API
      return;
    }
    setSubmitting(true);
    const created = await createItem({
      part_no: partNo.trim(),
      description: description.trim(),
      default_unit: defaultUnit,
      default_supplier: defaultSupplier.trim() || null,
      image_path: null,
      notes: notes.trim() || null,
      is_active: true,
    });
    setSubmitting(false);
    if (created) {
      onCreated(created);
      onOpenChange(false);
    }
  };

  const suppliers = Array.from(
    new Set(items.map((i) => i.default_supplier).filter((s): s is string => !!s && s.trim().length > 0))
  ).sort();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            {t('createItem')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="qa-part" className="text-xs">
              {t('partNo')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="qa-part"
              value={partNo}
              onChange={(e) => setPartNo(e.target.value)}
              placeholder={t('partNo')}
              className="font-mono"
              autoFocus
            />
          </div>

          {duplicate && (
            <div className="rounded-md border border-warning/40 bg-warning/10 p-2.5 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1.5">
                <p className="text-xs text-foreground">{t('itemAlreadyExists')}</p>
                <p className="text-xs text-muted-foreground truncate">
                  <span className="font-mono">{duplicate.part_no}</span> — {duplicate.description}
                </p>
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={handleUseExisting}>
                  {t('useExisting')}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="qa-desc" className="text-xs">
              {t('description')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="qa-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t('defaultUnit')}</Label>
              <Select value={defaultUnit} onValueChange={(v) => setDefaultUnit(v as ItemMaster['default_unit'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BOX_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qa-sup" className="text-xs">{t('defaultSupplier')}</Label>
              <Input
                id="qa-sup"
                list="qa-sup-list"
                value={defaultSupplier}
                onChange={(e) => setDefaultSupplier(e.target.value)}
                placeholder={t('optional')}
              />
              <datalist id="qa-sup-list">
                {suppliers.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qa-notes" className="text-xs">{t('notes')}</Label>
            <Textarea
              id="qa-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('optional')}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={submitting || !!duplicate}>
            {submitting && <Loader2 className="w-4 h-4 me-1.5 animate-spin" />}
            {t('saveAndUse')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}