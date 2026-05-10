import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  WmsCard, WmsButton, WmsField, WmsInput, WmsSelect, WmsTextarea,
} from '../components';
import { wmsPrintHTML } from '../lib/print';
import { buildTxnDocHTML } from '../lib/txnDocHTML';

type TxnType = 'in' | 'out' | 'transfer' | 'adjustment';

interface Header {
  id?: string;
  txn_no: string;
  txn_type: TxnType;
  txn_date: string;
  status: 'draft' | 'posted' | 'cancelled';
  party_name: string;
  reference: string;
  notes: string;
  from_warehouse_id: string | null;
  to_warehouse_id: string | null;
}

interface Recipient {
  is_delegated: boolean;
  recipient_name: string;
  recipient_title: string;
  recipient_empno: string;
  receipt_time: string;
}

const REC_MARK = '[[REC_JSON]]';
const stripRec = (notes: string) => notes.split(REC_MARK)[0]?.trim() ?? '';
const extractRec = (notes: string | null | undefined): Recipient => {
  const blank: Recipient = { is_delegated: false, recipient_name: '', recipient_title: '', recipient_empno: '', receipt_time: '' };
  if (!notes) return blank;
  const m = notes.split(REC_MARK)[1];
  if (!m) return blank;
  try { return { ...blank, ...JSON.parse(m) }; } catch { return blank; }
};
const mergeRec = (notes: string, r: Recipient): string => {
  const base = stripRec(notes);
  const hasAny = r.is_delegated || r.recipient_name || r.recipient_title || r.recipient_empno || r.receipt_time;
  return hasAny ? `${base}${REC_MARK}${JSON.stringify(r)}` : base;
};

interface Line {
  id?: string;
  line_no: number;
  item_id: string;
  qty: number;
  unit: string;
  notes: string;
}

interface WhRow { id: string; code: string; name_ar: string; name_en: string | null; }
interface ItemRow { id: string; part_no: string; description: string; default_unit: string; name_ar: string | null; name_en: string | null; }

const titleKey = (t: TxnType) =>
  t === 'in' ? 'wms.nav.receipts' : t === 'out' ? 'wms.nav.issues'
  : t === 'transfer' ? 'wms.nav.transfers' : 'wms.txn.adjustment';

const blankLine = (n: number): Line =>
  ({ line_no: n, item_id: '', qty: 1, unit: 'PCS', notes: '' });

