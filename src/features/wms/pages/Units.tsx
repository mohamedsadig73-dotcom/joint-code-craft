import { useLanguage } from '@/contexts/LanguageContext';
import { GenericListPage } from './_shared';
import type { Column } from '../components';

interface Row { id: string; code: string; name_ar: string; name_en: string | null; }
export default function Page() {
  const { t, language } = useLanguage();
  const cols: Column<Row>[] = [
    { key: 'code', header: t('wms.col.code'), className: 'wms-td-mono', render: r => r.code },
    { key: 'name', header: t('wms.col.name'), className: 'wms-td-primary',
      render: r => language === 'ar' ? r.name_ar : (r.name_en || r.name_ar) },
  ];
  return <GenericListPage<Row> table="units_of_measure" titleKey="wms.nav.units"
    columns={cols} searchKeys={['code', 'name_ar', 'name_en']} />;
}
