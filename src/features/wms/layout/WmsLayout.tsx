import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { WMS_NAV } from '../lib/nav';
import { WmsSidebar } from './WmsSidebar';
import { WmsTopbar } from './WmsTopbar';
import { WmsMobileNav } from './WmsMobileNav';
import '../styles/wms-theme.css';

export default function WmsLayout() {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);

  const title = useMemo(() => {
    for (const group of WMS_NAV) {
      for (const item of group.items) {
        const match =
          item.to === '/wms' ? pathname === '/wms' : pathname.startsWith(item.to);
        if (match) return t(item.labelKey);
      }
    }
    return t('wms.nav.dashboard');
  }, [pathname, t]);

  return (
    <div className="wms-scope">
      <div className="wms-app">
        <WmsSidebar open={open} onClose={() => setOpen(false)} />
        <main className="wms-main">
          <WmsTopbar title={title} onToggleSidebar={() => setOpen((v) => !v)} />
          <div className="wms-content">
            <Outlet />
          </div>
        </main>
        <WmsMobileNav />
      </div>
    </div>
  );
}
