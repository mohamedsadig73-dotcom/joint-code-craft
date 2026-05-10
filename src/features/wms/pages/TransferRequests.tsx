import { useLanguage } from '@/contexts/LanguageContext';
import { WmsCard, WmsEmpty } from '../components';

export default function Page() {
  const { t } = useLanguage();
  return (
    <WmsCard title={t('wms.nav.transfer-requests')} subtitle={t('wms.transfer-requests.sub')}>
      <WmsEmpty icon="⇄" title={t('wms.transfer-requests.empty')} hint={t('wms.transfer-requests.hint')} />
    </WmsCard>
  );
}
