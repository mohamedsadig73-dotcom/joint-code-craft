import { memo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BarChart3, Wrench, User, Wallet, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { forceAppUpdate } from '@/components/ForceUpdateButton';

interface NavItem {
  path: string;
  icon: typeof LayoutDashboard;
  labelKey: string;
}

const navItems: NavItem[] = [
  { path: '/', icon: LayoutDashboard, labelKey: 'declarations' },
  { path: '/maintenance', icon: Wrench, labelKey: 'maintenance' },
  { path: '/petty-cash', icon: Wallet, labelKey: 'pettyCash' },
  { path: '/reports-analytics', icon: BarChart3, labelKey: 'reports' },
  { path: '/profile', icon: User, labelKey: 'profile' },
];

export const MobileBottomNav = memo(function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    toast({ title: t('updateInProgress'), description: t('pageWillReload') });
    await forceAppUpdate();
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
            <motion.button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'relative flex flex-col items-center justify-center flex-1 h-full py-3',
                'min-w-[48px] min-h-[48px]',
                'transition-colors duration-200',
                'active:scale-95',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
              aria-label={t(item.labelKey)}
              whileTap={{ scale: 0.92 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {/* Active indicator pill */}
              <AnimatePresence>
                {active && (
                  <motion.div 
                    className="absolute top-1 w-8 h-1 bg-primary rounded-full shadow-lg shadow-primary/30"
                    layoutId="activeTab"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </AnimatePresence>
              
              {/* Icon container */}
              <motion.div 
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300',
                  active && 'bg-primary/10'
                )}
                animate={{ 
                  scale: active ? 1.05 : 1,
                  y: active ? -2 : 0
                }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <Icon className={cn(
                  'transition-all duration-200',
                  active ? 'w-6 h-6' : 'w-5 h-5'
                )} />
              </motion.div>
              
              {/* Label */}
              <motion.span 
                className={cn(
                  'text-[10px] font-medium mt-0.5 truncate max-w-full px-1',
                  active ? 'text-primary' : 'text-muted-foreground/70'
                )}
                animate={{ 
                  opacity: active ? 1 : 0.7
                }}
              >
                {t(item.labelKey)}
              </motion.span>
            </motion.button>
          );
        })}
        
        {/* Force Update Button */}
        <motion.button
          onClick={handleUpdate}
          disabled={isUpdating}
          className="relative flex flex-col items-center justify-center flex-1 h-full py-3 min-w-[48px] min-h-[48px] text-amber-600 dark:text-amber-400"
          whileTap={{ scale: 0.92 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <motion.div className="flex items-center justify-center w-10 h-10 rounded-xl">
            <RefreshCw className={cn('w-5 h-5', isUpdating && 'animate-spin')} />
          </motion.div>
          <span className="text-[10px] font-medium mt-0.5 truncate max-w-full px-1 text-amber-600/70 dark:text-amber-400/70">
            {t('forceUpdate')}
          </span>
        </motion.button>
      </div>
    </nav>
  );
});