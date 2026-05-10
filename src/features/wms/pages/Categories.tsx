import { useLanguage } from '@/contexts/LanguageContext';
import { GenericListPage } from './_shared';
import type { Column, WmsRowBase } from '../components';

interface Row extends WmsRowBase { id: string; code: string; name_ar: string; name_en: string | null; is_active: boolean; }
export default function Page() {
  const { t, language } = useLanguage();
  const cols: Column<Row>[] = [
    { key: 'code', header: t('wms.col.code'), className: 'wms-td-mono', render: r => r.code },
    { key: 'name', header: t('wms.col.name'), className: 'wms-td-primary',
      render: r => language === 'ar' ? r.name_ar : (r.name_en || r.name_ar) },
    { key: 'status', header: t('wms.col.status'),
      render: r => <span className={`wms-badge ${r.is_active ? 'wms-badge-green' : 'wms-badge-gray'}`}>
        {r.is_active ? t('wms.status.active') : t('wms.status.inactive')}</span> },
  ];
  return <GenericListPage<Row> table="item_categories" titleKey="wms.nav.categories"
    columns={cols} searchKeys={['code', 'name_ar', 'name_en']}
    orderBy={{ column: 'sort_order', ascending: true }} />;
}
