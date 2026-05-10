import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useItemsMaster, type ItemMaster, type ItemMasterInput } from '@/hooks/useItemsMaster';
import { useToast } from '@/hooks/use-toast';
import { BOX_UNITS } from '@/utils/boxNumberValidation';
import { Loader2, Plus, AlertCircle, Pencil } from 'lucide-react';
import { ItemFormDialog } from './ItemFormDialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPartNo?: string;
  initialSupplier?: string;
  /** Suggested unit (from item picker / line). Falls back to PCS. */
  suggestedUnit?: ItemMaster['default_unit'];
  /**
   * Optional check invoked with the trimmed part number; should return true if
   * a row with the same part_no already exists for the current supplier +
   * destination + date context. When true, we surface a warning and block
   * "use existing" to encourage the user to fix the line instead.
   */
  isContextDuplicate?: (partNo: string) => boolean;
  onCreated: (item: ItemMaster) => void;
}

export function QuickAddItemDialog({
  open,
  onOpenChange,
  initialPartNo,
  initialSupplier,
  suggestedUnit,
  isContextDuplicate,
  onCreated,
}: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { items, createItem, updateItem, findByPartNo } = useItemsMaster();

  const [partNo, setPartNo] = useState('');
  const [description, setDescription] = useState('');
  const [defaultUnit, setDefaultUnit] = useState<ItemMaster['default_unit']>('PCS');
  const [defaultSupplier, setDefaultSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingExisting, setEditingExisting] = useState<ItemMaster | null>(null);
  const [touched, setTouched] = useState<{ partNo: boolean; description: boolean }>({
    partNo: false,
    description: false,
  });

  useEffect(() => {
    if (open) {
      setPartNo((initialPartNo ?? '').trim());
      setDescription('');
      setDefaultUnit(suggestedUnit ?? 'PCS');
      setDefaultSupplier((initialSupplier ?? '').trim());
      setNotes('');
      setSubmitting(false);
      setTouched({ partNo: false, description: false });
    }
  }, [open, initialPartNo, initialSupplier, suggestedUnit]);

  const duplicate = useMemo(
    () => (partNo.trim() ? findByPartNo(partNo) : undefined),
    [partNo, findByPartNo]
  );

  const contextDuplicate = useMemo(
    () => !!(partNo.trim() && isContextDuplicate?.(partNo.trim())),
    [partNo, isContextDuplicate],
  );

  const partNoError = touched.partNo && !partNo.trim();
  const descriptionError = touched.description && !description.trim() && !duplicate;

  const handleUseExisting = () => {
    if (duplicate) {
      onCreated(duplicate);
      toast({ title: t('success'), description: t('quickAddSavedAndUsed') });
      onOpenChange(false);
    }
  };

  const handleEditExisting = () => {
    if (duplicate) setEditingExisting(duplicate);
  };

  const handleUpdateAndUse = async (values: ItemMasterInput): Promise<ItemMaster | null> => {
    if (!editingExisting) return null;
    const updated = await updateItem(editingExisting.id, values);
    if (updated) {
      onCreated(updated);
      toast({ title: t('success'), description: t('quickAddSavedAndUsed') });
      setEditingExisting(null);
      onOpenChange(false);
    }
    return updated;
  };

  const handleSave = async () => {
    setTouched({ partNo: true, description: true });
    if (!partNo.trim()) {
      toast({ title: t('error'), description: t('partNoRequired'), variant: 'destructive' });
      return;
    }
    if (contextDuplicate) {
      toast({ title: t('error'), description: t('duplicateInContextDesc'), variant: 'destructive' });
      return;
    }
    if (duplicate) {
      // Surface duplicate via inline panel — do not call API
      return;
    }
    if (!description.trim()) {
      toast({ title: t('error'), description: t('descriptionRequired'), variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    // Re-check by part_no right before insert to mitigate race conditions
    // (two rapid submissions of the same part_no).
    const racingDup = findByPartNo(partNo);
    if (racingDup) {
      setSubmitting(false);
      toast({ title: t('error'), description: t('itemAlreadyExists'), variant: 'destructive' });
      return;
    }
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
      toast({ title: t('success'), description: t('quickAddSavedAndUsed') });
      onOpenChange(false);
    }
  };

  const suppliers = Array.from(
    new Set(items.map((i) => i.default_supplier).filter((s): s is string => !!s && s.trim().length > 0))
  ).sort();

  // Existing part numbers (excluding the duplicate being edited) for ItemFormDialog
  const existingPartNos = useMemo(
    () =>
      items
        .filter((i) => !editingExisting || i.id !== editingExisting.id)
        .map((i) => i.part_no),
    [items, editingExisting]
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              {t('createItem')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-[11px] text-foreground/80 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <span>{t('quickAddNotice')}</span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qa-part" className="text-xs">
                {t('partNo')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="qa-part"
                value={partNo}
                onChange={(e) => setPartNo(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, partNo: true }))}
                placeholder={t('partNo')}
                className={`font-mono ${partNoError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                autoFocus
                aria-invalid={partNoError}
              />
              {partNoError && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {t('partNoRequired')}
                </p>
              )}
            </div>

            {duplicate && (
              <div className="rounded-md border border-warning/40 bg-warning/10 p-2.5 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <p className="text-xs font-medium text-foreground">{t('itemAlreadyExists')}</p>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p className="truncate">
                        <span className="font-mono">{duplicate.part_no}</span> — {duplicate.description}
                      </p>
                      <p className="font-medium text-foreground/80">{t('duplicateCompare')}:</p>
                      <CompareRow
                        label={t('fieldDescription')}
                        existing={duplicate.description}
                        candidate={description.trim() || '—'}
                      />
                      <CompareRow
                        label={t('fieldUnit')}
                        existing={duplicate.default_unit}
                        candidate={defaultUnit}
                      />
                      <CompareRow
                        label={t('fieldSupplier')}
                        existing={duplicate.default_supplier ?? '—'}
                        candidate={defaultSupplier.trim() || '—'}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={handleUseExisting}
                      >
                        {t('useExisting')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-7 text-xs gap-1"
                        onClick={handleEditExisting}
                      >
                        <Pencil className="w-3 h-3" />
                        {t('editExisting')}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {contextDuplicate && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2.5 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <p className="font-medium text-destructive">{t('duplicateInContextTitle')}</p>
                  <p className="text-muted-foreground">{t('duplicateInContextDesc')}</p>
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
                onBlur={() => setTouched((t) => ({ ...t, description: true }))}
                placeholder={t('description')}
                className={descriptionError ? 'border-destructive focus-visible:ring-destructive' : ''}
                aria-invalid={descriptionError}
              />
              {descriptionError && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {t('descriptionRequired')}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {t('defaultUnit')}
                  {suggestedUnit && (
                    <span className="ms-1 text-[10px] text-muted-foreground">
                      ({t('suggestedUnit')}: {suggestedUnit})
                    </span>
                  )}
                </Label>
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
            <Button onClick={handleSave} disabled={submitting || !!duplicate || contextDuplicate}>
              {submitting && <Loader2 className="w-4 h-4 me-1.5 animate-spin" />}
              {t('saveAndUse')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ItemFormDialog
        open={!!editingExisting}
        onOpenChange={(o) => { if (!o) setEditingExisting(null); }}
        initial={editingExisting}
        onSubmit={handleUpdateAndUse}
        existingPartNos={existingPartNos}
      />
    </>
  );
}

function CompareRow({
  label,
  existing,
  candidate,
}: {
  label: string;
  existing: string;
  candidate: string;
}) {
  const same = existing.trim().toLowerCase() === candidate.trim().toLowerCase();
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <span className="text-muted-foreground/80 min-w-[70px]">{label}:</span>
      <span className="truncate font-mono">{existing}</span>
      {!same && candidate !== '—' && (
        <>
          <span className="text-muted-foreground">→</span>
          <span className="truncate font-mono text-warning">{candidate}</span>
        </>
      )}
    </div>
  );
}
