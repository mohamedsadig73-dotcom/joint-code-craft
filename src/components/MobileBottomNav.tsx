import { memo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BarChart3, Wrench, Wallet, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface NavItem {
  path: string;
  icon: typeof LayoutDashboard;
  labelKey: string;
}

const navItems: NavItem[] = [
  { path: '/', icon: LayoutDashboard, labelKey: 'declarations' },
  { path: '/maintenance', icon: Wrench, labelKey: 'maintenance' },
  { path: '/petty-cash', icon: Wallet, labelKey: 'pettyCash' },
  { path: '/leave-tracking', icon: FileText, labelKey: 'leaveTracking' },
  { path: '/reports-analytics', icon: BarChart3, labelKey: 'reports' },
];

export const MobileBottomNav = memo(function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Gradient blur background */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-background/80 backdrop-blur-xl border-t border-border/30" />
      
      {/* Safe area padding for iOS */}
      <div className="relative flex items-center justify-around h-18 px-2 pb-safe">
        {navItems.map((item, index) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'relative flex flex-col items-center justify-center flex-1 h-full py-3',
                'min-w-[48px] min-h-[48px]',
                'transition-all duration-200',
                'active:scale-95',
                'animate-fade-in',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
              style={{ animationDelay: `${index * 50}ms` }}
              aria-label={t(item.labelKey)}
            >
              {/* Active indicator pill */}
              {active && (
                <div className="absolute top-1 w-8 h-1 bg-primary rounded-full shadow-lg shadow-primary/30 animate-fade-in" />
              )}
              
              {/* Icon container */}
              <div 
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300',
                  active && 'bg-primary/10 -translate-y-0.5 scale-105'
                )}
              >
                <Icon className={cn(
                  'transition-all duration-200',
                  active ? 'w-6 h-6' : 'w-5 h-5'
                )} />
              </div>
              
              {/* Label */}
              <span 
                className={cn(
                  'text-[10px] font-medium mt-0.5 truncate max-w-full px-1 transition-opacity duration-200',
                  active ? 'text-primary opacity-100' : 'text-muted-foreground/70 opacity-70'
                )}
              >
                {t(item.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
});
