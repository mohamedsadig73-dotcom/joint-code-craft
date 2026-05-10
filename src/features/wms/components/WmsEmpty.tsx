import type { ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  icon?: ReactNode;
  title?: string;
  hint?: string;
}

export function WmsEmpty({ icon = '◈', title, hint }: Props) {
  const { t } = useLanguage();
  return (
    <div className="wms-empty">
      <div className="wms-empty-icon">{icon}</div>
      <div className="wms-empty-text">{title ?? t('wms.common.empty-title')}</div>
      <div className="wms-empty-sub">{hint ?? t('wms.common.empty-hint')}</div>
    </div>
  );
}