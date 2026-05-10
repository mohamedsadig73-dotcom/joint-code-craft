import { Menu, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  title: string;
  onToggleSidebar: () => void;
  rightSlot?: React.ReactNode;
}

export function WmsTopbar({ title, onToggleSidebar, rightSlot }: Props) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <header className="wms-topbar">
      <button
        type="button"
        className="wms-hamburger"
        onClick={onToggleSidebar}
        aria-label={t('wms.topbar.toggle-menu')}
      >
        <Menu size={18} />
      </button>
      <button
        type="button"
        className="wms-btn wms-btn-ghost wms-btn-sm"
        onClick={() => navigate('/')}
        title={t('wms.topbar.back-to-app')}
      >
        <ArrowLeft size={14} />
        <span>{t('wms.topbar.back-to-app')}</span>
      </button>
      <div className="wms-page-title">{title}</div>
      <div className="wms-topbar-actions">{rightSlot}</div>
    </header>
  );
}
