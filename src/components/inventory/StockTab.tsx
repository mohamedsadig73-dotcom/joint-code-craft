import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useInvStock, useWarehouses } from '@/hooks/useInventory';
import { useItemsMaster } from '@/hooks/useItemsMaster';
import { Search, Package, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function StockTab() {
  const { t, language } = useLanguage();
  const { stock, loading } = useInvStock();
  const { warehouses } = useWarehouses();
  const { items } = useItemsMaster();
  const [search, setSearch] = useState('');

  const itemMap = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);
  const whMap = useMemo(() => new Map(warehouses.map(w => [w.id, w])), [warehouses]);

  // Aggregate by item across warehouses
  const rows = useMemo(() => {
    const filtered = stock.filter(s => {
      if (!search) return true;
      const item = itemMap.get(s.item_id);
      const q = search.toLowerCase();
      return item?.part_no.toLowerCase().includes(q) || item?.description.toLowerCase().includes(q);
    });
    return filtered.sort((a, b) => Math.abs(b.qty) - Math.abs(a.qty));
  }, [stock, search, itemMap]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('searchItems')} className="ps-10" />
      </div>
      {rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Package className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>{t('noStock')}</p></CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {rows.map(s => {
            const item = itemMap.get(s.item_id);
            const wh = whMap.get(s.warehouse_id);
            return (
              <Card key={s.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{item?.part_no ?? '—'}</div>
                    <div className="text-sm text-muted-foreground truncate">{item?.description ?? ''}</div>
                    <div className="text-xs text-muted-foreground mt-1">{wh ? (language === 'ar' ? wh.name_ar : wh.name_en) : '—'}</div>
                  </div>
                  <Badge variant={s.qty > 0 ? 'default' : s.qty < 0 ? 'destructive' : 'secondary'} className="text-base px-3 py-1">
                    {s.qty}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}