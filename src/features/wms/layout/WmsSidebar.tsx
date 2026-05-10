import { NavLink, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { WMS_NAV } from '../lib/nav';

interface Props {
  open: boolean;
  onClose: () => void;
  badges?: Record<string, number>;
}

export function WmsSidebar({ open, onClose, badges = {} }: Props) {
  const { t } = useLanguage();
  const { pathname } = useLocation();

  return (
    <>
      <div
        className={`wms-sidebar-overlay ${open ? 'is-open' : ''}`}
        onClick={onClose}
        aria-hidden
      />
      <aside className={`wms-sidebar ${open ? 'is-open' : ''}`}>
        <div className="wms-logo">
          <div className="wms-logo-icon">WMS</div>
          <div>
            <div className="wms-logo-text">{t('wms.brand.name')}</div>
            <div className="wms-logo-sub">{t('wms.brand.tagline')}</div>
          </div>
        </div>

        {WMS_NAV.map((group) => (
          <div key={group.labelKey} className="wms-nav-section">
            <div className="wms-nav-label">{t(group.labelKey)}</div>
            {group.items.map((item) => {
              const isActive =
                item.to === '/wms'
                  ? pathname === '/wms'
                  : pathname.startsWith(item.to);
              const Icon = item.icon;
              const badge = item.badgeKey ? badges[item.badgeKey] : undefined;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/wms'}
                  className={`wms-nav-item ${isActive ? 'is-active' : ''}`}
                  onClick={onClose}
                >
                  <Icon className="wms-nav-icon" size={16} />
                  <span>{t(item.labelKey)}</span>
                  {badge && badge > 0 ? (
                    <span className="wms-nav-badge">{badge}</span>
                  ) : null}
                </NavLink>
              );
            })}
          </div>
        ))}
      </aside>
    </>
  );
}
