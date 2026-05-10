import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { WmsCard, WmsEmpty, WmsListShell, WmsBadge, WmsButton, type Column } from '../components';
import { toast } from 'sonner';

interface Row extends Record<string, unknown> {
  id?: string;
  txn_no?: string;
  txn_type?: string;
  txn_date?: string;
  status?: string;
  reference?: string | null;
}

export default function Page() {
  const { t, language } = useLanguage();
  const nav = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const sb = supabase as unknown as {
      from: (t: string) => { select: (s: string) => { eq: (c: string, v: string) => { is: (c: string, v: null) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: Row[] | null; error: unknown }> } } } };
    };
    const res = await sb.from('inv_transactions')
      .select('id,txn_no,txn_type,txn_date,status,reference')
      .eq('status', 'draft')
      .is('deleted_at', null)
      .order('txn_date', { ascending: false });
    setRows((res.data ?? []) as Row[]);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const post = async (id: string) => {
    const u = await (supabase.auth.getUser() as unknown as Promise<{ data: { user: { id: string } | null } }>);
    const userId = u.data.user?.id;
    const { error } = await (supabase as unknown as { from: (t: string) => { update: (v: object) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> } } })
      .from('inv_transactions')
      .update({ status: 'posted', posted_at: new Date().toISOString(), posted_by: userId })
      .eq('id', id);
    if (error) toast.error(error.message); else { toast.success(t('wms.approvals.posted')); void load(); }
  };
  const reject = async (id: string) => {
    const { error } = await (supabase as unknown as { from: (t: string) => { update: (v: object) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> } } })
      .from('inv_transactions')
      .update({ status: 'cancelled' })
      .eq('id', id);
    if (error) toast.error(error.message); else { toast.success(t('wms.approvals.rejected')); void load(); }
  };

  const cols: Column<Row>[] = [
    { key: 'txn_no', label: t('wms.txn.no') },
    { key: 'txn_type', label: t('wms.txn.type'), render: (r) => <WmsBadge>{t('wms.txn.type.' + (r.txn_type || ''))}</WmsBadge> },
    { key: 'txn_date', label: t('wms.txn.date'), render: (r) => r.txn_date ? new Date(r.txn_date).toLocaleDateString(language === 'ar' ? 'en-GB' : 'en-GB') : '—' },
    { key: 'reference', label: t('wms.txn.ref'), render: (r) => r.reference || '—' },
    { key: 'actions', label: '', render: (r) => (
      <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
        <WmsButton variant="primary" onClick={() => r.id && post(r.id)}>{t('wms.approvals.approve')}</WmsButton>
        <WmsButton variant="ghost" onClick={() => r.id && reject(r.id)}>{t('wms.approvals.reject')}</WmsButton>
      </div>
    ) },
  ];

  if (!loading && rows.length === 0)
    return <WmsCard title={t('wms.nav.approvals')} subtitle={t('wms.approvals.sub')}>
      <WmsEmpty icon="◐" title={t('wms.approvals.empty')} hint={t('wms.approvals.hint')} />
    </WmsCard>;

  return <WmsCard title={t('wms.nav.approvals')} subtitle={t('wms.approvals.sub')}>
    <WmsListShell<Row>
      rows={rows}
      columns={cols}
      loading={loading}
      onRowClick={(r) => r.id && nav(`/wms/txn/${r.txn_type}/${r.id}`)}
    />
  </WmsCard>;
}
