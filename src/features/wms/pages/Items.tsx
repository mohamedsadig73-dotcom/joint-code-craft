import { useLanguage } from '@/contexts/LanguageContext';
import { GenericListPage } from './_shared';
import type { Column } from '../components';

interface Item {
  id: string; part_no: string; name_ar: string | null; name_en: string | null;
  description: string; default_unit: string; is_active: boolean;
}
export default function WmsItemsPage() {
  const { t, language } = useLanguage();
  const cols: Column<Item>[] = [
    { key: 'part_no', header: t('wms.col.part-no'), className: 'wms-td-mono', render: r => r.part_no },
    { key: 'name', header: t('wms.col.name'), className: 'wms-td-primary',
      render: r => (language === 'ar' ? (r.name_ar || r.description) : (r.name_en || r.description)) },
    { key: 'unit', header: t('wms.col.unit'), render: r => r.default_unit },
    { key: 'status', header: t('wms.col.status'),
      render: r => <span className={`wms-badge ${r.is_active ? 'wms-badge-green' : 'wms-badge-gray'}`}>
        {r.is_active ? t('wms.status.active') : t('wms.status.inactive')}</span> },
  ];
  return <GenericListPage<Item>
    table="items_master" titleKey="wms.nav.items" subtitleKey="wms.items.sub"
    columns={cols} searchKeys={['part_no', 'name_ar', 'name_en', 'description']}
    orderBy={{ column: 'created_at', ascending: false }}
  />;
}
