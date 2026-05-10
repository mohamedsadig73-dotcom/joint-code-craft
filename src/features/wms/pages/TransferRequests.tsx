import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  WmsCard, WmsListShell, WmsBadge, WmsButton, WmsField, WmsInput, WmsSelect, WmsTextarea,
  type Column, type WmsRowBase,
} from '../components';

interface Row extends WmsRowBase {
  id: string;
  request_no: string;
  request_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'cancelled';
  qty: number;
  reason: string | null;
  notes: string | null;
  from_warehouse_id: string;
  to_warehouse_id: string;
  item_id: string;
  from_warehouses?: { name_ar: string | null; code: string } | null;
  to_warehouses?: { name_ar: string | null; code: string } | null;
  items_master?: { part_no: string; description: string | null; name_ar: string | null } | null;
}

interface WhOpt { id: string; code: string; name_ar: string | null }
interface ItemOpt { id: string; part_no: string; description: string | null }

const STATUS_TONES: Record<Row['status'], 'gray' | 'blue' | 'green' | 'red'> = {
  pending: 'blue', approved: 'green', executed: 'green', rejected: 'red', cancelled: 'gray',
};

export default function Page() {
  const { t, language } = useLanguage();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<WhOpt[]>([]);
  const [items, setItems] = useState<ItemOpt[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ from_warehouse_id: '', to_warehouse_id: '', item_id: '', qty: '1', reason: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const sb = supabase as unknown as { from: (t: string) => unknown };
    type Q = { select: (s: string) => Q; is: (c: string, v: null) => Q; order: (c: string, o: { ascending: boolean }) => Promise<{ data: unknown }> };
    const [r, wh, it] = await Promise.all([
      (sb.from('wms_transfer_requests') as Q)
        .select('id,request_no,request_date,status,qty,reason,notes,from_warehouse_id,to_warehouse_id,item_id')
        .is('deleted_at', null)
        .order('request_date', { ascending: false }) as Promise<{ data: Row[] | null }>,
      (sb.from('warehouses') as Q).select('id,code,name_ar').order('code', { ascending: true }) as Promise<{ data: WhOpt[] | null }>,
      (sb.from('items_master') as Q).select('id,part_no,description').order('part_no', { ascending: true }) as Promise<{ data: ItemOpt[] | null }>,
    ]);
    const whs = wh.data ?? [];
    const its = it.data ?? [];
    const whMap = new Map(whs.map(w => [w.id, w]));
    const itMap = new Map(its.map(i => [i.id, i]));
    const enriched = (r.data ?? []).map(x => ({
      ...x,
      from_warehouses: whMap.get(x.from_warehouse_id) ?? null,
      to_warehouses: whMap.get(x.to_warehouse_id) ?? null,
      items_master: itMap.get(x.item_id) ? { part_no: itMap.get(x.item_id)!.part_no, description: itMap.get(x.item_id)!.description, name_ar: null } : null,
    }));
    setRows(enriched);
    setWarehouses(whs);
    setItems(its);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const submit = async () => {
    if (!form.from_warehouse_id || !form.to_warehouse_id || !form.item_id || Number(form.qty) <= 0) {
      toast.error(t('wms.transfer-requests.err-fill'));
      return;
    }
    if (form.from_warehouse_id === form.to_warehouse_id) {
      toast.error(t('wms.transfer-requests.err-same-wh'));
      return;
    }
    const u = await supabase.auth.getUser();
    const uid = u.data.user?.id;
    if (!uid) { toast.error(t('wms.common.loading')); return; }
    const { error } = await (supabase as unknown as { from: (t: string) => { insert: (v: object) => Promise<{ error: { message: string } | null }> } })
      .from('wms_transfer_requests')
      .insert({
        from_warehouse_id: form.from_warehouse_id,
        to_warehouse_id: form.to_warehouse_id,
        item_id: form.item_id,
        qty: Number(form.qty),
        reason: form.reason || null,
        requested_by: uid,
      });
    if (error) { toast.error(error.message); return; }
    toast.success(t('wms.transfer-requests.toast-created'));
    setShowForm(false);
    setForm({ from_warehouse_id: '', to_warehouse_id: '', item_id: '', qty: '1', reason: '' });
    void load();
  };

  const decide = async (row: Row, status: 'approved' | 'rejected') => {
    const u = await supabase.auth.getUser();
    const uid = u.data.user?.id;
    const { error } = await (supabase as unknown as { from: (t: string) => { update: (v: object) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> } } })
      .from('wms_transfer_requests')
      .update({ status, approved_by: uid, approved_at: new Date().toISOString() })
      .eq('id', row.id);
    if (error) { toast.error(error.message); return; }
    toast.success(t(status === 'approved' ? 'wms.approvals.approve' : 'wms.approvals.reject'));
    void load();
  };

  const execute = async (row: Row) => {
    const u = await supabase.auth.getUser();
    const uid = u.data.user?.id;
    if (!uid) return;
    const sb = supabase as unknown as { from: (t: string) => { insert: (v: object) => { select: (c: string) => { single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> } } } };
    const { data: txn, error } = await sb.from('inv_transactions').insert({
      txn_type: 'transfer',
      txn_date: new Date().toISOString().slice(0, 10),
      status: 'draft',
      from_warehouse_id: row.from_warehouse_id,
      to_warehouse_id: row.to_warehouse_id,
      reference: row.request_no,
      notes: t('wms.transfer-requests.exec-note') + ': ' + row.request_no,
      created_by: uid,
    }).select('id').single();
    if (error || !txn) { toast.error(error?.message ?? 'error'); return; }
    const { error: lineErr } = await (supabase as unknown as { from: (t: string) => { insert: (v: object) => Promise<{ error: { message: string } | null }> } })
      .from('inv_transaction_items')
      .insert({ transaction_id: txn.id, line_no: 1, item_id: row.item_id, qty: row.qty });
    if (lineErr) { toast.error(lineErr.message); return; }
    const { error: postErr } = await (supabase as unknown as { from: (t: string) => { update: (v: object) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> } } })
      .from('inv_transactions')
      .update({ status: 'posted' })
      .eq('id', txn.id);
    if (postErr) { toast.error(postErr.message); return; }
    await (supabase as unknown as { from: (t: string) => { update: (v: object) => { eq: (c: string, v: string) => Promise<unknown> } } })
      .from('wms_transfer_requests')
      .update({ status: 'executed', executed_txn_id: txn.id })
      .eq('id', row.id);
    toast.success(t('wms.transfer-requests.toast-executed'));
    void load();
  };

  const whName = (w: WhOpt | null | undefined) => w ? (language === 'ar' ? (w.name_ar || w.code) : w.code) : '—';
  const itemName = (it: { part_no: string; description: string | null } | null | undefined) => it ? `${it.part_no} — ${it.description ?? ''}` : '—';

  const cols: Column<Row>[] = [
    { key: 'no', header: t('wms.transfer-requests.no'), className: 'wms-td-mono', render: r => r.request_no },
    { key: 'date', header: t('wms.txn.date'), render: r => new Date(r.request_date).toLocaleDateString('en-GB') },
    { key: 'item', header: t('wms.col.name'), className: 'wms-td-primary', render: r => itemName(r.items_master) },
    { key: 'qty', header: t('wms.col.qty'), className: 'wms-td-mono', render: r => String(r.qty) },
    { key: 'from', header: t('wms.transfer-requests.from'), render: r => whName(r.from_warehouses) },
    { key: 'to', header: t('wms.transfer-requests.to'), render: r => whName(r.to_warehouses) },
    { key: 'st', header: t('wms.col.status'), render: r => <WmsBadge tone={STATUS_TONES[r.status]}>{t('wms.transfer-requests.status.' + r.status)}</WmsBadge> },
    { key: 'act', header: '', render: r => (
      <div className="flex gap-2 justify-end" onClick={e => e.stopPropagation()}>
        {r.status === 'pending' && <>
          <WmsButton size="sm" variant="primary" onClick={() => decide(r, 'approved')}>{t('wms.approvals.approve')}</WmsButton>
          <WmsButton size="sm" variant="ghost" onClick={() => decide(r, 'rejected')}>{t('wms.approvals.reject')}</WmsButton>
        </>}
        {r.status === 'approved' && (
          <WmsButton size="sm" variant="primary" onClick={() => execute(r)}>{t('wms.transfer-requests.execute')}</WmsButton>
        )}
      </div>
    ) },
  ];

  return (
    <WmsCard
      title={t('wms.nav.transfer-requests')}
      subtitle={t('wms.transfer-requests.sub')}
      actions={<WmsButton variant="primary" size="sm" onClick={() => setShowForm(s => !s)}>
        {showForm ? t('wms.form.cancel') : '+ ' + t('wms.form.new')}
      </WmsButton>}
    >
      {showForm && (
        <div style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid hsl(var(--wms-border))', borderRadius: '0.5rem' }}>
          <div className="wms-form-grid">
            <WmsField label={t('wms.transfer-requests.from')}>
              <WmsSelect value={form.from_warehouse_id} onChange={e => setForm({ ...form, from_warehouse_id: e.target.value })}>
                <option value="">—</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{whName(w)}</option>)}
              </WmsSelect>
            </WmsField>
            <WmsField label={t('wms.transfer-requests.to')}>
              <WmsSelect value={form.to_warehouse_id} onChange={e => setForm({ ...form, to_warehouse_id: e.target.value })}>
                <option value="">—</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{whName(w)}</option>)}
              </WmsSelect>
            </WmsField>
            <WmsField label={t('wms.col.name')}>
              <WmsSelect value={form.item_id} onChange={e => setForm({ ...form, item_id: e.target.value })}>
                <option value="">—</option>
                {items.slice(0, 500).map(i => <option key={i.id} value={i.id}>{i.part_no} — {i.description ?? ''}</option>)}
              </WmsSelect>
            </WmsField>
            <WmsField label={t('wms.col.qty')}>
              <WmsInput type="number" min="1" value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })} />
            </WmsField>
            <WmsField label={t('wms.transfer-requests.reason')}>
              <WmsTextarea rows={2} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
            </WmsField>
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
            <WmsButton variant="primary" onClick={submit}>{t('wms.form.save')}</WmsButton>
          </div>
        </div>
      )}
      <WmsListShell<Row> rows={rows} columns={cols} loading={loading}
        searchKeys={['request_no']} searchPlaceholder={t('wms.common.search-placeholder')} />
    </WmsCard>
  );
}