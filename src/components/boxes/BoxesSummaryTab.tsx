import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2, Package, PackageOpen } from 'lucide-react';
import { useBoxSummary } from '@/hooks/useBoxSummary';
import { useBoxReceipts } from '@/hooks/useBoxReceipts';
import { BoxCard } from './BoxCard';
import { BOX_DESTINATIONS } from '@/utils/boxNumberValidation';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { destinationBadgeClass } from './destinationStyles';

export function BoxesSummaryTab() {
  const { t } = useLanguage();
  const { summary, loading } = useBoxSummary();
  const { receipts } = useBoxReceipts();
  const [search, setSearch] = useState('');
  const [destFilter, setDestFilter] = useState('all');
  const [looseDialogOpen, setLooseDialogOpen] = useState(false);

  const looseItems = useMemo(
    () => receipts.filter((r) => r.packing_type === 'loose'),
    [receipts]
  );
  const looseQty = useMemo(
    () => looseItems.reduce((s, r) => s + r.qty, 0),
    [looseItems]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return summary.filter((b) => {
      if (destFilter !== 'all' && b.destination !== destFilter) return false;
      if (!q) return true;
      return b.box_no.toLowerCase().includes(q) || b.suppliers.toLowerCase().includes(q);
    });
  }, [summary, search, destFilter]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, b) => ({
        boxes: acc.boxes + 1,
        items: acc.items + b.items_count,
        qty: acc.qty + b.total_qty,
      }),
      { boxes: 0, items: 0, qty: 0 }
    );
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Loose items spotlight */}
      {looseItems.length > 0 && (
        <Card
          className="p-3 cursor-pointer hover:bg-muted/30 transition-colors border-purple-500/30 bg-purple-500/5"
          onClick={() => setLooseDialogOpen(true)}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-purple-500/10 flex items-center justify-center">
                <PackageOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="font-semibold text-sm">{t('looseItems')}</div>
                <p className="text-xs text-muted-foreground">{t('packingTypeLooseDesc')}</p>
              </div>
            </div>
            <div className="text-end">
              <div className="text-2xl font-bold tabular-nums text-purple-600 dark:text-purple-400">
                {looseItems.length.toLocaleString('en-US')}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {t('totalQty')}: {looseQty.toLocaleString('en-US')}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <div className="text-xs text-muted-foreground">{t('totalBoxes')}</div>
          <div className="text-xl font-bold text-destructive">{totals.boxes.toLocaleString('en-US')}</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-xs text-muted-foreground">{t('totalItems')}</div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{totals.items.toLocaleString('en-US')}</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-xs text-muted-foreground">{t('totalQty')}</div>
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{totals.qty.toLocaleString('en-US')}</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchBoxes')}
            className="ps-10"
          />
        </div>
        <Select value={destFilter} onValueChange={setDestFilter}>
          <SelectTrigger className="w-full md:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all')}</SelectItem>
            {BOX_DESTINATIONS.map((d) => <SelectItem key={d} value={d}>{t(`dest_${d}`)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin me-2" />
          {t('loading')}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-12 h-12 mx-auto opacity-30 mb-2" />
          <p className="text-sm text-muted-foreground">{t('noBoxesYet')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((b) => <BoxCard key={`${b.box_no}-${b.destination}`} box={b} />)}
        </div>
      )}

      <Dialog open={looseDialogOpen} onOpenChange={setLooseDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageOpen className="w-5 h-5 text-purple-600" />
              {t('looseItems')} ({looseItems.length.toLocaleString('en-US')})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {looseItems.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-md border border-border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold">{r.part_no}</span>
                    <Badge className={destinationBadgeClass(r.destination)}>
                      {t(`dest_${r.destination}`)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{r.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{r.supplier}</p>
                </div>
                <div className="text-end shrink-0">
                  <div className="text-sm font-bold tabular-nums">{r.qty.toLocaleString('en-US')}</div>
                  <div className="text-[10px] text-muted-foreground">{r.unit}</div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}