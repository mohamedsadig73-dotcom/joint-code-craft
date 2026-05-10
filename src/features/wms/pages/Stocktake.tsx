import { useLanguage } from '@/contexts/LanguageContext';
import { GenericListPage } from './_shared';
import type { Column } from '../components';
interface Row { id: string; count_no?: string; status?: string; created_at: string; }
export default function Page() {
  const { t } = useLanguage();
  const cols: Column<Row>[] = [
    { key: 'no', header: t('wms.col.txn-no'), className: 'wms-td-mono', render: r => r.count_no ?? r.id.slice(0, 8) },
    { key: 'status', header: t('wms.col.status'), render: r => r.status ?? '—' },
    { key: 'date', header: t('wms.col.date'), render: r => new Date(r.created_at).toLocaleDateString('en-GB') },
  ];
  return <GenericListPage<Row> table="stock_counts" titleKey="wms.nav.stocktake"
    columns={cols} orderBy={{ column: 'created_at', ascending: false }} />;
}
