import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { NotificationCenter } from '@/components/NotificationCenter';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { ThemeToggleSimple } from '@/components/ThemeToggle';
import { ForceUpdateButton } from '@/components/ForceUpdateButton';
import { 
  LayoutDashboard, 
  FolderOpen, 
  BarChart3, 
  LogOut, 
  User,
  Globe,
  Shield,
  Download,
  Wrench,
  FileText,
  History,
  RefreshCw,
  Wallet
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { forceAppUpdate } from '@/components/ForceUpdateButton';

const APP_VERSION = '2.3.0';

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleForceUpdate = async () => {
    setIsUpdating(true);
    toast({ title: t('updateInProgress'), description: t('pageWillReload') });
    await forceAppUpdate();
  };

  // Navigation items ordered: Declarations -> Maintenance -> Petty Cash -> Leave Tracking -> Reports -> Admin
  const navItems = [
    { path: '/', icon: LayoutDashboard, labelKey: 'declarations' },
    { path: '/maintenance', icon: Wrench, labelKey: 'maintenance' },
    { path: '/petty-cash', icon: Wallet, labelKey: 'pettyCash' },
    { path: '/leave-tracking', icon: FileText, labelKey: 'leaveTracking' },
    { path: '/reports-analytics', icon: BarChart3, labelKey: 'reportsTitle' },
  ];

  // Role-based navigation items
  const allNavItems = useMemo(() => {
    const items = [...navItems];
    
    // Add Manager Dashboard for managers and admins
    if (user?.role === 'manager' || user?.role === 'admin') {
      items.push({ path: '/manager-dashboard', icon: BarChart3, labelKey: 'managerDashboard' });
    }
    
    // Add Admin Dashboard for admins only
    if (user?.role === 'admin') {
      items.push({ path: '/admin', icon: Shield, labelKey: 'adminDashboard' });
    }
    
    return items;
  }, [user?.role]);

  const isRTL = language === 'ar';

  return (
    <nav className="glass-card border-b border-border/50 sticky top-0 z-50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 md:h-16">
          {/* Logo */}
          <div className="flex items-center gap-4 ltr-flex">
            <h1 className="text-2xl font-bold gradient-text">DTS</h1>
            <span className="hidden md:block text-sm text-muted-foreground">
              {t('systemTitle')}
            </span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-2 ltr-flex">
            {allNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive(item.path) ? 'secondary' : 'ghost'}
                    size="sm"
                    className="gap-2 ltr-flex"
                  >
                    <Icon className="w-4 h-4" />
                    {t(item.labelKey)}
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* Right Side Actions - Simplified */}
          <div className="flex items-center gap-1 md:gap-2 ltr-flex">
            {/* Offline Indicator - Hidden on mobile */}
            <div className="hidden lg:block">
              <OfflineIndicator />
            </div>

            {/* Force Update Button - Visible prominently */}
            <div className="hidden md:block">
              <ForceUpdateButton />
            </div>

            {/* Theme Toggle */}
            <ThemeToggleSimple />

            {/* Language Toggle - Icon only on mobile */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleLanguage}
              className="md:hidden"
              title={t('switchLanguage')}
            >
              <Globe className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLanguage}
              className="hidden md:flex gap-2 bg-primary/10 hover:bg-primary/20 border-primary/30"
              title={t('switchLanguage')}
            >
              <Globe className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">{language === 'en' ? 'العربية' : 'EN'}</span>
            </Button>

            {/* Notifications */}
            <NotificationCenter />

            {/* User Menu - Consolidated */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="md:px-3 md:w-auto">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="hidden md:block ms-2 text-sm font-medium max-w-[100px] truncate">
                    {user?.username}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm font-medium border-b mb-1">
                  <p>{user?.username}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user?.role} • v{APP_VERSION}</p>
                </div>
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="w-4 h-4 me-2" />
                  {t('profile')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/install')}>
                  <Download className="w-4 h-4 me-2" />
                  {t('installApp')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleForceUpdate} disabled={isUpdating}>
                  <RefreshCw className={`w-4 h-4 me-2 ${isUpdating ? 'animate-spin' : ''}`} />
                  {t('forceUpdate')}
                </DropdownMenuItem>
                {user?.role === 'admin' && (
                  <DropdownMenuItem onClick={() => navigate('/audit-logs')}>
                    <History className="w-4 h-4 me-2" />
                    {t('auditLog')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="w-4 h-4 me-2" />
                  {t('logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Navigation - Hidden, using MobileBottomNav instead */}
      </div>
    </nav>
  );
}
