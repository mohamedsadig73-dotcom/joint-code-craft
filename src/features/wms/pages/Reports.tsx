import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { WmsCard, WmsButton } from '../components';
export default function Page() {
  const { t } = useLanguage();
  const nav = useNavigate();
  return <WmsCard title={t('wms.nav.reports')} subtitle={t('wms.reports.sub')}>
    <div style={{display:'flex',gap:'.75rem',flexWrap:'wrap'}}>
      <WmsButton variant="primary" onClick={() => nav('/wms/reports/items')}>{t('wms.reports.items')}</WmsButton>
      <WmsButton variant="primary" onClick={() => nav('/wms/reports/movements')}>{t('wms.reports.movements')}</WmsButton>
    </div>
  </WmsCard>;
}
