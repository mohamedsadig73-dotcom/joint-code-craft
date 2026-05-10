import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { WmsCard, WmsListShell, type Column, type WmsRowBase } from '../components';

interface Loc extends WmsRowBase {
  id: string; code: string; name_ar: string; name_en: string;
  warehouse_id: string; is_active: boolean;
}
interface Wh { id: string; code: string; name_ar: string; name_en: string | null; }

type Tab = 'by-wh' | 'table';

export default function Page() {
  const { t, language } = useLanguage();
  const [locs, setLocs] = useState<Loc[]>([]);
  const [whs, setWhs] = useState<Wh[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('by-wh');

  useEffect(() => {
    let off = false;
    (async () => {
      const sb = supabase as unknown as { from: (t: string) => unknown };
      type C = { select: (s: string) => C; order: (c: string, o: { ascending: boolean }) => Promise<{ data: unknown[] | null }> };
      const [lRes, wRes] = await Promise.all([
        (sb.from('inv_locations') as unknown as C).select('id,code,name_ar,name_en,warehouse_id,is_active').order('code', { ascending: true }) as unknown as Promise<{ data: Loc[] | null }>,
        (sb.from('warehouses') as unknown as C).select('id,code,name_ar,name_en').order('code', { ascending: true }) as unknown as Promise<{ data: Wh[] | null }>,
      ]);
      if (off) return;
      setLocs(lRes.data ?? []);
      setWhs(wRes.data ?? []);
      setLoading(false);
    })();
    return () => { off = true; };
  }, []);

  const whName = (w: Wh) => language === 'ar' ? w.name_ar : (w.name_en || w.name_ar);
  const locName = (l: Loc) => language === 'ar' ? l.name_ar : (l.name_en || l.name_ar);

  const grouped = useMemo(() => {
    const m = new Map<string, Loc[]>();
    locs.forEach(l => { const arr = m.get(l.warehouse_id) ?? []; arr.push(l); m.set(l.warehouse_id, arr); });
    return m;
  }, [locs]);

  const whMap = useMemo(() => new Map(whs.map(w => [w.id, w])), [whs]);

  const cols: Column<Loc>[] = [
    { key: 'code', header: t('wms.col.code'), className: 'wms-td-mono', render: r => r.code },
    { key: 'name', header: t('wms.col.name'), className: 'wms-td-primary', render: r => locName(r) },
    { key: 'wh', header: t('wms.nav.warehouses'),
      render: r => { const w = whMap.get(r.warehouse_id); return w ? `${w.code} · ${whName(w)}` : '—'; } },
    { key: 'status', header: t('wms.col.status'),
      render: r => <span className={`wms-badge ${r.is_active ? 'wms-badge-green' : 'wms-badge-gray'}`}>
        {r.is_active ? t('wms.status.active') : t('wms.status.inactive')}</span> },
  ];

  if (tab === 'table') {
    return (
      <div>
        <div className="wms-tabs">
          <button className="wms-tab" onClick={() => setTab('by-wh')}>{t('wms.locations.by-wh')}</button>
          <button className={`wms-tab is-active`}>{t('wms.locations.full-table')}</button>
        </div>
        <WmsListShell<Loc>
          title={t('wms.nav.locations')}
          rows={locs} columns={cols} loading={loading}
          searchKeys={['code', 'name_ar', 'name_en']}
          searchPlaceholder={t('wms.common.search-placeholder')}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="wms-tabs">
        <button className="wms-tab is-active">{t('wms.locations.by-wh')}</button>
        <button className="wms-tab" onClick={() => setTab('table')}>{t('wms.locations.full-table')}</button>
      </div>
      <WmsCard title={t('wms.nav.locations')} subtitle={t('wms.locations.by-wh-sub')}>
        {loading ? (
          <div className="wms-empty"><div className="wms-empty-text">{t('wms.common.loading')}</div></div>
        ) : whs.length === 0 ? (
          <div className="wms-empty"><div className="wms-empty-text">{t('wms.common.no-data')}</div></div>
        ) : (
          <div className="wms-wh-grid">
            {whs.map(w => {
              const items = grouped.get(w.id) ?? [];
              return (
                <div className="wms-wh-card" key={w.id}>
                  <div className="wms-wh-card-title">
                    <span>{w.code} · {whName(w)}</span>
                    <span className="wms-badge wms-badge-blue">{items.length}</span>
                  </div>
                  {items.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'hsl(var(--wms-text3))' }}>—</div>
                  ) : items.map(l => (
                    <div className="wms-wh-card-loc" key={l.id}>
                      <span>{locName(l)}</span>
                      <span className="c">{l.code}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </WmsCard>
    </div>
  );
}