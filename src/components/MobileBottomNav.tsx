import { memo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BarChart3, Wrench, Wallet, FileText, MoreHorizontal, CalendarDays, Users, Shield, X, Home, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { hapticSelection, hapticLight } from '@/lib/haptics';

interface NavItem {
  path: string;
  icon: typeof LayoutDashboard;
  labelKey: string;
}

const primaryNavItems: NavItem[] = [
  { path: '/', icon: Home, labelKey: 'home' },
  { path: '/vouchers?tab=receipt', icon: FileText, labelKey: 'vouchersHub' },
  { path: '/maintenance', icon: Wrench, labelKey: 'maintenance' },
  { path: '/petty-cash', icon: Wallet, labelKey: 'pettyCashShort' },
];

export const MobileBottomNav = memo(function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'ar';
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Secondary pages shown in "More" menu
  const moreNavItems: NavItem[] = [
    { path: '/boxes', icon: Package, labelKey: 'boxesManagement' },
    { path: '/leave-tracking', icon: CalendarDays, labelKey: 'leaveShort' },
    { path: '/reports-analytics', icon: BarChart3, labelKey: 'reports' },
    { path: '/holiday-attendance', icon: CalendarDays, labelKey: 'holidayAttendance' },
    { path: '/employees', icon: Users, labelKey: 'employeesManagement' },
  ];

  // Role-based items
  if (user?.role === 'manager' || user?.role === 'admin') {
    moreNavItems.push({ path: '/manager-dashboard', icon: BarChart3, labelKey: 'managerDashboard' });
  }
  if (user?.role === 'admin') {
    moreNavItems.push({ path: '/admin', icon: Shield, labelKey: 'adminDashboard' });
  }

  const isMoreActive = moreNavItems.some(item => isActive(item.path));

  const handleMoreNavigate = (path: string) => {
    hapticSelection();
    navigate(path);
    setMoreOpen(false);
  };

  // Hide bottom nav on Home page for clean dashboard mode
  const isHomePage = location.pathname === '/';

  return (
    <>
      <nav 
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 md:hidden print:hidden no-select-mobile tap-highlight-none",
          "transition-transform duration-300",
          isHomePage && "translate-y-full"
        )}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Gradient blur background */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-background/80 backdrop-blur-xl border-t border-border/30" />
        
        {/* Safe area padding for iOS */}
        <div className="relative flex items-center justify-around px-2 pb-safe ps-safe pe-safe" style={{ height: '4.25rem' }}>
          {primaryNavItems.map((item, index) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            
            return (
              <button
                key={item.path}
                onClick={() => { hapticSelection(); navigate(item.path); }}
                className={cn(
                  'relative flex flex-col items-center justify-center flex-1 h-full py-3',
                  'touch-target',
                  'transition-all duration-200',
                  'active:scale-95',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
                aria-label={t(item.labelKey)}
              >
                {/* Active indicator pill */}
                {active && (
                  <div className="absolute top-1 w-8 h-1 bg-primary rounded-full shadow-lg shadow-primary/30" />
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

          {/* More button */}
          <button
            onClick={() => { hapticLight(); setMoreOpen(true); }}
            className={cn(
              'relative flex flex-col items-center justify-center flex-1 h-full py-3',
              'touch-target',
              'transition-all duration-200',
              'active:scale-95',
              isMoreActive ? 'text-primary' : 'text-muted-foreground'
            )}
            aria-label={t('more')}
          >
            {isMoreActive && (
              <div className="absolute top-1 w-8 h-1 bg-primary rounded-full shadow-lg shadow-primary/30" />
            )}
            <div 
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300',
                isMoreActive && 'bg-primary/10 -translate-y-0.5 scale-105'
              )}
            >
              <MoreHorizontal className={cn(
                'transition-all duration-200',
                isMoreActive ? 'w-6 h-6' : 'w-5 h-5'
              )} />
            </div>
            <span 
              className={cn(
                'text-[10px] font-medium mt-0.5 truncate max-w-full px-1 transition-opacity duration-200',
                isMoreActive ? 'text-primary opacity-100' : 'text-muted-foreground/70 opacity-70'
              )}
            >
              {t('more')}
            </span>
          </button>
        </div>
      </nav>

      {/* More Sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-center">{t('more')}</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-4 pb-6">
            {moreNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => handleMoreNavigate(item.path)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl transition-all',
                    'min-h-[80px] active:scale-95',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                  )}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs font-medium text-center leading-tight">
                    {t(item.labelKey)}
                  </span>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
});
