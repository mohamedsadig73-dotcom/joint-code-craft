import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { X, Zap } from 'lucide-react';
import type { BoxReceipt } from '@/hooks/useBoxReceipts';

interface QuickFacet {
  key: string;
  label: string;
  count: number;
  ids: string[];
  active: boolean;
}

interface Props {
  visibleReceipts: BoxReceipt[];
  selectedIds: Set<string>;
  onSelectIds: (ids: string[]) => void;
  onDeselectIds: (ids: string[]) => void;
  onClear: () => void;
  onSelectAllVisible: () => void;
}

/**
 * Quick multi-dimensional selection: click chips to add/remove whole groups
 * (by destination, supplier, invoice, packing type) to/from the selection.
 */
export function PackingQuickSelectBar({
  visibleReceipts,
  selectedIds,
  onSelectIds,
  onDeselectIds,
  onClear,
  onSelectAllVisible,
}: Props) {
  const { t } = useLanguage();

  const buildFacets = (
    keyFn: (r: BoxReceipt) => string | null | undefined,
    labelFn: (k: string) => string,
  ): QuickFacet[] => {
    const groups = new Map<string, string[]>();
    for (const r of visibleReceipts) {
      const k = keyFn(r);
      if (!k) continue;
      const arr = groups.get(k) ?? [];
      arr.push(r.id);
      groups.set(k, arr);
    }
    return Array.from(groups.entries())
      .map(([k, ids]) => ({
        key: k,
        label: labelFn(k),
        count: ids.length,
        ids,
        active: ids.length > 0 && ids.every((id) => selectedIds.has(id)),
      }))
      .sort((a, b) => b.count - a.count);
  };

  const destFacets = useMemo(
    () => buildFacets((r) => r.destination, (k) => t(`dest_${k}` as never)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleReceipts, selectedIds, t],
  );

  const packingFacets = useMemo(
    () => buildFacets((r) => r.packing_type, (k) => t(`pack_${k}` as never)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleReceipts, selectedIds, t],
  );

  const supplierFacets = useMemo(
    () => buildFacets((r) => r.supplier, (k) => k).slice(0, 8),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleReceipts, selectedIds],
  );

  const invoiceFacets = useMemo(
    () => buildFacets((r) => r.invoice_number?.trim() || null, (k) => k).slice(0, 8),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleReceipts, selectedIds],
  );

  const toggleFacet = (f: QuickFacet) => {
    if (f.active) onDeselectIds(f.ids);
    else onSelectIds(f.ids);
  };

  const renderRow = (title: string, facets: QuickFacet[]) => {
    if (facets.length === 0) return null;
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-bold text-muted-foreground shrink-0 w-20">{title}:</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {facets.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => toggleFacet(f)}
              className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                f.active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/40 hover:bg-muted border-border'
              }`}
              title={f.label}
            >
              <span className="font-medium">{f.label}</span>
              <span className="ms-1.5 tabular-nums opacity-80">{f.count.toLocaleString('en-US')}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="p-2.5 space-y-2 bg-muted/20 border-border/60">
      <div className="flex items-center gap-2 flex-wrap">
        <Zap className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-bold">{t('quickSelect')}</span>
        <Badge variant="outline" className="text-[10px]">
          {selectedIds.size.toLocaleString('en-US')} / {visibleReceipts.length.toLocaleString('en-US')}
        </Badge>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onSelectAllVisible}>
          {t('selectAllVisible')}
        </Button>
        {selectedIds.size > 0 && (
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={onClear}>
            <X className="w-3 h-3" />
            {t('clearSelection')}
          </Button>
        )}
      </div>
      {renderRow(t('destination'), destFacets)}
      {renderRow(t('packing'), packingFacets)}
      {renderRow(t('supplier'), supplierFacets)}
      {renderRow(t('invoiceNo'), invoiceFacets)}
      <p className="text-[10px] text-muted-foreground">{t('packingSelectionHint')}</p>
    </Card>
  );
}