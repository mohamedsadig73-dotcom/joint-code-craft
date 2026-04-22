import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import type { BoxReceipt, BoxReceiptInput } from '@/hooks/useBoxReceipts';
import type { ImportDuplicateMatch } from '@/utils/boxDuplicateAnalysis';

export type ImportResolution = 'merge' | 'skip' | 'insert';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  duplicates: ImportDuplicateMatch<BoxReceiptInput>[];
  uniqueCount: number;
  onResolve: (resolution: ImportResolution) => void;
}

export function ImportDuplicateDialog({ open, onOpenChange, duplicates, uniqueCount, onResolve }: Props) {
  const { t } = useLanguage();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            {t('importDuplicateWarning')}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{t('importDuplicateConfirm')}</p>
        <div className="text-xs text-muted-foreground">
          {t('duplicates')}:{' '}
          <span className="font-semibold text-foreground">{duplicates.length.toLocaleString('en-US')}</span>
          {' · '}
          {t('rowsImported')}:{' '}
          <span className="font-semibold text-foreground">{uniqueCount.toLocaleString('en-US')}</span>
        </div>
        <div className="max-h-64 overflow-y-auto space-y-1 text-xs">
          {duplicates.slice(0, 50).map((d, i) => (
            <div key={i} className="p-2 rounded border border-border">
              <span className="font-mono font-bold">{d.input.part_no}</span> · {d.input.box_no ?? '—'} ·{' '}
              {t(`dest_${d.input.destination}`)}{' '}
              <span className="text-muted-foreground">
                ({t('qty')}: +{d.input.qty}, existing #{d.existing.serial_no} = {d.existing.qty})
              </span>
            </div>
          ))}
          {duplicates.length > 50 && (
            <div className="text-muted-foreground italic">+{duplicates.length - 50}…</div>
          )}
        </div>
        <DialogFooter className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button variant="outline" onClick={() => onResolve('skip')}>
            {t('importSkip')}
          </Button>
          <Button variant="outline" onClick={() => onResolve('insert')}>
            {t('importInsertAnyway')}
          </Button>
          <Button onClick={() => onResolve('merge')}>{t('importMergeQty')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}