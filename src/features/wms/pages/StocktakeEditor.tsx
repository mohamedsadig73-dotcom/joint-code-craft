import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { WmsCard, WmsButton, WmsField, WmsInput, WmsSelect, WmsTextarea, WmsBadge } from '../components';
import { wmsPrintHTML } from '../lib/print';
import { buildStocktakeSheetHTML } from '../lib/stocktakeSheetHTML';

type StcStatus = 'draft' | 'in_progress' | 'posted' | 'cancelled';

interface Header {
  id?: string;
  count_no: string;
  count_date: string;
  warehouse_id: string;
  status: StcStatus;
  notes: string;
}
interface Line {
  id?: string;
  line_no: number;
  item_id: string;
  location_id: string | null;
  expected_qty: number;
  counted_qty: number;
  remarks: string;
}
interface WhRow { id: string; code: string; name_ar: string; name_en: string | null; }
interface ItemRow { id: string; part_no: string; description: string; default_unit: string; name_ar: string | null; name_en: string | null; }
interface StockRow { item_id: string; location_id: string | null; qty: number; }

const blankLine = (n: number): Line => ({
  line_no: n, item_id: '', location_id: null, expected_qty: 0, counted_qty: 0, remarks: '',
});

export default function StocktakeEditor() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const isNew = !id || id === 'new';

  const [h, setH] = useState<Header>({
    count_no: '', count_date: new Date().toISOString().slice(0, 10),
    warehouse_id: '', status: 'draft', notes: '',
  });
  const [lines, setLines] = useState<Line[]>([]);
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

  // Reference data
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

  // Existing record
  useEffect(() => {
    if (isNew || !id) return;
    let off = false;
    (async () => {
      const sc = await sb.from('stock_counts')
        .select('id,count_no,count_date,warehouse_id,status,notes').eq('id', id);
      const ls = await sb.from('stock_count_lines')
        .select('id,line_no,item_id,location_id,expected_qty,counted_qty,remarks').eq('count_id', id);
      if (off) return;
      const row = (sc.data as Header[] | null)?.[0];
      if (row) setH({ ...row, notes: row.notes ?? '' });
      const arr = ((ls.data as Line[] | null) ?? [])
        .map(l => ({ ...l, remarks: l.remarks ?? '' }))
        .sort((a, b) => a.line_no - b.line_no);
      setLines(arr);
    })();
    return () => { off = true; };
  }, [id, isNew, sb]);

  const itemMap = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);
  const itemLabel = useCallback((it: ItemRow) => {
    const name = (language === 'ar' ? it.name_ar : it.name_en) || it.description;
    return `${it.part_no} — ${name}`;
  }, [language]);

  // Sync expected from inv_stock for selected warehouse
  const syncFromStock = useCallback(async () => {
    if (!h.warehouse_id) {
      toast({ title: t('wms.stocktake.err-pick-wh'), variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const res = await sb.from('inv_stock').select('item_id,location_id,qty').eq('warehouse_id', h.warehouse_id);
      const stock = (res.data as StockRow[] | null) ?? [];
      // merge with existing manual lines (keep counted_qty, append/refresh expected from stock)
      const byKey = new Map<string, Line>();
      lines.forEach(l => byKey.set(`${l.item_id}|${l.location_id ?? ''}`, l));
      let n = 1;
      const next: Line[] = stock.map((s) => {
        const k = `${s.item_id}|${s.location_id ?? ''}`;
        const prev = byKey.get(k);
        return {
          ...(prev ?? blankLine(n)),
          line_no: n++,
          item_id: s.item_id,
          location_id: s.location_id,
          expected_qty: Number(s.qty || 0),
          counted_qty: prev?.counted_qty ?? 0,
          remarks: prev?.remarks ?? '',
        };
      });
      setLines(next);
      toast({ title: t('wms.stocktake.toast-synced') });
    } finally {
      setBusy(false);
    }
  }, [h.warehouse_id, lines, sb, t, toast]);

  const updateLine = (i: number, patch: Partial<Line>) =>
    setLines(s => s.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  const addLine = () => setLines(s => [...s, blankLine(s.length + 1)]);
  const removeLine = (i: number) =>
    setLines(s => s.filter((_, idx) => idx !== i).map((l, idx) => ({ ...l, line_no: idx + 1 })));

  const totals = useMemo(() => {
    const variance = lines.reduce((s, l) => s + (Number(l.counted_qty || 0) - Number(l.expected_qty || 0)), 0);
    return { lines: lines.length, variance };
  }, [lines]);

  const validate = (): string | null => {
    if (!h.count_no.trim()) return t('wms.stocktake.err-no');
    if (!h.warehouse_id) return t('wms.stocktake.err-pick-wh');
    if (!lines.length) return t('wms.stocktake.err-lines');
    if (lines.some(l => !l.item_id)) return t('wms.stocktake.err-item');
    return null;
  };

  const persist = useCallback(async (nextStatus: StcStatus): Promise<string | null> => {
    const err = validate();
    if (err) { toast({ title: err, variant: 'destructive' }); return null; }
    setBusy(true);
    try {
      const payload = {
        count_no: h.count_no.trim(),
        count_date: h.count_date,
        warehouse_id: h.warehouse_id,
        status: nextStatus,
        notes: h.notes || null,
        ...(nextStatus === 'posted' ? { posted_at: new Date().toISOString() } : {}),
      };
      let cid = h.id;
      if (isNew || !cid) {
        const { data, error } = await sb.from('stock_counts').insert(payload).select().single();
        if (error || !data) throw error ?? new Error('insert failed');
        cid = data.id;
      } else {
        const { error } = await sb.from('stock_counts').update(payload).eq('id', cid);
        if (error) throw error;
        await sb.from('stock_count_lines').delete().eq('count_id', cid);
      }
      const linePayload = lines.filter(l => l.item_id).map(l => ({
        count_id: cid!, line_no: l.line_no, item_id: l.item_id,
        location_id: l.location_id, expected_qty: Number(l.expected_qty || 0),
        counted_qty: Number(l.counted_qty || 0), remarks: l.remarks || null,
      }));
      if (linePayload.length) {
        const { error } = await sb.from('stock_count_lines').insert(linePayload as unknown as object).select().single();
        if (error) console.warn(error);
      }
      toast({ title: nextStatus === 'posted' ? t('wms.stocktake.toast-posted') : t('wms.form.toast-saved') });
      setH(s => ({ ...s, id: cid, status: nextStatus }));
      return cid ?? null;
    } catch (e) {
      console.error(e);
      toast({ title: t('wms.form.toast-error'), variant: 'destructive' });
      return null;
    } finally {
      setBusy(false);
    }
  }, [h, lines, isNew, sb, t, toast]);

  const print = () => {
    const wh = warehouses.find(w => w.id === h.warehouse_id);
    const whName = wh ? `${wh.code} · ${language === 'ar' ? wh.name_ar : (wh.name_en || wh.name_ar)}` : '—';
    const html = buildStocktakeSheetHTML(
      {
        title: t('wms.nav.stocktake'),
        count_no: h.count_no || '—',
        count_date: h.count_date,
        warehouse: whName,
        status: t(`wms.status.${h.status}`),
        notes: h.notes,
      },
      lines.filter(l => l.item_id).map(l => {
        const it = itemMap.get(l.item_id);
        return {
          line_no: l.line_no,
          part_no: it?.part_no ?? '—',
          description: it ? ((language === 'ar' ? it.name_ar : it.name_en) || it.description) : '—',
          unit: it?.default_unit,
          expected_qty: l.expected_qty,
          counted_qty: l.counted_qty,
          remarks: l.remarks,
        };
      }),
      {
        brand: t('wms.brand.name'),
        doc_no: t('wms.col.txn-no'), date: t('wms.col.date'),
        warehouse: t('wms.nav.warehouses'), status: t('wms.col.status'),
        notes: t('wms.form.notes'),
        line: t('wms.col.line'), part_no: t('wms.col.part-no'),
        description: t('wms.col.name'), unit: t('wms.col.unit'),
        expected: t('wms.stocktake.expected'),
        counted: t('wms.stocktake.counted'),
        variance: t('wms.stocktake.variance'),
        remarks: t('wms.form.notes'),
        signature_counted: t('wms.stocktake.signature-counted'),
        signature_verified: t('wms.stocktake.signature-verified'),
        totals_lines: t('wms.stocktake.total-lines'),
        totals_variance: t('wms.stocktake.total-variance'),
        printed_at: t('wms.form.printed-at'),
      },
      language as 'ar' | 'en',
    );
    wmsPrintHTML(html, `${t('wms.nav.stocktake')} — ${h.count_no}`);
  };

  const docTitle = `${t('wms.nav.stocktake')} — ${isNew ? t('wms.form.new') : h.count_no}`;

  return (
    <WmsCard title={docTitle} subtitle={isNew ? t('wms.form.new-sub') : t('wms.form.edit-sub')}>
      <div className="wms-form-grid">
        <WmsField label={t('wms.col.txn-no')}>
          <WmsInput value={h.count_no} onChange={e => setH({ ...h, count_no: e.target.value })} />
        </WmsField>
        <WmsField label={t('wms.col.date')}>
          <WmsInput type="date" value={h.count_date} onChange={e => setH({ ...h, count_date: e.target.value })} />
        </WmsField>
        <WmsField label={t('wms.nav.warehouses')}>
          <WmsSelect value={h.warehouse_id} onChange={e => setH({ ...h, warehouse_id: e.target.value })}>
            <option value="">—</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.code} · {language === 'ar' ? w.name_ar : (w.name_en || w.name_ar)}</option>)}
          </WmsSelect>
        </WmsField>
      </div>

      <div className="wms-lines-actions">
        <span className="wms-lines-title">
          {t('wms.form.lines')} · <WmsBadge tone={totals.variance === 0 ? 'green' : totals.variance > 0 ? 'blue' : 'red'}>
            {t('wms.stocktake.total-variance')}: {totals.variance}
          </WmsBadge>
        </span>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <WmsButton size="sm" variant="ghost" onClick={syncFromStock} disabled={busy}>
            ↻ {t('wms.stocktake.sync-from-stock')}
          </WmsButton>
          <WmsButton size="sm" variant="ghost" onClick={addLine}>+ {t('wms.form.add-line')}</WmsButton>
        </div>
      </div>

      <div className="wms-table-wrap">
        <table className="wms-table is-edit">
          <thead><tr>
            <th style={{ width: 50 }}>{t('wms.col.line')}</th>
            <th>{t('wms.col.part-no')}</th>
            <th style={{ width: 100 }}>{t('wms.stocktake.expected')}</th>
            <th style={{ width: 100 }}>{t('wms.stocktake.counted')}</th>
            <th style={{ width: 100 }}>{t('wms.stocktake.variance')}</th>
            <th>{t('wms.form.notes')}</th>
            <th style={{ width: 40 }}></th>
          </tr></thead>
          <tbody>
            {lines.map((l, i) => {
              const variance = Number(l.counted_qty || 0) - Number(l.expected_qty || 0);
              const tone: 'green' | 'red' | 'blue' = variance === 0 ? 'green' : variance > 0 ? 'blue' : 'red';
              return (
                <tr key={i}>
                  <td className="wms-td-mono">{l.line_no}</td>
                  <td>
                    <WmsSelect value={l.item_id} onChange={e => updateLine(i, { item_id: e.target.value })}>
                      <option value="">—</option>
                      {items.map(it => <option key={it.id} value={it.id}>{itemLabel(it)}</option>)}
                    </WmsSelect>
                  </td>
                  <td><WmsInput type="number" min={0} step="any" value={l.expected_qty} readOnly /></td>
                  <td><WmsInput type="number" min={0} step="any" value={l.counted_qty}
                    onChange={e => updateLine(i, { counted_qty: Number(e.target.value) || 0 })} /></td>
                  <td><WmsBadge tone={tone}>{variance}</WmsBadge></td>
                  <td><WmsInput value={l.remarks} onChange={e => updateLine(i, { remarks: e.target.value })} /></td>
                  <td><button className="wms-icon-btn" type="button" onClick={() => removeLine(i)} aria-label="delete">×</button></td>
                </tr>
              );
            })}
            {lines.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: 'hsl(var(--wms-text3))', padding: '1.5rem' }}>
                {t('wms.stocktake.empty-hint')}
              </td></tr>
            )}
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
        <WmsButton variant="ghost" onClick={() => nav('/wms/stocktake')}>{t('wms.form.cancel')}</WmsButton>
        <WmsButton variant="ghost" onClick={print}>{t('wms.form.print')}</WmsButton>
        <WmsButton variant="ghost" disabled={busy} onClick={() => persist('draft')}>{t('wms.form.save-draft')}</WmsButton>
        <WmsButton variant="primary" disabled={busy} onClick={async () => {
          const newId = await persist('posted');
          if (newId && isNew) nav(`/wms/stocktake/${newId}`, { replace: true });
        }}>{t('wms.form.post')}</WmsButton>
      </div>
    </WmsCard>
  );
}