import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBoxReceipts, type BoxReceipt } from '@/hooks/useBoxReceipts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  receipts: BoxReceipt[];
  onMerged?: () => void;
}

export function MergeReceiptsDialog({ open, onOpenChange, receipts, onMerged }: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { mergeReceipts } = useBoxReceipts();
  const [keeperId, setKeeperId] = useState<string>('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && receipts.length > 0) {
      setKeeperId(receipts[0].id);
    }
  }, [open, receipts]);

  const totalQty = receipts.reduce((s, r) => s + r.qty, 0);

  const handleMerge = async () => {
    if (!keeperId) {
      toast({ title: t('error'), description: t('selectKeeperFirst'), variant: 'destructive' });
      return;
    }
    setBusy(true);
    const ok = await mergeReceipts(
      keeperId,
      receipts.map((r) => r.id)
    );
    setBusy(false);
    if (ok) {
      onOpenChange(false);
      onMerged?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('mergeIntoOne')}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{t('selectKeeperFirst')}</p>
        <RadioGroup value={keeperId} onValueChange={setKeeperId} className="space-y-2 max-h-80 overflow-y-auto">
          {receipts.map((r) => (
            <div
              key={r.id}
              className="flex items-start gap-3 p-3 rounded-md border border-border hover:bg-muted/40"
            >
              <RadioGroupItem value={r.id} id={`keep-${r.id}`} className="mt-1" />
              <Label htmlFor={`keep-${r.id}`} className="flex-1 cursor-pointer space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold">#{r.serial_no}</span>
                  <span className="text-xs text-muted-foreground">{r.part_no}</span>
                  <span className="text-xs">·</span>
                  <span className="text-xs">{r.box_no ?? '—'}</span>
                  <span className="text-xs">·</span>
                  <span className="text-xs">{t(`dest_${r.destination}`)}</span>
                </div>
                <div className="text-xs text-muted-foreground line-clamp-1">{r.description}</div>
                <div className="text-xs">
                  <span className="font-semibold tabular-nums">{r.qty.toLocaleString('en-US')}</span>{' '}
                  {r.unit}
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>
        <div className="text-sm text-muted-foreground">
          {t('totalQty')}:{' '}
          <span className="font-semibold text-foreground tabular-nums">
            {totalQty.toLocaleString('en-US')}
          </span>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {t('cancel')}
          </Button>
          <Button onClick={handleMerge} disabled={busy || !keeperId}>
            {busy && <Loader2 className="w-4 h-4 me-1.5 animate-spin" />}
            {t('mergeSelected')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}