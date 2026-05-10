import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { WmsListShell, type Column, type WmsRowBase } from '../components';

interface Row extends WmsRowBase {
  id: string; code: string; name_ar: string; name_en: string | null;
  is_active: boolean;
}

export default function Page() {
  const { t, language } = useLanguage();
  const [rows, setRows] = useState<Row[]>([]);
  const [linkMap, setLinkMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let off = false;
    (async () => {
      const sb = supabase as unknown as { from: (t: string) => unknown };
      type C = { select: (s: string) => C; order: (c: string, o: { ascending: boolean }) => Promise<{ data: unknown[] | null }> };
      const uP = (sb.from('uom_dictionary') as unknown as C)
        .select('id,code,name_ar,name_en,is_active').order('code', { ascending: true });
      const linksP = (sb.from('items_master') as unknown as C).select('uom_dict_id').order('uom_dict_id', { ascending: true });
      const [uRes, linksRes] = await Promise.all([
        uP as unknown as Promise<{ data: Row[] | null }>,
        linksP as unknown as Promise<{ data: { uom_dict_id: string | null }[] | null }>,
      ]);
      if (off) return;
      const m = new Map<string, number>();
      (linksRes.data ?? []).forEach(r => {
        if (!r.uom_dict_id) return;
        m.set(r.uom_dict_id, (m.get(r.uom_dict_id) ?? 0) + 1);
      });
      setLinkMap(m);
      setRows(uRes.data ?? []);
      setLoading(false);
    })();
    return () => { off = true; };
  }, []);

  const cols: Column<Row>[] = [
    { key: 'code', header: t('wms.col.code'), className: 'wms-td-mono', render: r => r.code },
    {
      key: 'name', header: t('wms.col.name'), className: 'wms-td-primary',
      render: r => language === 'ar' ? r.name_ar : (r.name_en || r.name_ar),
    },
    {
      key: 'linked', header: t('wms.col.linked-to'),
      render: r => {
        const n = linkMap.get(r.id) ?? 0;
        return <span className={`wms-badge ${n > 0 ? 'wms-badge-blue' : 'wms-badge-gray'}`}>
          {n} {t('wms.col.items-short')}
        </span>;
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
      title={t('wms.nav.units')}
      rows={rows} columns={cols} loading={loading}
      searchKeys={['code', 'name_ar', 'name_en']}
      searchPlaceholder={t('wms.common.search-placeholder')}
    />
  );
}