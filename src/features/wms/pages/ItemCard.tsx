import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { WmsCard, WmsField, WmsSelect, WmsBadge, WmsEmpty, WmsButton } from '../components';
import { wmsPrintHTML, esc } from '../lib/print';

interface ItemRow { id: string; part_no: string; description: string; name_ar: string | null; name_en: string | null; default_unit: string; barcode: string | null; min_qty: number | null; max_qty: number | null; image_path: string | null; brand: string | null; }
interface StockRow { warehouse_id: string; qty: number; warehouse?: { name_ar: string; code: string } | null; }
interface TxnRow { id: string; txn_no: string; txn_type: string; txn_date: string; qty: number; }

export default function Page() {
  const { t, language } = useLanguage();
  const params = useParams<{ id?: string }>();
  const [items, setItems] = useState<ItemRow[]>([]);
  const [sel, setSel] = useState('');
  const [stock, setStock] = useState<StockRow[]>([]);
  const [txns, setTxns] = useState<TxnRow[]>([]);

  useEffect(() => {
    void (async () => {
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: ItemRow[] | null }> } } };
      const r = await sb.from('items_master').select('id,part_no,description,name_ar,name_en,default_unit,barcode,min_qty,max_qty,image_path,brand').order('part_no', { ascending: true });
      setItems(r.data ?? []);
    })();
  }, []);

  // Auto-select from URL :id (used for /wms/items/:id deeplinks)
  useEffect(() => {
    if (params.id && params.id !== sel) setSel(params.id);
  }, [params.id, sel]);

  useEffect(() => {
    if (!sel) return;
    void (async () => {
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (c: string, v: string) => { order?: (c: string, o: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: unknown[] | null }> } } & Promise<{ data: unknown[] | null }> } } };
      const st = await sb.from('inv_stock').select('warehouse_id,qty,warehouse:warehouses(name_ar,code)').eq('item_id', sel);
      setStock((st.data as StockRow[] | null) ?? []);
      const txq = sb.from('inv_transaction_items').select('id,qty,transaction:inv_transactions(id,txn_no,txn_type,txn_date)').eq('item_id', sel);
      const tx = await (txq.order ? txq.order('id', { ascending: false }).limit(20) : (txq as unknown as Promise<{ data: unknown[] | null }>));
      const list = ((tx.data as Array<{ id: string; qty: number; transaction?: { id: string; txn_no: string; txn_type: string; txn_date: string } }>) ?? [])
        .filter(x => x.transaction)
        .map(x => ({ id: x.id, txn_no: x.transaction!.txn_no, txn_type: x.transaction!.txn_type, txn_date: x.transaction!.txn_date, qty: x.qty }));
      setTxns(list);
    })();
  }, [sel]);

  const item = useMemo(() => items.find(i => i.id === sel), [items, sel]);
  const totalStock = useMemo(() => stock.reduce((a, b) => a + Number(b.qty || 0), 0), [stock]);

  const printBarcode = () => {
    if (!item) return;
    const code = item.barcode || item.part_no;
    const name = (language === 'ar' ? item.name_ar : item.name_en) || item.description;
    const html = `<!doctype html>
<html lang="${language}" dir="${language === 'ar' ? 'rtl' : 'ltr'}">
<head><meta charset="utf-8"/><title>${esc(item.part_no)} — ${esc(t('wms.item-card.print-barcode'))}</title>
<style>
  body{font-family:${language === 'ar' ? `'Segoe UI Arabic'` : `'Inter'`},system-ui,sans-serif;padding:14mm;color:#111}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm}
  .lbl{border:1px dashed #999;border-radius:3mm;padding:5mm;text-align:center}
  .pn{font-family:ui-monospace,Menlo,monospace;font-size:12pt;color:#0d4ed8;font-weight:700;margin-bottom:2mm}
  .nm{font-size:10pt;margin-bottom:3mm;min-height:14mm}
  .bc{font-family:'Libre Barcode 39',monospace;font-size:36pt;letter-spacing:2px;line-height:1;margin:2mm 0}
  .bcfb{font-family:ui-monospace,Menlo,monospace;font-size:9pt;color:#333}
  @page{size:A4;margin:0}
</style>
<link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39&display=swap" rel="stylesheet">
</head>
<body>
  <div class="grid">
    ${Array.from({ length: 9 }).map(() => `
      <div class="lbl">
        <div class="pn">${esc(item.part_no)}</div>
        <div class="nm">${esc(name)}</div>
        <div class="bc">*${esc(code)}*</div>
        <div class="bcfb">${esc(code)}</div>
      </div>`).join('')}
  </div>
</body></html>`;
    wmsPrintHTML(html, `${item.part_no} — ${t('wms.item-card.print-barcode')}`);
  };

  return (
    <WmsCard
      title={t('wms.nav.item-card')}
      subtitle={t('wms.item-card.sub')}
      actions={item ? <WmsButton variant="primary" size="sm" onClick={printBarcode}>⎙ {t('wms.item-card.print-barcode')}</WmsButton> : undefined}
    >
      <WmsField label={t('wms.item-card.select')}>
        <WmsSelect value={sel} onChange={(e) => setSel((e.target as HTMLSelectElement).value)}>
          <option value="">— {t('wms.item-card.choose')} —</option>
          {items.map(i => <option key={i.id} value={i.id}>{i.part_no} — {language === 'ar' ? (i.name_ar || i.description) : i.description}</option>)}
        </WmsSelect>
      </WmsField>
      {!item ? (
        <div style={{ marginTop: '1.5rem' }}><WmsEmpty icon="◫" title={t('wms.item-card.choose')} hint={t('wms.item-card.hint')} /></div>
      ) : (
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: '.75rem' }}>
            <div className="wms-stat" style={{ ['--wms-stat-accent' as string]: 'hsl(var(--wms-accent))' }}>
              <div className="wms-stat-label">{t('wms.items.part-no')}</div>
              <div className="wms-stat-value" style={{ fontSize: 18 }}>{item.part_no}</div>
            </div>
            <div className="wms-stat" style={{ ['--wms-stat-accent' as string]: 'hsl(var(--wms-teal))' }}>
              <div className="wms-stat-label">{t('wms.alerts.on-hand')}</div>
              <div className="wms-stat-value">{totalStock}</div>
            </div>
            <div className="wms-stat" style={{ ['--wms-stat-accent' as string]: 'hsl(var(--wms-yellow))' }}>
              <div className="wms-stat-label">{t('wms.alerts.min')}</div>
              <div className="wms-stat-value">{item.min_qty ?? 0}</div>
            </div>
            <div className="wms-stat" style={{ ['--wms-stat-accent' as string]: 'hsl(var(--wms-purple))' }}>
              <div className="wms-stat-label">{t('wms.col.unit')}</div>
              <div className="wms-stat-value" style={{ fontSize: 18 }}>{item.default_unit}</div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--wms-text))', marginBottom: '.5rem' }}>{t('wms.item-card.stock-by-wh')}</div>
            <div className="wms-table-wrap">
              <table className="wms-table">
                <thead><tr><th>{t('wms.nav.warehouses')}</th><th style={{ width: 120 }}>{t('wms.col.qty')}</th></tr></thead>
                <tbody>
                  {stock.length === 0
                    ? <tr><td colSpan={2} style={{ textAlign: 'center', color: 'hsl(var(--wms-text3))' }}>—</td></tr>
                    : stock.map((s, i) => (
                      <tr key={i}>
                        <td className="wms-td-primary">{s.warehouse?.name_ar || s.warehouse_id}</td>
                        <td><WmsBadge tone="blue">{s.qty} {item.default_unit}</WmsBadge></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--wms-text))', marginBottom: '.5rem' }}>{t('wms.item-card.movements')}</div>
            <div className="wms-table-wrap">
              <table className="wms-table">
                <thead><tr>
                  <th>{t('wms.col.txn-no')}</th>
                  <th>{t('wms.col.type')}</th>
                  <th>{t('wms.col.date')}</th>
                  <th style={{ width: 100 }}>{t('wms.col.qty')}</th>
                </tr></thead>
                <tbody>
                  {txns.length === 0
                    ? <tr><td colSpan={4} style={{ textAlign: 'center', color: 'hsl(var(--wms-text3))' }}>—</td></tr>
                    : txns.map(x => (
                      <tr key={x.id}>
                        <td className="wms-td-mono">{x.txn_no}</td>
                        <td><WmsBadge tone={x.txn_type === 'in' ? 'green' : x.txn_type === 'out' ? 'red' : 'blue'}>{t('wms.txn.type.' + x.txn_type)}</WmsBadge></td>
                        <td>{new Date(x.txn_date).toLocaleDateString('en-GB')}</td>
                        <td className="wms-td-mono">{x.qty}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </WmsCard>
  );
}
