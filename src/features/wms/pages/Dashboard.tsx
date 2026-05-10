import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { WmsCard, WmsKpi, WmsBadge } from '../components';

interface Stats {
  items: number;
  warehouses: number;
  txnsThisMonth: number;
  lowStock: number;
}
interface RecentTxn {
  id: string;
  txn_no: string;
  txn_type: string;
  txn_date: string;
  status: string;
  party_name: string | null;
}

export default function WmsDashboardPage() {
  const { t, language } = useLanguage();
  const [stats, setStats] = useState<Stats>({ items: 0, warehouses: 0, txnsThisMonth: 0, lowStock: 0 });
  const [recent, setRecent] = useState<RecentTxn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const sb = supabase as unknown as {
        from: (t: string) => unknown;
      };
      type AnyChain = {
        select: (s: string, o?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) => AnyChain;
        gte: (c: string, v: unknown) => AnyChain;
        order: (c: string, o: { ascending: boolean }) => AnyChain;
        limit: (n: number) => Promise<{ data: unknown[] | null; count: number | null; error: unknown }>;
        then: Promise<{ data: unknown[] | null; count: number | null; error: unknown }>['then'];
      };
      const from = (table: string) => sb.from(table) as unknown as AnyChain;

      const itemsP = from('items_master').select('id', { count: 'exact', head: true });
      const whP = from('warehouses').select('id', { count: 'exact', head: true });
      const txnP = from('inv_transactions').select('id', { count: 'exact', head: true })
        .gte('created_at', monthStart.toISOString());
      const lowP = from('items_master').select('id', { count: 'exact', head: true })
        .gte('min_qty', 0.01);
      const recentP = from('inv_transactions')
        .select('id,txn_no,txn_type,txn_date,status,party_name')
        .order('created_at', { ascending: false })
        .limit(8);

      const [itemsRes, whRes, txnRes, lowRes, recentRes] = await Promise.all([
        itemsP as unknown as Promise<{ count: number | null }>,
        whP as unknown as Promise<{ count: number | null }>,
        txnP as unknown as Promise<{ count: number | null }>,
        lowP as unknown as Promise<{ count: number | null }>,
        recentP as Promise<{ data: RecentTxn[] | null }>,
      ]);

      if (cancelled) return;
      setStats({
        items: itemsRes.count ?? 0,
        warehouses: whRes.count ?? 0,
        txnsThisMonth: txnRes.count ?? 0,
        lowStock: lowRes.count ?? 0,
      });
      setRecent(recentRes.data ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString(language === 'ar' ? 'en-GB' : 'en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });

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

  return (
    <div>
      <div className="wms-stats-grid">
        <WmsKpi label={t('wms.kpi.items')} value={stats.items} tone="accent" />
        <WmsKpi label={t('wms.kpi.warehouses')} value={stats.warehouses} tone="teal" />
        <WmsKpi label={t('wms.kpi.txns-month')} value={stats.txnsThisMonth} tone="purple" />
        <WmsKpi label={t('wms.kpi.low-stock')} value={stats.lowStock} tone="yellow" />
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
