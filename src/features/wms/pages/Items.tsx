import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { WmsListShell, type Column, type WmsRowBase } from '../components';

interface Item extends WmsRowBase {
  id: string; part_no: string; name_ar: string | null; name_en: string | null;
  description: string; default_unit: string; is_active: boolean;
  image_path: string | null; min_qty: number | null; max_qty: number | null;
}
interface StockAgg { item_id: string; qty: number; warehouses: number; }

export default function WmsItemsPage() {
  const { t, language } = useLanguage();
  const [rows, setRows] = useState<Item[]>([]);
  const [stockMap, setStockMap] = useState<Map<string, StockAgg>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let off = false;
    (async () => {
      const sb = supabase as unknown as { from: (t: string) => unknown };
      type C = {
        select: (s: string) => C;
        order: (c: string, o: { ascending: boolean }) => C;
        then: Promise<{ data: unknown[] | null }>['then'];
      };
      const itemsP = (sb.from('items_master') as unknown as C)
        .select('id,part_no,name_ar,name_en,description,default_unit,is_active,image_path,min_qty,max_qty')
        .order('created_at', { ascending: false });
      const stockP = (sb.from('inv_stock') as unknown as C).select('item_id,qty,warehouse_id');
      const [iRes, sRes] = await Promise.all([
        itemsP as unknown as Promise<{ data: Item[] | null }>,
        stockP as unknown as Promise<{ data: { item_id: string; qty: number; warehouse_id: string }[] | null }>,
      ]);
      if (off) return;
      const m = new Map<string, StockAgg>();
      (sRes.data ?? []).forEach(r => {
        const cur = m.get(r.item_id) ?? { item_id: r.item_id, qty: 0, warehouses: 0 };
        cur.qty += Number(r.qty || 0);
        cur.warehouses += 1;
        m.set(r.item_id, cur);
      });
      setStockMap(m);
      setRows(iRes.data ?? []);
      setLoading(false);
    })();
    return () => { off = true; };
  }, []);

  const cols: Column<Item>[] = useMemo(() => [
    {
      key: 'img', header: '',
      render: r => (
        <div className="wms-thumb">
          {r.image_path ? <img src={r.image_path} alt="" loading="lazy" /> : '◇'}
        </div>
      ),
    },
    { key: 'part_no', header: t('wms.col.part-no'), className: 'wms-td-mono', render: r => r.part_no },
    {
      key: 'name', header: t('wms.col.name'), className: 'wms-td-primary',
      render: r => (language === 'ar' ? (r.name_ar || r.description) : (r.name_en || r.description)),
    },
    {
      key: 'qty', header: t('wms.col.qty'),
      render: r => {
        const total = stockMap.get(r.id)?.qty ?? 0;
        const max = Number(r.max_qty || 0);
        const min = Number(r.min_qty || 0);
        const denom = max > 0 ? max : Math.max(min * 2, total, 1);
        const pct = Math.min(100, Math.max(0, (total / denom) * 100));
        const cls = total <= 0 ? 'is-crit' : (min > 0 && total < min) ? 'is-low' : 'is-ok';
        return (
          <div className="wms-qbar">
            <div className="wms-qbar-track"><div className={`wms-qbar-fill ${cls}`} style={{ width: `${pct}%` }} /></div>
            <div className="wms-qbar-num">{total}</div>
          </div>
        );
      },
    },
    { key: 'wh', header: t('wms.col.warehouses-count'), render: r => stockMap.get(r.id)?.warehouses ?? 0 },
    { key: 'unit', header: t('wms.col.unit'), render: r => r.default_unit },
    {
      key: 'status', header: t('wms.col.status'),
      render: r => <span className={`wms-badge ${r.is_active ? 'wms-badge-green' : 'wms-badge-gray'}`}>
        {r.is_active ? t('wms.status.active') : t('wms.status.inactive')}</span>,
    },
  ], [t, language, stockMap]);

  return (
    <WmsListShell<Item>
      title={t('wms.nav.items')} subtitle={t('wms.items.sub')}
      rows={rows} columns={cols} loading={loading}
      searchKeys={['part_no', 'name_ar', 'name_en', 'description']}
      searchPlaceholder={t('wms.common.search-placeholder')}
    />
  );
}