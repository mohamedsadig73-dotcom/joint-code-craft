import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { WmsListShell, type Column, type WmsRowBase } from '../components';

interface Row extends WmsRowBase {
  id: string; code: string; name_ar: string; name_en: string | null;
  parent_id: string | null; is_active: boolean; sort_order: number;
}

export default function Page() {
  const { t, language } = useLanguage();
  const [all, setAll] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let off = false;
    (async () => {
      const sb = supabase as unknown as { from: (t: string) => unknown };
      type C = { select: (s: string) => C; order: (c: string, o: { ascending: boolean }) => Promise<{ data: Row[] | null }> };
      const res = await (sb.from('item_categories') as unknown as C)
        .select('id,code,name_ar,name_en,parent_id,is_active,sort_order')
        .order('sort_order', { ascending: true });
      if (off) return;
      setAll(res.data ?? []);
      setLoading(false);
    })();
    return () => { off = true; };
  }, []);

  const { parents, childMap } = useMemo(() => {
    const childMap = new Map<string, Row[]>();
    all.forEach(r => {
      if (r.parent_id) {
        const arr = childMap.get(r.parent_id) ?? [];
        arr.push(r); childMap.set(r.parent_id, arr);
      }
    });
    return { parents: all.filter(r => !r.parent_id), childMap };
  }, [all]);

  const cols: Column<Row>[] = [
    { key: 'code', header: t('wms.col.code'), className: 'wms-td-mono', render: r => r.code },
    {
      key: 'name', header: t('wms.col.name'), className: 'wms-td-primary',
      render: r => language === 'ar' ? r.name_ar : (r.name_en || r.name_ar),
    },
    {
      key: 'subs', header: t('wms.col.sub-categories'),
      render: r => {
        const subs = childMap.get(r.id) ?? [];
        if (!subs.length) return <span style={{ color: 'hsl(var(--wms-text3))' }}>—</span>;
        return (
          <div className="wms-chips">
            {subs.map(s => <span className="wms-chip" key={s.id}>{language === 'ar' ? s.name_ar : (s.name_en || s.name_ar)}</span>)}
          </div>
        );
      },
    },
    {
      key: 'status', header: t('wms.col.status'),
      render: r => <span className={`wms-badge ${r.is_active ? 'wms-badge-green' : 'wms-badge-gray'}`}>
        {r.is_active ? t('wms.status.active') : t('wms.status.inactive')}</span>,
    },
  ];

  return (
    <WmsListShell<Row>
      title={t('wms.nav.categories')}
      rows={parents} columns={cols} loading={loading}
      searchKeys={['code', 'name_ar', 'name_en']}
      searchPlaceholder={t('wms.common.search-placeholder')}
    />
  );
}