import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { BOX_DESTINATIONS } from '@/utils/boxNumberValidation';
import type { BoxReceipt } from '@/hooks/useBoxReceipts';
import { Loader2, ArrowRight } from 'lucide-react';

export interface BulkEditPatch {
  supplier?: string;
  destination?: BoxReceipt['destination'];
  receipt_date?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: BoxReceipt[];
  existingSuppliers: string[];
  onApply: (ids: string[], patch: BulkEditPatch) => Promise<number>;
}

export function BulkEditReceiptsDialog({
  open, onOpenChange, selected, existingSuppliers, onApply,
}: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [enableSupplier, setEnableSupplier] = useState(false);
  const [enableDestination, setEnableDestination] = useState(false);
  const [enableDate, setEnableDate] = useState(false);

  const [supplier, setSupplier] = useState('');
  const [destination, setDestination] = useState<BoxReceipt['destination']>('unspecified');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const [step, setStep] = useState<'edit' | 'review'>('edit');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setEnableSupplier(false);
      setEnableDestination(false);
      setEnableDate(false);
      setSupplier('');
      setDestination('unspecified');
      setDate(new Date().toISOString().slice(0, 10));
      setStep('edit');
      setSubmitting(false);
    }
  }, [open]);

  const patch: BulkEditPatch = useMemo(() => {
    const p: BulkEditPatch = {};
    if (enableSupplier && supplier.trim()) p.supplier = supplier.trim();
    if (enableDestination) p.destination = destination;
    if (enableDate && date) p.receipt_date = date;
    return p;
  }, [enableSupplier, supplier, enableDestination, destination, enableDate, date]);

  const hasChanges = Object.keys(patch).length > 0;

  const handleNext = () => {
    if (!hasChanges) {
      toast({ title: t('error'), description: t('bulkEditNoChange'), variant: 'destructive' });
      return;
    }
    setStep('review');
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const updated = await onApply(selected.map((r) => r.id), patch);
      toast({
        title: t('success'),
        description: t('bulkEditApplied').replace('{count}', String(updated)),
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('bulkEditTitle')}</DialogTitle>
          <DialogDescription>
            {t('bulkEditDescription')} — {selected.length} {t('selected')}
          </DialogDescription>
        </DialogHeader>

        {step === 'edit' ? (
          <div className="space-y-4">
            <FieldRow
              enabled={enableSupplier}
              onToggle={setEnableSupplier}
              label={t('supplier')}
            >
              <Input
                list="bulk-sup-list"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                disabled={!enableSupplier}
              />
              <datalist id="bulk-sup-list">
                {existingSuppliers.map((s) => <option key={s} value={s} />)}
              </datalist>
            </FieldRow>

            <FieldRow
              enabled={enableDestination}
              onToggle={setEnableDestination}
              label={t('destination')}
            >
              <Select
                value={destination}
                onValueChange={(v) => setDestination(v as BoxReceipt['destination'])}
                disabled={!enableDestination}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BOX_DESTINATIONS.map((d) => (
                    <SelectItem key={d} value={d}>{t(`dest_${d}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>

            <FieldRow
              enabled={enableDate}
              onToggle={setEnableDate}
              label={t('receiptDate')}
            >
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={!enableDate}
              />
            </FieldRow>
          </div>
        ) : (
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            <p className="text-sm text-muted-foreground">{t('bulkEditReview')}</p>
            <div className="space-y-2">
              {selected.slice(0, 50).map((r) => (
                <ReviewRow key={r.id} receipt={r} patch={patch} t={t} />
              ))}
              {selected.length > 50 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  +{selected.length - 50} ...
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {step === 'review' && (
            <Button variant="outline" onClick={() => setStep('edit')} disabled={submitting}>
              {t('back') || '←'}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t('cancel')}
          </Button>
          {step === 'edit' ? (
            <Button onClick={handleNext} disabled={!hasChanges}>
              {t('bulkEditReview')}
            </Button>
          ) : (
            <Button onClick={handleConfirm} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 me-1.5 animate-spin" />}
              {t('confirmAndSave')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldRow({
  enabled, onToggle, label, children,
}: {
  enabled: boolean;
  onToggle: (b: boolean) => void;
  label: string;
  children: React.ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <div className="grid grid-cols-[auto_1fr] gap-3 items-center rounded-md border p-3">
      <div className="flex items-center gap-2">
        <Switch checked={enabled} onCheckedChange={onToggle} />
        <Label className="text-sm font-medium min-w-[80px]">{label}</Label>
      </div>
      <div className={enabled ? '' : 'opacity-50'}>
        {enabled ? children : (
          <span className="text-xs text-muted-foreground">{t('keepUnchanged')}</span>
        )}
      </div>
    </div>
  );
}

function ReviewRow({
  receipt, patch, t,
}: {
  receipt: BoxReceipt;
  patch: BulkEditPatch;
  t: (k: string) => string;
}) {
  const changes: Array<{ label: string; old: string; next: string }> = [];
  if (patch.supplier && patch.supplier !== receipt.supplier) {
    changes.push({ label: t('supplier'), old: receipt.supplier, next: patch.supplier });
  }
  if (patch.destination && patch.destination !== receipt.destination) {
    changes.push({ label: t('destination'), old: t(`dest_${receipt.destination}`), next: t(`dest_${patch.destination}`) });
  }
  if (patch.receipt_date && patch.receipt_date !== receipt.receipt_date) {
    changes.push({ label: t('receiptDate'), old: receipt.receipt_date, next: patch.receipt_date });
  }
  return (
    <div className="rounded-md border bg-muted/30 p-2 text-xs">
      <div className="flex items-center gap-2 font-mono mb-1">
        <span className="text-muted-foreground">#{receipt.serial_no}</span>
        <span className="truncate">{receipt.part_no}</span>
      </div>
      {changes.length === 0 ? (
        <p className="text-muted-foreground italic">{t('noChangesDetected')}</p>
      ) : (
        <div className="space-y-0.5">
          {changes.map((c, i) => (
            <div key={i} className="flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground min-w-[60px]">{c.label}:</span>
              <span className="line-through text-destructive/70">{c.old}</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <span className="text-success font-medium">{c.next}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
