import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { WmsCard, WmsEmpty, WmsListShell, WmsBadge, type Column } from '../components';

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

export default function Page() {
  const { t, language } = useLanguage();
  const nav = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: Row[] | null }> } } };
      const res = await sb.from('v_low_stock_alerts').select('*').order('alert_level', { ascending: true });
      const mapped = (res.data ?? []).map((r) => ({ ...r, id: `${r.item_id}-${r.warehouse_name}` }));
      setRows(mapped);
      setLoading(false);
    })();
  }, []);

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

  if (!loading && rows.length === 0)
    return <WmsCard title={t('wms.nav.alerts')} subtitle={t('wms.alerts.sub')}>
      <WmsEmpty icon="◬" title={t('wms.alerts.empty')} hint={t('wms.alerts.hint')} />
    </WmsCard>;

  return <WmsCard title={t('wms.nav.alerts')} subtitle={t('wms.alerts.sub')}>
    <WmsListShell<Row>
      rows={rows}
      columns={cols}
      loading={loading}
      onRowClick={(r) => r.item_id && nav(`/wms/items?focus=${r.item_id}`)}
    />
  </WmsCard>;
}
