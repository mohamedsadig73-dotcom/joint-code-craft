import { useEffect, useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { WmsCard, WmsField, WmsInput, WmsBadge } from '../components';

interface ItemRow {
  id: string; part_no: string; description: string;
  name_ar: string | null; name_en: string | null;
  default_unit: string; barcode: string | null;
  category_id: string | null; min_qty: number | null;
}

export default function Page() {
  const { t, language } = useLanguage();
  const [q, setQ] = useState('');
  const [items, setItems] = useState<ItemRow[]>([]);

  useEffect(() => {
    void (async () => {
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: ItemRow[] | null }> } } };
      const r = await sb.from('items_master').select('id,part_no,description,name_ar,name_en,default_unit,barcode,category_id,min_qty').order('part_no', { ascending: true });
      setItems(r.data ?? []);
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items.slice(0, 50);
    return items.filter(i =>
      i.part_no?.toLowerCase().includes(s) ||
      i.description?.toLowerCase().includes(s) ||
      i.name_ar?.toLowerCase().includes(s) ||
      i.barcode?.toLowerCase().includes(s)
    ).slice(0, 100);
  }, [q, items]);

  return (
    <WmsCard title={t('wms.nav.inquiry-items')} subtitle={t('wms.inquiry.sub')}>
      <WmsField label={t('wms.inquiry.search-label')}>
        <WmsInput placeholder={t('wms.inquiry.search-ph')} value={q} onChange={(e) => setQ((e.target as HTMLInputElement).value)} />
      </WmsField>
      <div className="mt-4 space-y-2">
        {filtered.map(i => (
          <div key={i.id} className="p-3 border border-border/40 rounded-md flex items-center gap-3 hover:border-primary/40">
            <div className="flex-1 min-w-0">
              <div className="font-mono text-sm text-primary">{i.part_no}</div>
              <div className="text-sm truncate">{language === 'ar' ? (i.name_ar || i.description) : (i.description || i.name_ar)}</div>
              {i.barcode && <div className="text-xs text-muted-foreground font-mono">⌗ {i.barcode}</div>}
            </div>
            <WmsBadge tone="blue">{i.default_unit}</WmsBadge>
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center text-muted-foreground py-8">{t('wms.inquiry.no-results')}</div>}
      </div>
    </WmsCard>
  );
}
