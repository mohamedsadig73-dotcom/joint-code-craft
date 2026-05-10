import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { WmsCard, WmsListShell, WmsBadge, type Column } from '../components';

interface Row extends Record<string, unknown> {
  id?: string; code?: string; name_ar?: string; name_en?: string | null;
  is_active?: boolean; notes?: string | null;
}

type Tab = 'cards' | 'table';

export default function Page() {
  const { t, language } = useLanguage();
  const [tab, setTab] = useState<Tab>('cards');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: Row[] | null }> } } };
      const r = await sb.from('departments').select('id,code,name_ar,name_en,is_active,notes').order('code', { ascending: true });
      setRows(r.data ?? []); setLoading(false);
    })();
  }, []);

  const cols: Column<Row>[] = [
    { key: 'code', header: t('wms.col.code'), render: (r) => <span className="font-mono text-primary">{r.code}</span> },
    { key: 'name', header: t('wms.col.name'), render: (r) => language === 'ar' ? r.name_ar : (r.name_en || r.name_ar) },
    { key: 'st', header: t('wms.col.status'), render: (r) => <WmsBadge tone={r.is_active ? 'green' : 'gray'}>{t(r.is_active ? 'wms.status.active' : 'wms.status.inactive')}</WmsBadge> },
    { key: 'notes', header: t('wms.col.notes'), render: (r) => r.notes || '—' },
  ];

  return (
    <WmsCard title={t('wms.nav.departments')} subtitle={t('wms.departments.sub')}>
      <div className="flex gap-2 mb-4 border-b border-border/40">
        <button onClick={() => setTab('cards')} className={`px-4 py-2 text-sm ${tab === 'cards' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>{t('wms.departments.tab-cards')}</button>
        <button onClick={() => setTab('table')} className={`px-4 py-2 text-sm ${tab === 'table' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>{t('wms.departments.tab-table')}</button>
      </div>
      {tab === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rows.map((r, i) => (
            <div key={r.id} className="p-4 border border-border/40 rounded-lg hover:border-primary/40 transition-colors">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <div className="font-mono text-xs text-primary mb-1">{String(i + 1).padStart(2, '0')} · {r.code}</div>
                  <div className="font-semibold">{language === 'ar' ? r.name_ar : (r.name_en || r.name_ar)}</div>
                  {r.notes && <div className="text-xs text-muted-foreground mt-1">{r.notes}</div>}
                </div>
                <WmsBadge tone={r.is_active ? 'green' : 'gray'}>{t(r.is_active ? 'wms.status.active' : 'wms.status.inactive')}</WmsBadge>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <WmsListShell<Row> rows={rows} columns={cols} loading={loading} />
      )}
    </WmsCard>
  );
}
