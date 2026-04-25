import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, ArrowRight } from 'lucide-react';

export interface FieldDiff {
  label: string;
  oldValue: string;
  newValue: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diffs: FieldDiff[];
  onConfirm: () => Promise<void> | void;
  submitting?: boolean;
}

export function EditPreviewDialog({ open, onOpenChange, diffs, onConfirm, submitting }: Props) {
  const { t } = useLanguage();
  const realDiffs = diffs.filter(
    (d) => (d.oldValue ?? '').toString() !== (d.newValue ?? '').toString()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('editPreviewTitle')}</DialogTitle>
          <DialogDescription>{t('editPreviewDesc')}</DialogDescription>
        </DialogHeader>

        {realDiffs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t('noChangesDetected')}
          </p>
        ) : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {realDiffs.map((d, i) => (
              <div key={i} className="rounded-md border bg-muted/30 p-2.5 text-xs space-y-1">
                <p className="font-medium text-foreground">{d.label}</p>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <div className="rounded bg-destructive/10 text-destructive px-2 py-1 line-through truncate font-mono">
                    {d.oldValue || '—'}
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  <div className="rounded bg-success/10 text-success px-2 py-1 truncate font-mono">
                    {d.newValue || '—'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t('cancel')}
          </Button>
          <Button onClick={() => onConfirm()} disabled={submitting || realDiffs.length === 0}>
            {submitting && <Loader2 className="w-4 h-4 me-1.5 animate-spin" />}
            {t('confirmAndSave')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
