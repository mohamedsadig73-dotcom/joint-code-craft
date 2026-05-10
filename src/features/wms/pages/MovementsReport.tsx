import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { WmsCard, WmsButton, WmsField, WmsInput, WmsSelect, WmsListShell, type Column, type WmsRowBase } from '../components';
import { exportWmsExcel, buildReportHTML, type ExcelColumn } from '../lib/excel';
import { wmsPrintHTML } from '../lib/print';

interface Row extends WmsRowBase {
  id: string; txn_no: string; txn_type: string; txn_date: string;
  status: string; party_name: string | null; reference: string | null;
}

const today = () => new Date().toISOString().slice(0, 10);
const monthAgo = () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10); };

export default function MovementsReport() {
  const { t, language } = useLanguage();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(monthAgo());
  const [to, setTo] = useState(today());
  const [type, setType] = useState<'all' | 'in' | 'out' | 'transfer'>('all');

  useEffect(() => {
    let off = false;
    (async () => {
      setLoading(true);
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            is: (c: string, v: null) => {
              gte: (c: string, v: string) => {
                lte: (c: string, v: string) => {
                  order: (c: string, o: { ascending: boolean }) => Promise<{ data: Row[] | null }>;
                };
              };
            };
          };
        };
      };
      const res = await sb.from('inv_transactions')
        .select('id,txn_no,txn_type,txn_date,status,party_name,reference')
        .is('deleted_at', null)
        .gte('txn_date', from).lte('txn_date', to)
        .order('txn_date', { ascending: false });
      if (!off) { setRows(res.data ?? []); setLoading(false); }
    })();
    return () => { off = true; };
  }, [from, to]);

  const filtered = useMemo(
    () => type === 'all' ? rows : rows.filter(r => r.txn_type === type || (type === 'in' && r.txn_type === 'receipt')),
    [rows, type],
  );

  const fmt = (s: string) => new Date(s).toLocaleDateString('en-GB');
  const typeLabel = (s: string) =>
    s === 'in' || s === 'receipt' ? t('wms.txn.in')
    : s === 'out' ? t('wms.txn.out')
    : s === 'transfer' ? t('wms.txn.transfer') : t('wms.txn.adjustment');

  const cols: Column<Row>[] = [
    { key: 'no', header: t('wms.col.txn-no'), className: 'wms-td-mono', render: r => r.txn_no },
    { key: 'type', header: t('wms.col.type'), render: r => typeLabel(r.txn_type) },
    { key: 'date', header: t('wms.col.date'), render: r => fmt(r.txn_date) },
    { key: 'party', header: t('wms.col.party'), render: r => r.party_name ?? '—' },
    { key: 'ref', header: t('wms.col.reference'), render: r => r.reference ?? '—' },
    { key: 'status', header: t('wms.col.status'), render: r => t(`wms.status.${r.status}`) },
  ];

  const excelColumns: ExcelColumn[] = [
    { header: t('wms.col.txn-no'), key: 'no', width: 16 },
    { header: t('wms.col.type'), key: 'type', width: 12 },
    { header: t('wms.col.date'), key: 'date', width: 14 },
    { header: t('wms.col.party'), key: 'party', width: 28 },
    { header: t('wms.col.reference'), key: 'ref', width: 18 },
    { header: t('wms.col.status'), key: 'status', width: 12 },
  ];
  const tabular = filtered.map(r => ({
    no: r.txn_no, type: typeLabel(r.txn_type), date: fmt(r.txn_date),
    party: r.party_name ?? '', ref: r.reference ?? '',
    status: t(`wms.status.${r.status}`),
  }));

  const onExcel = () => exportWmsExcel(`movements-${from}_${to}.xlsx`, t('wms.reports.movements'), excelColumns, tabular);
  const onPrint = () => wmsPrintHTML(buildReportHTML({
    title: t('wms.reports.movements'),
    subtitle: `${from} → ${to} · ${filtered.length} ${t('wms.reports.records')}`,
    brand: t('wms.brand.name'),
    printedAtLabel: t('wms.form.printed-at'),
    language: language as 'ar' | 'en',
    columns: excelColumns, rows: tabular,
  }), t('wms.reports.movements'));

  return (
    <WmsCard
      title={t('wms.reports.movements')}
      subtitle={`${filtered.length} ${t('wms.reports.records')}`}
      actions={<>
        <WmsButton size="sm" variant="ghost" onClick={onExcel}>{t('wms.reports.export-excel')}</WmsButton>
        <WmsButton size="sm" variant="primary" onClick={onPrint}>{t('wms.form.print')}</WmsButton>
      </>}
    >
      <div className="wms-form-grid" style={{ marginBottom: '1rem' }}>
        <WmsField label={t('wms.reports.from')}>
          <WmsInput type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </WmsField>
        <WmsField label={t('wms.reports.to')}>
          <WmsInput type="date" value={to} onChange={e => setTo(e.target.value)} />
        </WmsField>
        <WmsField label={t('wms.col.type')}>
          <WmsSelect value={type} onChange={e => setType(e.target.value as typeof type)}>
            <option value="all">{t('wms.reports.all')}</option>
            <option value="in">{t('wms.txn.in')}</option>
            <option value="out">{t('wms.txn.out')}</option>
            <option value="transfer">{t('wms.txn.transfer')}</option>
          </WmsSelect>
        </WmsField>
      </div>
      <WmsListShell<Row> rows={filtered} columns={cols} loading={loading} />
    </WmsCard>
  );
}