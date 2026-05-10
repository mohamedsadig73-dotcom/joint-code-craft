import { useEffect, useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { WmsCard, WmsField, WmsSelect, WmsBadge, WmsEmpty } from '../components';

interface ItemRow { id: string; part_no: string; description: string; name_ar: string | null; default_unit: string; barcode: string | null; min_qty: number | null; max_qty: number | null; }
interface StockRow { warehouse_id: string; qty: number; warehouse?: { name_ar: string; code: string } | null; }
interface TxnRow { id: string; txn_no: string; txn_type: string; txn_date: string; qty: number; }

export default function Page() {
  const { t, language } = useLanguage();
  const [items, setItems] = useState<ItemRow[]>([]);
  const [sel, setSel] = useState('');
  const [stock, setStock] = useState<StockRow[]>([]);
  const [txns, setTxns] = useState<TxnRow[]>([]);

  useEffect(() => {
    void (async () => {
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: ItemRow[] | null }> } } };
      const r = await sb.from('items_master').select('id,part_no,description,name_ar,default_unit,barcode,min_qty,max_qty').order('part_no', { ascending: true });
      setItems(r.data ?? []);
    })();
  }, []);

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

  return (
    <WmsCard title={t('wms.nav.item-card')} subtitle={t('wms.item-card.sub')}>
      <WmsField label={t('wms.item-card.select')}>
        <WmsSelect value={sel} onChange={(e) => setSel((e.target as HTMLSelectElement).value)}>
          <option value="">— {t('wms.item-card.choose')} —</option>
          {items.map(i => <option key={i.id} value={i.id}>{i.part_no} — {language === 'ar' ? (i.name_ar || i.description) : i.description}</option>)}
        </WmsSelect>
      </WmsField>
      {!item ? (
        <div className="mt-6"><WmsEmpty icon="◫" title={t('wms.item-card.choose')} hint={t('wms.item-card.hint')} /></div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 border border-border/40 rounded"><div className="text-xs text-muted-foreground">{t('wms.items.part-no')}</div><div className="font-mono text-primary">{item.part_no}</div></div>
            <div className="p-3 border border-border/40 rounded"><div className="text-xs text-muted-foreground">{t('wms.col.unit')}</div><div>{item.default_unit}</div></div>
            <div className="p-3 border border-border/40 rounded"><div className="text-xs text-muted-foreground">{t('wms.alerts.on-hand')}</div><div className="font-bold text-lg">{totalStock}</div></div>
            <div className="p-3 border border-border/40 rounded"><div className="text-xs text-muted-foreground">{t('wms.alerts.min')}</div><div>{item.min_qty ?? 0}</div></div>
          </div>
          <div>
            <div className="text-sm font-semibold mb-2">{t('wms.item-card.stock-by-wh')}</div>
            <div className="space-y-1">
              {stock.length === 0 ? <div className="text-muted-foreground text-sm">—</div> : stock.map((s, i) => (
                <div key={i} className="flex justify-between p-2 border border-border/40 rounded">
                  <span>{s.warehouse?.name_ar || s.warehouse_id}</span>
                  <WmsBadge tone="blue">{s.qty} {item.default_unit}</WmsBadge>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold mb-2">{t('wms.item-card.movements')}</div>
            <div className="space-y-1 max-h-64 overflow-auto">
              {txns.length === 0 ? <div className="text-muted-foreground text-sm">—</div> : txns.map(x => (
                <div key={x.id} className="flex justify-between p-2 border border-border/40 rounded text-sm">
                  <span className="font-mono text-primary">{x.txn_no}</span>
                  <span>{new Date(x.txn_date).toLocaleDateString('en-GB')}</span>
                  <WmsBadge tone={x.txn_type === 'in' ? 'green' : x.txn_type === 'out' ? 'red' : 'blue'}>{t('wms.txn.type.' + x.txn_type)}</WmsBadge>
                  <span>{x.qty}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </WmsCard>
  );
}
