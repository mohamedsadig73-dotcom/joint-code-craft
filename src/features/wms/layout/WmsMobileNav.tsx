import { NavLink, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { WMS_MOBILE_NAV } from '../lib/nav';

export function WmsMobileNav() {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  return (
    <nav className="wms-mobile-bottom-nav" aria-label="WMS quick navigation">
      {WMS_MOBILE_NAV.map((item) => {
        const isActive =
          item.to === '/wms' ? pathname === '/wms' : pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/wms'}
            className={`wms-mbn-btn ${isActive ? 'is-active' : ''}`}
          >
            <Icon className="wms-mbn-icon" size={18} />
            <span>{t(item.labelKey)}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
