import { useMemo, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStockAlerts } from '@/hooks/useStockAlerts';
import { AlertTriangle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const levelConfig: Record<string, { label: string; cls: string }> = {
  out_of_stock: { label: 'نفد', cls: 'bg-destructive text-destructive-foreground' },
  below_min: { label: 'أقل من الحد الأدنى', cls: 'bg-orange-500 text-white' },
  reorder: { label: 'إعادة طلب', cls: 'bg-amber-500 text-white' },
  above_max: { label: 'فائض عن الحد الأقصى', cls: 'bg-blue-500 text-white' },
};

export default function StockAlerts() {
  const { t } = useLanguage();
  const { rows, loading } = useStockAlerts();
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r =>
      r.part_no?.toLowerCase().includes(s) ||
      r.description?.toLowerCase().includes(s) ||
      r.name_ar?.toLowerCase().includes(s) ||
      r.warehouse_name?.toLowerCase().includes(s)
    );
  }, [rows, q]);

  const counts = useMemo(() => {
    const c = { out_of_stock: 0, below_min: 0, reorder: 0, above_max: 0 };
    rows.forEach(r => { if (r.alert_level in c) (c as any)[r.alert_level]++; });
    return c;
  }, [rows]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        <PageHeader title={t('lowStockAlerts')} subtitle={t('wmsDashboardDesc')} icon={AlertTriangle} />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {(['out_of_stock', 'below_min', 'reorder', 'above_max'] as const).map(k => (
            <Card key={k} className="p-4 text-center">
              <div className="text-3xl font-bold">{counts[k]}</div>
              <div className="text-xs text-muted-foreground mt-1">{levelConfig[k].label}</div>
            </Card>
          ))}
        </div>

        <div className="relative mt-6 max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search') || 'بحث'} className="ps-10" />
        </div>

        {loading ? (
          <div className="space-y-2 mt-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">{t('noLowStock')}</div>
        ) : (
          <div className="grid gap-2 mt-4">
            {filtered.map((r, i) => {
              const cfg = levelConfig[r.alert_level] || { label: r.alert_level, cls: '' };
              return (
                <Card key={`${r.item_id}-${r.warehouse_id || 'none'}-${i}`} className="p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm font-bold">{r.part_no}</div>
                    <div className="text-sm text-muted-foreground truncate">{r.name_ar || r.description}</div>
                    {r.warehouse_name && <div className="text-xs text-muted-foreground mt-1">{r.warehouse_name}</div>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-end">
                      <div className="text-xs text-muted-foreground">{t('stock') || 'المخزون'}</div>
                      <div className="font-bold">{Number(r.qty_on_hand).toLocaleString('en-US')}</div>
                    </div>
                    {r.min_qty != null && (
                      <div className="text-end">
                        <div className="text-xs text-muted-foreground">{t('min')}</div>
                        <div>{Number(r.min_qty).toLocaleString('en-US')}</div>
                      </div>
                    )}
                    <Badge className={cfg.cls}>{cfg.label}</Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}