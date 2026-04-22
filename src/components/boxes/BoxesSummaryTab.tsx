import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2, Package } from 'lucide-react';
import { useBoxSummary } from '@/hooks/useBoxSummary';
import { BoxCard } from './BoxCard';
import { BOX_DESTINATIONS } from '@/utils/boxNumberValidation';
import { Card } from '@/components/ui/card';

export function BoxesSummaryTab() {
  const { t } = useLanguage();
  const { summary, loading } = useBoxSummary();
  const [search, setSearch] = useState('');
  const [destFilter, setDestFilter] = useState('all');

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
    </div>
  );
}