export default function TxnEditor() {
  const { type, id } = useParams<{ type: TxnType; id: string }>();
  const nav = useNavigate();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const txnType = (type ?? 'in') as TxnType;
  const isNew = !id || id === 'new';

  const [h, setH] = useState<Header>({
    txn_no: '', txn_type: txnType, txn_date: new Date().toISOString().slice(0, 10),
    status: 'draft', party_name: '', reference: '', notes: '',
    from_warehouse_id: null, to_warehouse_id: null,
  });
  const [rec, setRec] = useState<Recipient>({
    is_delegated: false, recipient_name: '', recipient_title: '', recipient_empno: '',
    receipt_time: new Date().toTimeString().slice(0, 5),
  });
  const [lines, setLines] = useState<Line[]>([blankLine(1)]);
  const [warehouses, setWarehouses] = useState<WhRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [busy, setBusy] = useState(false);

  const sb = supabase as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (c: string, v: string) => Promise<{ data: unknown[] | null; error: unknown }>;
        order: (c: string, o: { ascending: boolean }) => Promise<{ data: unknown[] | null; error: unknown }>;
      } & Promise<{ data: unknown[] | null; error: unknown }>;
      insert: (p: object) => { select: () => { single: () => Promise<{ data: { id: string } | null; error: unknown }> } };
      update: (p: object) => { eq: (c: string, v: string) => Promise<{ error: unknown }> };
      delete: () => { eq: (c: string, v: string) => Promise<{ error: unknown }> };
    };
  };

  // Load reference data
  useEffect(() => {
    let off = false;
    (async () => {
      const wh = await sb.from('warehouses').select('id,code,name_ar,name_en').order('code', { ascending: true });
      const it = await sb.from('items_master').select('id,part_no,description,default_unit,name_ar,name_en').order('part_no', { ascending: true });
      if (off) return;
      setWarehouses((wh.data as WhRow[]) ?? []);
      setItems((it.data as ItemRow[]) ?? []);
    })();
    return () => { off = true; };
  }, [sb]);

  // Load existing txn
  useEffect(() => {
    if (isNew || !id) return;
    let off = false;
    (async () => {
      const txn = await sb.from('inv_transactions')
        .select('id,txn_no,txn_type,txn_date,status,party_name,reference,notes,from_warehouse_id,to_warehouse_id')
        .eq('id', id);
      const li = await sb.from('inv_transaction_items')
        .select('id,line_no,item_id,qty,unit,notes')
        .eq('transaction_id', id);
      if (off) return;
      const row = (txn.data as Header[] | null)?.[0];
      if (row) {
        const recovered = extractRec(row.notes);
        setH({ ...row, party_name: row.party_name ?? '', reference: row.reference ?? '', notes: stripRec(row.notes ?? '') });
        setRec(recovered);
      }
      const ls = ((li.data as Line[] | null) ?? []).sort((a, b) => a.line_no - b.line_no);
      if (ls.length) setLines(ls.map(l => ({ ...l, notes: l.notes ?? '', unit: l.unit ?? 'PCS' })));
    })();
    return () => { off = true; };
  }, [id, isNew, sb]);

  const itemLabel = useCallback((it: ItemRow) => {
    const name = (language === 'ar' ? it.name_ar : it.name_en) || it.description;
    return `${it.part_no} — ${name}`;
  }, [language]);

  const updateLine = (i: number, patch: Partial<Line>) =>
    setLines(s => s.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  const addLine = () => setLines(s => [...s, blankLine(s.length + 1)]);
  const removeLine = (i: number) => setLines(s => s.filter((_, idx) => idx !== i).map((l, idx) => ({ ...l, line_no: idx + 1 })));

  const validate = (): string | null => {
    if (!h.txn_no.trim()) return t('wms.form.err-txn-no');
    if (!h.txn_date) return t('wms.form.err-date');
    if (txnType !== 'transfer' && !h.party_name.trim()) return t('wms.form.err-party');
    if (txnType === 'in' && !h.to_warehouse_id) return t('wms.form.err-to-wh');
    if (txnType === 'out' && !h.from_warehouse_id) return t('wms.form.err-from-wh');
    if (txnType === 'transfer' && (!h.from_warehouse_id || !h.to_warehouse_id)) return t('wms.form.err-wh');
    const valid = lines.filter(l => l.item_id && l.qty > 0);
    if (!valid.length) return t('wms.form.err-lines');
    return null;
  };

  const persist = useCallback(async (postNow: boolean): Promise<string | null> => {
    const err = validate();
    if (err) { toast({ title: err, variant: 'destructive' }); return null; }
    setBusy(true);
    try {
      const payload = {
        txn_no: h.txn_no.trim(), txn_type: txnType, txn_date: h.txn_date,
        status: postNow ? 'posted' : 'draft',
        party_name: h.party_name || null, reference: h.reference || null,
        notes: mergeRec(h.notes, rec) || null,
        from_warehouse_id: h.from_warehouse_id, to_warehouse_id: h.to_warehouse_id,
        ...(postNow ? { posted_at: new Date().toISOString() } : {}),
      };
      let txnId = h.id;
      if (isNew || !txnId) {
        const { data, error } = await sb.from('inv_transactions').insert(payload).select().single();
        if (error || !data) throw error ?? new Error('insert failed');
        txnId = data.id;
      } else {
        const { error } = await sb.from('inv_transactions').update(payload).eq('id', txnId);
        if (error) throw error;
        await sb.from('inv_transaction_items').delete().eq('transaction_id', txnId);
      }
      const linePayload = lines.filter(l => l.item_id && l.qty > 0).map(l => ({
        transaction_id: txnId!, line_no: l.line_no,
        item_id: l.item_id, qty: l.qty, unit: l.unit || null, notes: l.notes || null,
      }));
      if (linePayload.length) {
        const { error } = await sb.from('inv_transaction_items').insert(linePayload as unknown as object).select().single();
        // multi-row insert through .insert(array) — `.single()` is a no-op safety net
        if (error) console.warn(error);
      }
      toast({ title: postNow ? t('wms.form.toast-posted') : t('wms.form.toast-saved') });
      setH(s => ({ ...s, id: txnId, status: postNow ? 'posted' : 'draft' }));
      return txnId ?? null;
    } catch (e) {
      console.error(e);
      toast({ title: t('wms.form.toast-error'), variant: 'destructive' });
      return null;
    } finally {
      setBusy(false);
    }
  }, [h, lines, txnType, isNew, sb, t, toast]);

  const print = () => {
    const whName = (id: string | null) => {
      const w = warehouses.find(w => w.id === id);
      return w ? ((language === 'ar' ? w.name_ar : (w.name_en || w.name_ar))) : null;
    };
    const itemMap = new Map(items.map(i => [i.id, i]));
    const html = buildTxnDocHTML(
      {
        title: t(titleKey(txnType)),
        txn_no: h.txn_no, txn_date: h.txn_date,
        party_name: h.party_name, reference: h.reference,
        status: t(`wms.status.${h.status}`),
        notes: h.notes,
        from_warehouse: whName(h.from_warehouse_id),
        to_warehouse: whName(h.to_warehouse_id),
        recipient_name: rec.recipient_name,
        recipient_title: rec.recipient_title,
        recipient_empno: rec.recipient_empno,
        receipt_time: rec.receipt_time,
        is_delegated: rec.is_delegated,
      },
      lines.filter(l => l.item_id).map(l => {
        const it = itemMap.get(l.item_id);
        return {
          line_no: l.line_no, part_no: it?.part_no, qty: l.qty, unit: l.unit, notes: l.notes,
          description: it ? ((language === 'ar' ? it.name_ar : it.name_en) || it.description) : '—',
        };
      }),
      {
        brand: t('wms.brand.name'),
        doc_no: t('wms.col.txn-no'), date: t('wms.col.date'),
        party: t('wms.col.party'), reference: t('wms.col.reference'),
        status: t('wms.col.status'),
        from: t('wms.form.from-wh'), to: t('wms.form.to-wh'),
        notes: t('wms.form.notes'),
        line: t('wms.col.line'), part_no: t('wms.col.part-no'),
        description: t('wms.col.name'), qty: t('wms.col.qty'), unit: t('wms.col.unit'),
        signature: t('wms.form.signature'), printed_at: t('wms.form.printed-at'),
        recipient_info: t('wms.form.recipient-info'),
        recipient_name: t('wms.form.recipient-name'),
        recipient_title: t('wms.form.recipient-title'),
        recipient_empno: t('wms.form.recipient-empno'),
        receipt_time: t('wms.form.receipt-time'),
        delegation: t('wms.form.delegation'),
      },
      language as 'ar' | 'en',
    );
    wmsPrintHTML(html, `${t(titleKey(txnType))} — ${h.txn_no}`);
  };

  const showFrom = txnType === 'out' || txnType === 'transfer' || txnType === 'adjustment';
  const showTo = txnType === 'in' || txnType === 'transfer' || txnType === 'adjustment';
  const docTitle = useMemo(() => `${t(titleKey(txnType))} — ${isNew ? t('wms.form.new') : h.txn_no}`, [txnType, isNew, h.txn_no, t]);

  return (
    <WmsCard title={docTitle} subtitle={isNew ? t('wms.form.new-sub') : t('wms.form.edit-sub')}>
      <div className="wms-form-grid">
        <WmsField label={t('wms.col.txn-no')}>
          <WmsInput value={h.txn_no} onChange={e => setH({ ...h, txn_no: e.target.value })} />
        </WmsField>
        <WmsField label={t('wms.col.date')}>
          <WmsInput type="date" value={h.txn_date} onChange={e => setH({ ...h, txn_date: e.target.value })} />
        </WmsField>
        <WmsField label={t('wms.col.reference')}>
          <WmsInput value={h.reference} onChange={e => setH({ ...h, reference: e.target.value })} />
        </WmsField>
        {txnType !== 'transfer' && (
          <WmsField label={t('wms.col.party')}>
            <WmsInput value={h.party_name} onChange={e => setH({ ...h, party_name: e.target.value })} />
          </WmsField>
        )}
        {showFrom && (
          <WmsField label={t('wms.form.from-wh')}>
            <WmsSelect value={h.from_warehouse_id ?? ''} onChange={e => setH({ ...h, from_warehouse_id: e.target.value || null })}>
              <option value="">—</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.code} · {language === 'ar' ? w.name_ar : (w.name_en || w.name_ar)}</option>)}
            </WmsSelect>
          </WmsField>
        )}
        {showTo && (
          <WmsField label={t('wms.form.to-wh')}>
            <WmsSelect value={h.to_warehouse_id ?? ''} onChange={e => setH({ ...h, to_warehouse_id: e.target.value || null })}>
              <option value="">—</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.code} · {language === 'ar' ? w.name_ar : (w.name_en || w.name_ar)}</option>)}
            </WmsSelect>
          </WmsField>
        )}
      </div>

      {(txnType === 'in' || txnType === 'out') && (
        <>
          <div className="wms-section">
            <div className="wms-section-title">⚑ {t('wms.form.delegation')}</div>
            <label className="wms-checkbox-row">
              <input type="checkbox" checked={rec.is_delegated}
                onChange={e => setRec({ ...rec, is_delegated: e.target.checked })} />
              {t('wms.form.delegation')}
            </label>
          </div>
          <div className="wms-section">
            <div className="wms-section-title">▣ {t('wms.form.recipient-info')}</div>
            <div className="wms-form-grid" style={{ marginBottom: 0 }}>
              <WmsField label={t('wms.form.recipient-name')}>
                <WmsInput value={rec.recipient_name}
                  onChange={e => setRec({ ...rec, recipient_name: e.target.value })} />
              </WmsField>
              <WmsField label={t('wms.form.recipient-title')}>
                <WmsInput value={rec.recipient_title}
                  onChange={e => setRec({ ...rec, recipient_title: e.target.value })} />
              </WmsField>
              <WmsField label={t('wms.form.recipient-empno')}>
                <WmsInput value={rec.recipient_empno}
                  onChange={e => setRec({ ...rec, recipient_empno: e.target.value })} />
              </WmsField>
              <WmsField label={t('wms.form.receipt-time')}>
                <WmsInput type="time" value={rec.receipt_time}
                  onChange={e => setRec({ ...rec, receipt_time: e.target.value })} />
              </WmsField>
            </div>
          </div>
        </>
      )}

      <div className="wms-lines-actions">
        <span className="wms-lines-title">{t('wms.form.lines')}</span>
        <WmsButton size="sm" variant="ghost" onClick={addLine}>+ {t('wms.form.add-line')}</WmsButton>
      </div>
      <div className="wms-table-wrap">
        <table className="wms-table is-edit">
          <thead><tr>
            <th style={{ width: 50 }}>{t('wms.col.line')}</th>
            <th>{t('wms.col.part-no')}</th>
            <th style={{ width: 100 }}>{t('wms.col.qty')}</th>
            <th style={{ width: 90 }}>{t('wms.col.unit')}</th>
            <th>{t('wms.form.notes')}</th>
            <th style={{ width: 40 }}></th>
          </tr></thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td className="wms-td-mono">{l.line_no}</td>
                <td>
                  <WmsSelect value={l.item_id} onChange={e => {
                    const it = items.find(x => x.id === e.target.value);
                    updateLine(i, { item_id: e.target.value, unit: it?.default_unit ?? l.unit });
                  }}>
                    <option value="">—</option>
                    {items.map(it => <option key={it.id} value={it.id}>{itemLabel(it)}</option>)}
                  </WmsSelect>
                </td>
                <td><WmsInput type="number" min={0} step="any" value={l.qty}
                  onChange={e => updateLine(i, { qty: Number(e.target.value) || 0 })} /></td>
                <td><WmsInput value={l.unit} onChange={e => updateLine(i, { unit: e.target.value })} /></td>
                <td><WmsInput value={l.notes} onChange={e => updateLine(i, { notes: e.target.value })} /></td>
                <td><button className="wms-icon-btn" type="button" onClick={() => removeLine(i)} aria-label="delete">×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="wms-form-grid" style={{ marginTop: '1rem' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <WmsField label={t('wms.form.notes')}>
            <WmsTextarea value={h.notes} onChange={e => setH({ ...h, notes: e.target.value })} />
          </WmsField>
        </div>
      </div>

      <div className="wms-form-footer">
        <WmsButton variant="ghost" onClick={() => nav(-1)}>{t('wms.form.cancel')}</WmsButton>
        <WmsButton variant="ghost" onClick={print}>{t('wms.form.print')}</WmsButton>
        <WmsButton variant="ghost" disabled={busy} onClick={() => persist(false)}>{t('wms.form.save-draft')}</WmsButton>
        <WmsButton variant="primary" disabled={busy} onClick={async () => {
          const newId = await persist(true);
          if (newId && isNew) nav(`/wms/txn/${txnType}/${newId}`, { replace: true });
        }}>{t('wms.form.post')}</WmsButton>
      </div>
    </WmsCard>
  );
}