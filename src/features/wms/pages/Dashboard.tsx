import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { WmsCard, WmsKpi, WmsBadge } from '../components';
import { RTLEChart } from '@/components/charts/RTLEChart';

interface Stats {
  items: number;
  totalQty: number;
  lowStock: number;
  txnsToday: number;
  stocktakeInProgress: number;
}
interface RecentTxn {
  id: string;
  txn_no: string;
  txn_type: string;
  txn_date: string;
  status: string;
  party_name: string | null;
}
interface AlertRow {
  item_id: string; part_no: string; description: string; name_ar: string | null;
  min_qty: number | null; qty_on_hand: number; alert_level: string;
  warehouse_name: string | null;
}
interface CatBucket { name: string; count: number; }

export default function WmsDashboardPage() {
  const { t, language } = useLanguage();
  const [stats, setStats] = useState<Stats>({ items: 0, totalQty: 0, lowStock: 0, txnsToday: 0, stocktakeInProgress: 0 });
  const [recent, setRecent] = useState<RecentTxn[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [cats, setCats] = useState<CatBucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);

      const sb = supabase as unknown as { from: (t: string) => unknown };
      type AnyChain = {
        select: (s: string, o?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) => AnyChain;
        eq: (c: string, v: unknown) => AnyChain;
        in: (c: string, v: unknown[]) => AnyChain;
        gte: (c: string, v: unknown) => AnyChain;
        order: (c: string, o: { ascending: boolean }) => AnyChain;
        limit: (n: number) => Promise<{ data: unknown[] | null; count: number | null }>;
        then: Promise<{ data: unknown[] | null; count: number | null }>['then'];
      };
      const from = (table: string) => sb.from(table) as unknown as AnyChain;

      const itemsP = from('items_master').select('id', { count: 'exact', head: true });
      const totQtyP = from('inv_stock').select('qty');
      const txnP = from('inv_transactions').select('id', { count: 'exact', head: true })
        .gte('created_at', dayStart.toISOString());
      const lowAlertsP = from('v_low_stock_alerts')
        .select('item_id,part_no,description,name_ar,min_qty,qty_on_hand,alert_level,warehouse_name')
        .in('alert_level', ['critical', 'low']).limit(50);
      const stocktakeP = from('stock_counts').select('id', { count: 'exact', head: true })
        .eq('status', 'in_progress');
      const catP = from('items_master').select('category_id');
      const catNamesP = from('item_categories').select('id,name_ar,name_en');
      const recentP = from('inv_transactions')
        .select('id,txn_no,txn_type,txn_date,status,party_name')
        .order('created_at', { ascending: false }).limit(5);

      const [itemsRes, qtyRes, txnRes, alertsRes, stockRes, catItemsRes, catNamesRes, recentRes] = await Promise.all([
        itemsP as unknown as Promise<{ count: number | null }>,
        totQtyP as unknown as Promise<{ data: { qty: number }[] | null }>,
        txnP as unknown as Promise<{ count: number | null }>,
        lowAlertsP as unknown as Promise<{ data: AlertRow[] | null }>,
        stocktakeP as unknown as Promise<{ count: number | null }>,
        catP as unknown as Promise<{ data: { category_id: string | null }[] | null }>,
        catNamesP as unknown as Promise<{ data: { id: string; name_ar: string; name_en: string | null }[] | null }>,
        recentP as unknown as Promise<{ data: RecentTxn[] | null }>,
      ]);

      if (cancelled) return;
      const totalQty = (qtyRes.data ?? []).reduce((s, r) => s + Number(r.qty || 0), 0);
      const allAlerts = alertsRes.data ?? [];
      const nameMap = new Map((catNamesRes.data ?? []).map(c => [c.id, language === 'ar' ? c.name_ar : (c.name_en || c.name_ar)] as const));
      const counts = new Map<string, number>();
      (catItemsRes.data ?? []).forEach(r => {
        const k = r.category_id ? (nameMap.get(r.category_id) ?? '—') : t('wms.dashboard.uncategorized');
        counts.set(k, (counts.get(k) ?? 0) + 1);
      });
      const catBuckets: CatBucket[] = Array.from(counts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
      setStats({
        items: itemsRes.count ?? 0,
        totalQty,
        lowStock: allAlerts.length,
        txnsToday: txnRes.count ?? 0,
        stocktakeInProgress: stockRes.count ?? 0,
      });
      setAlerts(allAlerts.slice(0, 6));
      setCats(catBuckets);
      setRecent(recentRes.data ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [language, t]);

  const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const txnBadge = (type: string) => {
    if (type === 'receipt' || type === 'in') return <WmsBadge tone="green">{t('wms.txn.in')}</WmsBadge>;
    if (type === 'issue' || type === 'out') return <WmsBadge tone="red">{t('wms.txn.out')}</WmsBadge>;
    if (type === 'transfer') return <WmsBadge tone="purple">{t('wms.txn.transfer')}</WmsBadge>;
    if (type === 'adjustment') return <WmsBadge tone="yellow">{t('wms.txn.adjustment')}</WmsBadge>;
    return <WmsBadge>{type}</WmsBadge>;
  };
  const statusBadge = (s: string) => {
    if (s === 'posted') return <WmsBadge tone="green">{t('wms.status.posted')}</WmsBadge>;
    if (s === 'draft') return <WmsBadge tone="yellow">{t('wms.status.draft')}</WmsBadge>;
    if (s === 'cancelled') return <WmsBadge tone="red">{t('wms.status.cancelled')}</WmsBadge>;
    return <WmsBadge>{s}</WmsBadge>;
  };

  const chartOption = useMemo(() => ({
    tooltip: { trigger: 'item' as const },
    legend: { bottom: 0, textStyle: { color: '#9aa3b8' } },
    series: [{
      type: 'pie' as const, radius: ['45%', '70%'], avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: 'transparent', borderWidth: 2 },
      label: { color: '#e8eaf0', fontSize: 11 },
      data: cats.map(c => ({ name: c.name, value: c.count })),
    }],
  }), [cats]);

  return (
    <div>
      <div className="wms-stats-grid" style={{ gridTemplateColumns: 'repeat(5, minmax(0,1fr))' }}>
        <WmsKpi label={t('wms.kpi.items')} value={stats.items} tone="accent" />
        <WmsKpi label={t('wms.kpi.total-qty')} value={Math.round(stats.totalQty).toLocaleString('en-GB')} tone="teal" />
        <WmsKpi label={t('wms.kpi.low-stock')} value={stats.lowStock} tone="red" />
        <WmsKpi label={t('wms.kpi.txns-today')} value={stats.txnsToday} tone="purple" />
        <WmsKpi label={t('wms.kpi.stocktake-in-progress')} value={stats.stocktakeInProgress} tone="yellow" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <WmsCard title={t('wms.dashboard.cat-distribution')} subtitle={t('wms.dashboard.cat-distribution-sub')}>
          {cats.length === 0
            ? <div className="wms-empty"><div className="wms-empty-text">{t('wms.common.no-data')}</div></div>
            : <RTLEChart option={chartOption} style={{ height: '260px' }} />}
        </WmsCard>
        <WmsCard title={t('wms.dashboard.alerts-panel')} subtitle={t('wms.dashboard.alerts-panel-sub')}>
          {alerts.length === 0 ? (
            <div className="wms-empty"><div className="wms-empty-text">{t('wms.alerts.empty')}</div></div>
          ) : (
            <div>
              {alerts.map(a => {
                const min = Number(a.min_qty || 0);
                const cur = Number(a.qty_on_hand || 0);
                const pct = min > 0 ? Math.min(100, Math.max(0, (cur / min) * 100)) : 0;
                const cls = a.alert_level === 'critical' ? 'is-crit' : a.alert_level === 'low' ? 'is-low' : 'is-ok';
                const name = (language === 'ar' ? a.name_ar : null) || a.description || a.part_no;
                return (
                  <div className="wms-alert-row" key={`${a.item_id}-${a.warehouse_name}`}>
                    <div>
                      <div className="wms-alert-name">{name}</div>
                      <div className="wms-alert-meta">
                        {a.part_no} · {a.warehouse_name ?? '—'} · {t('wms.alerts.on-hand')}: {cur} / {t('wms.alerts.min')}: {min}
                      </div>
                    </div>
                    <WmsBadge tone={a.alert_level === 'critical' ? 'red' : 'yellow'}>
                      {t(`wms.alerts.lvl.${a.alert_level}`)}
                    </WmsBadge>
                    <div className="wms-alert-bar">
                      <div className="wms-qbar-track"><div className={`wms-qbar-fill ${cls}`} style={{ width: `${pct}%` }} /></div>
                      <div className="wms-qbar-num">{Math.round(pct)}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </WmsCard>
      </div>

      <WmsCard title={t('wms.dashboard.recent-txns')} subtitle={t('wms.dashboard.recent-txns-sub')}>
        {loading ? (
          <div className="wms-empty"><div className="wms-empty-text">{t('wms.common.loading')}</div></div>
        ) : recent.length === 0 ? (
          <div className="wms-empty">
            <div className="wms-empty-icon">≡</div>
            <div className="wms-empty-text">{t('wms.dashboard.no-recent')}</div>
          </div>
        ) : (
          <div className="wms-table-wrap">
            <table className="wms-table">
              <thead>
                <tr>
                  <th>{t('wms.col.txn-no')}</th>
                  <th>{t('wms.col.type')}</th>
                  <th>{t('wms.col.date')}</th>
                  <th>{t('wms.col.party')}</th>
                  <th>{t('wms.col.status')}</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id}>
                    <td className="wms-td-mono">{r.txn_no}</td>
                    <td>{txnBadge(r.txn_type)}</td>
                    <td>{fmtDate(r.txn_date)}</td>
                    <td className="wms-td-primary">{r.party_name ?? '—'}</td>
                    <td>{statusBadge(r.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </WmsCard>
    </div>
  );
}