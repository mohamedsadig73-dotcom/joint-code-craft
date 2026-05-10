import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Package, Wand2 } from 'lucide-react';
import { normalizeBoxNo } from '@/utils/boxNumberValidation';
import { destinationBadgeClass } from '../destinationStyles';
import type { BoxReceipt, BoxReceiptInput } from '@/hooks/useBoxReceipts';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  receipts: BoxReceipt[];
  /** Bulk update — must accept (ids, patch) and return number updated. */
  bulkUpdateFields: (ids: string[], patch: Partial<BoxReceiptInput>) => Promise<number>;
  onCompleted?: () => void;
}

/**
 * Fast bulk box-number entry after physical packing.
 * Two modes:
 *  - Row by row: type a number, press Enter, jump to next row.
 *  - Group: select rows + apply a single box number to all of them.
 */
export function BulkBoxAssignDialog({
  open, onOpenChange, receipts, bulkUpdateFields, onCompleted,
}: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [boxByReceipt, setBoxByReceipt] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [groupValue, setGroupValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (open) {
      // Pre-fill with current box_no if any
      const initial: Record<string, string> = {};
      receipts.forEach((r) => { initial[r.id] = r.box_no ?? ''; });
      setBoxByReceipt(initial);
      setSelected(new Set());
      setGroupValue('');
    }
  }, [open, receipts]);

  const filledCount = useMemo(
    () => Object.values(boxByReceipt).filter((v) => v.trim().length > 0).length,
    [boxByReceipt],
  );

  const focusRow = (idx: number) => {
    const el = inputsRef.current[idx];
    if (el) {
      el.focus();
      el.select();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const next = e.shiftKey ? idx - 1 : idx + 1;
      if (next >= 0 && next < receipts.length) focusRow(next);
    }
  };

  const handleBlur = (id: string) => {
    const raw = boxByReceipt[id]?.trim() ?? '';
    if (!raw) return;
    setBoxByReceipt((p) => ({ ...p, [id]: normalizeBoxNo(raw) }));
  };

  const toggleRow = (id: string) => {
    setSelected((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const applyGroup = () => {
    const v = groupValue.trim();
    if (!v || selected.size === 0) return;
    const normalized = normalizeBoxNo(v);
    setBoxByReceipt((prev) => {
      const next = { ...prev };
      selected.forEach((id) => { next[id] = normalized; });
      return next;
    });
    setGroupValue('');
    setSelected(new Set());
  };

  const handleSave = async () => {
    // Collect entries with a box value
    const entries = receipts
      .map((r) => ({ id: r.id, box: (boxByReceipt[r.id] ?? '').trim() }))
      .filter((e) => e.box.length > 0);

    if (entries.length === 0) {
      toast({ title: t('error'), description: t('boxNoRequired'), variant: 'destructive' });
      return;
    }

    // Group ids by box number for minimal round-trips
    const byBox = new Map<string, string[]>();
    for (const e of entries) {
      const norm = normalizeBoxNo(e.box);
      const arr = byBox.get(norm) ?? [];
      arr.push(e.id);
      byBox.set(norm, arr);
    }

    setSubmitting(true);
    try {
      let totalUpdated = 0;
      for (const [box, ids] of byBox.entries()) {
        const updated = await bulkUpdateFields(ids, {
          box_no: box,
          packing_type: 'boxed',
          status: 'packed',
        });
        totalUpdated += updated;
      }
      if (totalUpdated > 0) {
        toast({ title: t('success'), description: `${totalUpdated} ${t('itemsPacked')}` });
        onCompleted?.();
        onOpenChange(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {t('bulkBoxAssignTitle')}
          </DialogTitle>
        </DialogHeader>

        {/* Group apply */}
        <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30 border border-border/60">
          <Wand2 className="w-4 h-4 text-primary shrink-0" />
          <span className="text-xs text-muted-foreground shrink-0">
            {t('selectedCount').replace('{n}', selected.size.toLocaleString('en-US'))}
          </span>
          <Input
            value={groupValue}
            onChange={(e) => setGroupValue(e.target.value)}
            placeholder={t('boxNoPlaceholder')}
            className="h-8 max-w-[160px] font-mono text-center uppercase"
            onKeyDown={(e) => { if (e.key === 'Enter') applyGroup(); }}
          />
          <Button
            size="sm"
            type="button"
            onClick={applyGroup}
            disabled={!groupValue.trim() || selected.size === 0}
          >
            {t('applyToSelected')}
          </Button>
          <div className="flex-1" />
          <Badge variant="outline" className="text-[10px]">
            {filledCount.toLocaleString('en-US')} / {receipts.length.toLocaleString('en-US')}
          </Badge>
        </div>

        <p className="text-[11px] text-muted-foreground">{t('bulkBoxAssignHint')}</p>

        <div className="flex-1 overflow-y-auto rounded-md border border-border min-h-[240px]">
          <table className="w-full text-xs">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="p-2 w-8"></th>
                <th className="p-2 text-start">#</th>
                <th className="p-2 text-start">{t('partNo')}</th>
                <th className="p-2 text-start">{t('description')}</th>
                <th className="p-2 text-end">{t('qty')}</th>
                <th className="p-2 text-center">{t('destination')}</th>
                <th className="p-2 text-center w-28">{t('boxNo')}</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((r, idx) => {
                const isChecked = selected.has(r.id);
                return (
                  <tr key={r.id} className={`border-t border-border ${isChecked ? 'bg-primary/5' : ''}`}>
                    <td className="p-2">
                      <Checkbox checked={isChecked} onCheckedChange={() => toggleRow(r.id)} />
                    </td>
                    <td className="p-2 text-muted-foreground tabular-nums">{idx + 1}</td>
                    <td className="p-2 font-mono font-bold">{r.part_no}</td>
                    <td className="p-2 truncate max-w-[260px]">{r.description}</td>
                    <td className="p-2 text-end tabular-nums">
                      {r.qty.toLocaleString('en-US')} <span className="text-muted-foreground text-[10px]">{r.unit}</span>
                    </td>
                    <td className="p-2 text-center">
                      <Badge className={`${destinationBadgeClass(r.destination)} text-[10px]`}>
                        {t(`dest_${r.destination}` as never)}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <Input
                        ref={(el) => { inputsRef.current[idx] = el; }}
                        value={boxByReceipt[r.id] ?? ''}
                        onChange={(e) =>
                          setBoxByReceipt((p) => ({ ...p, [r.id]: e.target.value.toUpperCase() }))
                        }
                        onKeyDown={(e) => handleKeyDown(e, idx)}
                        onBlur={() => handleBlur(r.id)}
                        placeholder="B-01"
                        className="h-8 text-center font-mono uppercase"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
          <Button onClick={handleSave} disabled={submitting || filledCount === 0}>
            {submitting ? <Loader2 className="w-4 h-4 me-1.5 animate-spin" /> : null}
            {t('saveAndMarkPacked')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}