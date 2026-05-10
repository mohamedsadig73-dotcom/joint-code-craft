import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { WmsCard, WmsEmpty, WmsListShell, WmsBadge, WmsButton, WmsField, WmsInput, WmsSelect, type Column } from '../components';

interface Row extends Record<string, unknown> {
  item_id?: string;
  part_no?: string;
  description?: string;
  name_ar?: string;
  min_qty?: number;
  reorder_qty?: number;
  warehouse_name?: string;
  qty_on_hand?: number;
  alert_level?: string;
  id?: string;
}

interface Rule extends Record<string, unknown> {
  id: string;
  kind: 'min_stock' | 'max_stock' | 'expiry';
  threshold_qty: number | null;
  expiry_days_ahead: number | null;
  is_active: boolean;
  notes: string | null;
}

export default function Page() {
  const { t, language } = useLanguage();
  const nav = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'live' | 'rules'>('live');
  const [rules, setRules] = useState<Rule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ kind: 'min_stock' as Rule['kind'], threshold_qty: '', expiry_days_ahead: '30', notes: '' });

  useEffect(() => {
    void (async () => {
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: Row[] | null }> } } };
      const res = await sb.from('v_low_stock_alerts').select('*').order('alert_level', { ascending: true });
      const mapped = (res.data ?? []).map((r) => ({ ...r, id: `${r.item_id}-${r.warehouse_name}` }));
      setRows(mapped);
      setLoading(false);
    })();
  }, []);

  const loadRules = useCallback(async () => {
    const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: Rule[] | null }> } } };
    const res = await sb.from('wms_alert_rules').select('id,kind,threshold_qty,expiry_days_ahead,is_active,notes').order('created_at', { ascending: false });
    setRules(res.data ?? []);
  }, []);
  useEffect(() => { if (tab === 'rules') void loadRules(); }, [tab, loadRules]);

  const addRule = async () => {
    const u = await supabase.auth.getUser();
    const uid = u.data.user?.id;
    const payload: Record<string, unknown> = {
      kind: form.kind,
      is_active: true,
      notes: form.notes || null,
      created_by: uid,
    };
    if (form.kind === 'expiry') payload.expiry_days_ahead = Number(form.expiry_days_ahead) || 30;
    else payload.threshold_qty = Number(form.threshold_qty) || 0;
    const { error } = await (supabase as unknown as { from: (t: string) => { insert: (v: object) => Promise<{ error: { message: string } | null }> } })
      .from('wms_alert_rules').insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(t('wms.alerts.rules.toast-created'));
    setShowForm(false);
    setForm({ kind: 'min_stock', threshold_qty: '', expiry_days_ahead: '30', notes: '' });
    void loadRules();
  };

  const toggleRule = async (r: Rule) => {
    const { error } = await (supabase as unknown as { from: (t: string) => { update: (v: object) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> } } })
      .from('wms_alert_rules').update({ is_active: !r.is_active }).eq('id', r.id);
    if (error) toast.error(error.message); else void loadRules();
  };

  const deleteRule = async (id: string) => {
    const { error } = await (supabase as unknown as { from: (t: string) => { delete: () => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> } } })
      .from('wms_alert_rules').delete().eq('id', id);
    if (error) toast.error(error.message); else void loadRules();
  };

  const cols: Column<Row>[] = [
    { key: 'part_no', header: t('wms.items.part-no'), render: (r) => r.part_no || '—' },
    { key: 'desc', header: t('wms.items.description'), render: (r) => language === 'ar' ? (r.name_ar || r.description) : (r.description || r.name_ar) },
    { key: 'wh', header: t('wms.nav.warehouses'), render: (r) => r.warehouse_name || '—' },
    { key: 'qty', header: t('wms.alerts.on-hand'), render: (r) => String(r.qty_on_hand ?? 0) },
    { key: 'min', header: t('wms.alerts.min'), render: (r) => String(r.min_qty ?? 0) },
    { key: 'lvl', header: t('wms.alerts.level'), render: (r) => {
      const tone: 'red' | 'yellow' | 'blue' = r.alert_level === 'critical' ? 'red' : r.alert_level === 'low' ? 'yellow' : 'blue';
      return <WmsBadge tone={tone}>{t('wms.alerts.lvl.' + (r.alert_level || 'ok'))}</WmsBadge>;
    } },
  ];

  const ruleCols: Column<Rule>[] = [
    { key: 'kind', header: t('wms.alerts.rules.kind'), render: r => <WmsBadge>{t('wms.alerts.rules.kind.' + r.kind)}</WmsBadge> },
    { key: 'thr', header: t('wms.alerts.rules.threshold'), render: r => r.kind === 'expiry' ? `${r.expiry_days_ahead ?? 30} ${t('wms.alerts.rules.days')}` : String(r.threshold_qty ?? 0) },
    { key: 'notes', header: t('wms.col.notes'), render: r => r.notes ?? '—' },
    { key: 'st', header: t('wms.col.status'), render: r => <WmsBadge tone={r.is_active ? 'green' : 'gray'}>{r.is_active ? t('wms.status.active') : t('wms.status.inactive')}</WmsBadge> },
    { key: 'act', header: '', render: r => (
      <div className="flex gap-2 justify-end" onClick={e => e.stopPropagation()}>
        <WmsButton size="sm" variant="ghost" onClick={() => toggleRule(r)}>{r.is_active ? t('wms.action.disable') : t('wms.action.enable')}</WmsButton>
        <WmsButton size="sm" variant="ghost" onClick={() => deleteRule(r.id)}>{t('wms.action.delete')}</WmsButton>
      </div>
    ) },
  ];

  return <WmsCard title={t('wms.nav.alerts')} subtitle={t('wms.alerts.sub')}>
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
      <WmsButton size="sm" variant={tab === 'live' ? 'primary' : 'ghost'} onClick={() => setTab('live')}>{t('wms.alerts.tab.live')}</WmsButton>
      <WmsButton size="sm" variant={tab === 'rules' ? 'primary' : 'ghost'} onClick={() => setTab('rules')}>{t('wms.alerts.tab.rules')}</WmsButton>
    </div>

    {tab === 'live' && (
      rows.length === 0 && !loading
        ? <WmsEmpty icon="◬" title={t('wms.alerts.empty')} hint={t('wms.alerts.hint')} />
        : <WmsListShell<Row> rows={rows} columns={cols} loading={loading}
            onRowClick={(r) => r.item_id && nav(`/wms/items?focus=${r.item_id}`)} />
    )}

    {tab === 'rules' && (
      <>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
          <WmsButton size="sm" variant="primary" onClick={() => setShowForm(s => !s)}>
            {showForm ? t('wms.form.cancel') : '+ ' + t('wms.alerts.rules.add')}
          </WmsButton>
        </div>
        {showForm && (
          <div style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid hsl(var(--wms-border))', borderRadius: '0.5rem' }}>
            <div className="wms-form-grid">
              <WmsField label={t('wms.alerts.rules.kind')}>
                <WmsSelect value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value as Rule['kind'] })}>
                  <option value="min_stock">{t('wms.alerts.rules.kind.min_stock')}</option>
                  <option value="max_stock">{t('wms.alerts.rules.kind.max_stock')}</option>
                  <option value="expiry">{t('wms.alerts.rules.kind.expiry')}</option>
                </WmsSelect>
              </WmsField>
              {form.kind === 'expiry' ? (
                <WmsField label={t('wms.alerts.rules.days-ahead')}>
                  <WmsInput type="number" min="1" value={form.expiry_days_ahead}
                    onChange={e => setForm({ ...form, expiry_days_ahead: e.target.value })} />
                </WmsField>
              ) : (
                <WmsField label={t('wms.alerts.rules.threshold')}>
                  <WmsInput type="number" min="0" value={form.threshold_qty}
                    onChange={e => setForm({ ...form, threshold_qty: e.target.value })} />
                </WmsField>
              )}
              <WmsField label={t('wms.col.notes')}>
                <WmsInput value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </WmsField>
            </div>
            <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
              <WmsButton variant="primary" onClick={addRule}>{t('wms.form.save')}</WmsButton>
            </div>
          </div>
        )}
        {rules.length === 0
          ? <WmsEmpty icon="⚙" title={t('wms.alerts.rules.empty')} hint={t('wms.alerts.rules.hint')} />
          : <WmsListShell<Rule> rows={rules} columns={ruleCols} />
        }
      </>
    )}
  </WmsCard>;
}
