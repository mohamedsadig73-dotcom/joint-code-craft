import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { WmsListShell, type Column, type WmsRowBase } from '../components';

interface Row extends WmsRowBase {
  id: string; code: string; name_ar: string; name_en: string | null; is_active: boolean;
}
interface WhAgg { items: Set<string>; qty: number; locations: number; lastStocktake: string | null; }

export default function Page() {
  const { t, language } = useLanguage();
  const [rows, setRows] = useState<Row[]>([]);
  const [agg, setAgg] = useState<Map<string, WhAgg>>(new Map());
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
      const whP = (sb.from('warehouses') as unknown as C)
        .select('id,code,name_ar,name_en,is_active').order('code', { ascending: true });
      const stockP = (sb.from('inv_stock') as unknown as C).select('warehouse_id,item_id,qty');
      const locP = (sb.from('inv_locations') as unknown as C).select('warehouse_id');
      const stkP = (sb.from('stock_counts') as unknown as C)
        .select('warehouse_id,count_date,status').order('count_date', { ascending: false });
      const [whRes, stockRes, locRes, stkRes] = await Promise.all([
        whP as unknown as Promise<{ data: Row[] | null }>,
        stockP as unknown as Promise<{ data: { warehouse_id: string; item_id: string; qty: number }[] | null }>,
        locP as unknown as Promise<{ data: { warehouse_id: string }[] | null }>,
        stkP as unknown as Promise<{ data: { warehouse_id: string; count_date: string; status: string }[] | null }>,
      ]);
      if (off) return;
      const m = new Map<string, WhAgg>();
      const ensure = (id: string) => {
        let v = m.get(id);
        if (!v) { v = { items: new Set(), qty: 0, locations: 0, lastStocktake: null }; m.set(id, v); }
        return v;
      };
      (stockRes.data ?? []).forEach(r => { const v = ensure(r.warehouse_id); v.items.add(r.item_id); v.qty += Number(r.qty || 0); });
      (locRes.data ?? []).forEach(r => { ensure(r.warehouse_id).locations += 1; });
      (stkRes.data ?? []).forEach(r => {
        if (r.status !== 'posted') return;
        const v = ensure(r.warehouse_id);
        if (!v.lastStocktake || r.count_date > v.lastStocktake) v.lastStocktake = r.count_date;
      });
      setAgg(m);
      setRows(whRes.data ?? []);
      setLoading(false);
    })();
    return () => { off = true; };
  }, []);

  const fmtDate = (s: string | null) =>
    s ? new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

  const cols: Column<Row>[] = [
    { key: 'code', header: t('wms.col.code'), className: 'wms-td-mono', render: r => r.code },
    {
      key: 'name', header: t('wms.col.name'), className: 'wms-td-primary',
      render: r => language === 'ar' ? r.name_ar : (r.name_en || r.name_ar),
    },
    { key: 'items', header: t('wms.col.items-count'), render: r => agg.get(r.id)?.items.size ?? 0 },
    { key: 'qty', header: t('wms.col.total-qty'), className: 'wms-td-mono',
      render: r => Math.round(agg.get(r.id)?.qty ?? 0).toLocaleString('en-GB') },
    { key: 'locs', header: t('wms.col.locations-count'), render: r => agg.get(r.id)?.locations ?? 0 },
    { key: 'last', header: t('wms.col.last-stocktake'), render: r => fmtDate(agg.get(r.id)?.lastStocktake ?? null) },
    {
      key: 'status', header: t('wms.col.status'),
      render: r => <span className={`wms-badge ${r.is_active ? 'wms-badge-green' : 'wms-badge-gray'}`}>
        {r.is_active ? t('wms.status.active') : t('wms.status.inactive')}</span>,
    },
  ];

  return (
    <WmsListShell<Row>
      title={t('wms.nav.warehouses')}
      rows={rows} columns={cols} loading={loading}
      searchKeys={['code', 'name_ar', 'name_en']}
      searchPlaceholder={t('wms.common.search-placeholder')}
    />
  );
}