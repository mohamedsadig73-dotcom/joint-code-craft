import { useLanguage } from '@/contexts/LanguageContext';
import { WmsCard, WmsEmpty } from '../components';
export default function Page() {
  const { t } = useLanguage();
  return <WmsCard title={t('wms.nav.approvals')} subtitle={t('wms.approvals.sub')}>
    <WmsEmpty icon="◐" title={t('wms.approvals.empty')} hint={t('wms.approvals.hint')} />
  </WmsCard>;
}
