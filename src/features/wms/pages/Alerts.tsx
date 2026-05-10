import { useLanguage } from '@/contexts/LanguageContext';
import { WmsCard, WmsEmpty } from '../components';
export default function Page() {
  const { t } = useLanguage();
  return <WmsCard title={t('wms.nav.alerts')} subtitle={t('wms.alerts.sub')}>
    <WmsEmpty icon="◬" title={t('wms.alerts.empty')} hint={t('wms.alerts.hint')} />
  </WmsCard>;
}
