import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { WmsCard, WmsButton, WmsField, WmsInput, WmsSelect, WmsListShell, type Column, type WmsRowBase } from '../components';
import { exportWmsExcel, buildReportHTML, type ExcelColumn } from '../lib/excel';
import { wmsPrintHTML } from '../lib/print';

interface Row extends WmsRowBase {
  id: string; part_no: string; description: string; default_unit: string;
  name_ar: string | null; name_en: string | null;
  is_active: boolean; min_qty: number | null; max_qty: number | null;
  brand: string | null; category_id: string | null;
}

export default function ItemsReport() {
  const { t, language } = useLanguage();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [active, setActive] = useState<'all' | 'on' | 'off'>('all');

  useEffect(() => {
    let off = false;
    (async () => {
      setLoading(true);
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: Row[] | null }> } } };
      const res = await sb.from('items_master')
        .select('id,part_no,description,default_unit,name_ar,name_en,is_active,min_qty,max_qty,brand,category_id')
        .order('part_no', { ascending: true });
      if (!off) { setRows(res.data ?? []); setLoading(false); }
    })();
    return () => { off = true; };
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter(r => {
      if (active === 'on' && !r.is_active) return false;
      if (active === 'off' && r.is_active) return false;
      if (!term) return true;
      return [r.part_no, r.description, r.name_ar, r.name_en, r.brand]
        .some(v => String(v ?? '').toLowerCase().includes(term));
    });
  }, [rows, q, active]);

  const nameOf = (r: Row) => (language === 'ar' ? r.name_ar : r.name_en) || r.description;

  const cols: Column<Row>[] = [
    { key: 'part_no', header: t('wms.col.part-no'), className: 'wms-td-mono', render: r => r.part_no },
    { key: 'name', header: t('wms.col.name'), className: 'wms-td-primary', render: r => nameOf(r) },
    { key: 'unit', header: t('wms.col.unit'), render: r => r.default_unit },
    { key: 'min', header: t('wms.col.min'), render: r => r.min_qty ?? '—' },
    { key: 'max', header: t('wms.col.max'), render: r => r.max_qty ?? '—' },
    { key: 'brand', header: t('wms.col.brand'), render: r => r.brand ?? '—' },
    { key: 'st', header: t('wms.col.status'), render: r => r.is_active ? t('wms.status.active') : t('wms.status.inactive') },
  ];

  const excelColumns: ExcelColumn[] = [
    { header: t('wms.col.part-no'), key: 'part_no', width: 18 },
    { header: t('wms.col.name'), key: 'name', width: 38 },
    { header: t('wms.col.unit'), key: 'unit', width: 10 },
    { header: t('wms.col.min'), key: 'min', width: 10 },
    { header: t('wms.col.max'), key: 'max', width: 10 },
    { header: t('wms.col.brand'), key: 'brand', width: 18 },
    { header: t('wms.col.status'), key: 'status', width: 12 },
  ];
  const tabular = filtered.map(r => ({
    part_no: r.part_no, name: nameOf(r), unit: r.default_unit,
    min: r.min_qty ?? '', max: r.max_qty ?? '', brand: r.brand ?? '',
    status: r.is_active ? t('wms.status.active') : t('wms.status.inactive'),
  }));

  const onExcel = () => exportWmsExcel(`items-${new Date().toISOString().slice(0, 10)}.xlsx`, t('wms.reports.items'), excelColumns, tabular);
  const onPrint = () => wmsPrintHTML(buildReportHTML({
    title: t('wms.reports.items'),
    subtitle: `${filtered.length} ${t('wms.reports.records')}`,
    brand: t('wms.brand.name'),
    printedAtLabel: t('wms.form.printed-at'),
    language: language as 'ar' | 'en',
    columns: excelColumns, rows: tabular,
  }), t('wms.reports.items'));

  return (
    <WmsCard
      title={t('wms.reports.items')}
      subtitle={`${filtered.length} ${t('wms.reports.records')}`}
      actions={<>
        <WmsButton size="sm" variant="ghost" onClick={onExcel}>{t('wms.reports.export-excel')}</WmsButton>
        <WmsButton size="sm" variant="primary" onClick={onPrint}>{t('wms.form.print')}</WmsButton>
      </>}
    >
      <div className="wms-form-grid" style={{ marginBottom: '1rem' }}>
        <WmsField label={t('wms.common.search-placeholder')}>
          <WmsInput value={q} onChange={e => setQ(e.target.value)} placeholder={t('wms.common.search-placeholder')} />
        </WmsField>
        <WmsField label={t('wms.col.status')}>
          <WmsSelect value={active} onChange={e => setActive(e.target.value as 'all' | 'on' | 'off')}>
            <option value="all">{t('wms.reports.all')}</option>
            <option value="on">{t('wms.status.active')}</option>
            <option value="off">{t('wms.status.inactive')}</option>
          </WmsSelect>
        </WmsField>
      </div>
      <WmsListShell<Row> rows={filtered} columns={cols} loading={loading} />
    </WmsCard>
  );
}