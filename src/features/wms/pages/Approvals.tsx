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
    // Capture signer trail (recipient signature)
    const signerName = window.prompt(t('wms.approvals.prompt-signer-name'), '');
    if (signerName === null) return; // cancelled
    const signerTitle = window.prompt(t('wms.approvals.prompt-signer-title'), '') ?? '';
    const signerEmpNo = window.prompt(t('wms.approvals.prompt-signer-empno'), '') ?? '';
    const { error } = await (supabase as unknown as { from: (t: string) => { update: (v: object) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> } } })
      .from('inv_transactions')
      .update({ status: 'posted', posted_at: new Date().toISOString(), posted_by: userId })
      .eq('id', id);
    if (error) { toast.error(error.message); return; }
    // Write signature trail (best-effort, non-blocking)
    await (supabase as unknown as { from: (t: string) => { insert: (v: object) => Promise<{ error: { message: string } | null }> } })
      .from('wms_approvals')
      .insert({
        transaction_id: id,
        status: 'approved',
        signer_name: signerName.trim() || null,
        signer_title: signerTitle.trim() || null,
        signer_employee_no: signerEmpNo.trim() || null,
        decided_by: userId,
        decided_at: new Date().toISOString(),
      });
    toast.success(t('wms.approvals.posted'));
    void load();
  };
  const reject = async (id: string) => {
    const reason = window.prompt(t('wms.approvals.prompt-reject-reason'), '');
    if (reason === null) return;
    const u = await (supabase.auth.getUser() as unknown as Promise<{ data: { user: { id: string } | null } }>);
    const userId = u.data.user?.id;
    const { error } = await (supabase as unknown as { from: (t: string) => { update: (v: object) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> } } })
      .from('inv_transactions')
      .update({ status: 'cancelled' })
      .eq('id', id);
    if (error) { toast.error(error.message); return; }
    await (supabase as unknown as { from: (t: string) => { insert: (v: object) => Promise<{ error: { message: string } | null }> } })
      .from('wms_approvals')
      .insert({
        transaction_id: id,
        status: 'rejected',
        notes: reason || null,
        decided_by: userId,
        decided_at: new Date().toISOString(),
      });
    toast.success(t('wms.approvals.rejected'));
    void load();
  };

  const cols: Column<Row>[] = [
    { key: 'txn_no', header: t('wms.txn.no'), render: (r) => r.txn_no || '—' },
    { key: 'txn_type', header: t('wms.txn.type'), render: (r) => <WmsBadge>{t('wms.txn.type.' + (r.txn_type || ''))}</WmsBadge> },
    { key: 'txn_date', header: t('wms.txn.date'), render: (r) => r.txn_date ? new Date(r.txn_date).toLocaleDateString(language === 'ar' ? 'en-GB' : 'en-GB') : '—' },
    { key: 'reference', header: t('wms.txn.ref'), render: (r) => r.reference || '—' },
    { key: 'actions', header: '', render: (r) => (
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
