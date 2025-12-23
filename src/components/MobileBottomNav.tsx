import { memo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BarChart3, Wrench, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface NavItem {
  path: string;
  icon: typeof LayoutDashboard;
  labelKey: string;
}

const navItems: NavItem[] = [
  { path: '/', icon: LayoutDashboard, labelKey: 'dashboard' },
  { path: '/reports', icon: BarChart3, labelKey: 'reports' },
  { path: '/maintenance', icon: Wrench, labelKey: 'maintenance' },
  { path: '/profile', icon: User, labelKey: 'profile' },
];

export const MobileBottomNav = memo(function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-lg border-t border-border/50 safe-area-bottom animate-slide-up">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'relative flex flex-col items-center justify-center flex-1 h-full py-2 transition-all duration-200',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {active && (
                <div className="absolute inset-x-2 top-1 h-1 bg-primary rounded-full" />
              )}
              <div className={cn(
                'transition-transform duration-200',
                active && 'scale-110 -translate-y-0.5'
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={cn(
                'text-xs mt-1 font-medium transition-opacity',
                active ? 'opacity-100' : 'opacity-70'
              )}>
                {t(item.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
});
