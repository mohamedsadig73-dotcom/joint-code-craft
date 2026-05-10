import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { WmsListShell, WmsBadge, WmsButton, type Column, type WmsRowBase } from '../components';

interface Row extends WmsRowBase {
  id: string; count_no: string | null; status: string;
  count_date: string; warehouse_id: string;
  total_variance_qty: number | null;
}
interface WhRow { id: string; code: string; name_ar: string; name_en: string | null; }

export default function Page() {
  const { t, language } = useLanguage();
  const nav = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [whMap, setWhMap] = useState<Map<string, WhRow>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let off = false;
    (async () => {
      const sb = supabase as unknown as { from: (t: string) => unknown };
      type C = { select: (s: string) => C; order: (c: string, o: { ascending: boolean }) => Promise<{ data: unknown[] | null }> };
      const [scRes, whRes] = await Promise.all([
        (sb.from('stock_counts') as unknown as C)
          .select('id,count_no,status,count_date,warehouse_id,total_variance_qty')
          .order('count_date', { ascending: false }) as unknown as Promise<{ data: Row[] | null }>,
        (sb.from('warehouses') as unknown as C)
          .select('id,code,name_ar,name_en')
          .order('code', { ascending: true }) as unknown as Promise<{ data: WhRow[] | null }>,
      ]);
      if (off) return;
      setRows(scRes.data ?? []);
      setWhMap(new Map((whRes.data ?? []).map(w => [w.id, w])));
      setLoading(false);
    })();
    return () => { off = true; };
  }, []);

  const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const statusBadge = (s: string) => {
    if (s === 'posted') return <WmsBadge tone="green">{t('wms.status.posted')}</WmsBadge>;
    if (s === 'in_progress') return <WmsBadge tone="yellow">{t('wms.status.in-progress')}</WmsBadge>;
    if (s === 'cancelled') return <WmsBadge tone="red">{t('wms.status.cancelled')}</WmsBadge>;
    return <WmsBadge>{t('wms.status.draft')}</WmsBadge>;
  };

  const cols: Column<Row>[] = [
    { key: 'no', header: t('wms.col.txn-no'), className: 'wms-td-mono', render: r => r.count_no ?? r.id.slice(0, 8) },
    { key: 'date', header: t('wms.col.date'), render: r => fmtDate(r.count_date) },
    {
      key: 'wh', header: t('wms.nav.warehouses'),
      render: r => {
        const w = whMap.get(r.warehouse_id);
        return w ? `${w.code} · ${language === 'ar' ? w.name_ar : (w.name_en || w.name_ar)}` : '—';
      },
    },
    {
      key: 'var', header: t('wms.stocktake.total-variance'), className: 'wms-td-mono',
      render: r => {
        const v = Number(r.total_variance_qty ?? 0);
        const tone: 'green' | 'red' | 'blue' = v === 0 ? 'green' : v > 0 ? 'blue' : 'red';
        return <WmsBadge tone={tone}>{v}</WmsBadge>;
      },
    },
    { key: 'status', header: t('wms.col.status'), render: r => statusBadge(r.status) },
  ];

  return (
    <WmsListShell<Row>
      title={t('wms.nav.stocktake')}
      rows={rows} columns={cols} loading={loading}
      searchKeys={['count_no']}
      searchPlaceholder={t('wms.common.search-placeholder')}
      onRowClick={r => nav(`/wms/stocktake/${r.id}`)}
      rightActions={<WmsButton variant="primary" size="sm" onClick={() => nav('/wms/stocktake/new')}>+ {t('wms.form.new')}</WmsButton>}
    />
  );
}
