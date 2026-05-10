import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { WmsListShell, WmsBadge, WmsButton, type Column, type WmsRowBase } from '../components';

interface Txn extends WmsRowBase {
  id: string; txn_no: string; txn_type: string; txn_date: string;
  status: string; party_name: string | null; reference: string | null;
}

export function TxnListPage({ txnTypes, titleKey, subtitleKey, newType }: {
  txnTypes: string[]; titleKey: string; subtitleKey?: string;
  /** Used to build the editor route /wms/txn/:newType/new — defaults to first txnType. */
  newType?: 'in' | 'out' | 'transfer' | 'adjustment';
}) {
  const { t } = useLanguage();
  const nav = useNavigate();
  const [rows, setRows] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const sb = supabase as unknown as { from: (t: string) => unknown };
      type C = {
        select: (s: string) => C; in: (c: string, v: string[]) => C;
        is: (c: string, v: null) => C;
        order: (c: string, o: { ascending: boolean }) => Promise<{ data: Txn[] | null }>;
      };
      const q = (sb.from('inv_transactions') as unknown as C)
        .select('id,txn_no,txn_type,txn_date,status,party_name,reference')
        .in('txn_type', txnTypes)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      const res = await q;
      if (!cancelled) { setRows(res.data ?? []); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [txnTypes.join(',')]);

  const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-GB');
  const stat = (s: string) => {
    if (s === 'posted') return <WmsBadge tone="green">{t('wms.status.posted')}</WmsBadge>;
    if (s === 'draft') return <WmsBadge tone="yellow">{t('wms.status.draft')}</WmsBadge>;
    if (s === 'cancelled') return <WmsBadge tone="red">{t('wms.status.cancelled')}</WmsBadge>;
    return <WmsBadge>{s}</WmsBadge>;
  };
  const cols: Column<Txn>[] = [
    { key: 'no', header: t('wms.col.txn-no'), className: 'wms-td-mono', render: r => r.txn_no },
    { key: 'date', header: t('wms.col.date'), render: r => fmtDate(r.txn_date) },
    { key: 'party', header: t('wms.col.party'), className: 'wms-td-primary', render: r => r.party_name ?? '—' },
    { key: 'ref', header: t('wms.col.reference'), render: r => r.reference ?? '—' },
    { key: 'status', header: t('wms.col.status'), render: r => stat(r.status) },
  ];

  return <WmsListShell<Txn>
    title={t(titleKey)} subtitle={subtitleKey ? t(subtitleKey) : undefined}
    rows={rows} columns={cols} loading={loading}
    searchKeys={['txn_no', 'party_name', 'reference']}
    searchPlaceholder={t('wms.common.search-placeholder')}
    onRowClick={(r) => nav(`/wms/txn/${r.txn_type === 'receipt' ? 'in' : r.txn_type}/${r.id}`)}
    rightActions={
      <WmsButton size="sm" variant="primary"
        onClick={() => nav(`/wms/txn/${newType ?? (txnTypes[0] === 'receipt' ? 'in' : txnTypes[0])}/new`)}
      >+ {t('wms.form.new')}</WmsButton>
    }
  />;
}
