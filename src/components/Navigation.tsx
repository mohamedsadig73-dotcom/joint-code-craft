import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { NotificationCenter } from '@/components/NotificationCenter';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { ThemeToggleSimple } from '@/components/ThemeToggle';
import { forceAppUpdate } from '@/components/ForceUpdateButton';
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
  Wallet,
  CalendarDays,
  Users,
  Package,
  Database,
  AlertTriangle,
  ClipboardList,
  ShieldCheck,
  Settings as SettingsIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';

declare const __APP_VERSION__: string;
const APP_VERSION = __APP_VERSION__;

export function Navigation({ minimal = false }: { minimal?: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  // Hide "Install App" entry once the app is already installed (PWA standalone mode)
  const isStandalone = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia?.('(display-mode: standalone)').matches ||
      // iOS Safari
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as any).standalone === true
    );
  }, []);

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

  // Navigation items ordered: Home -> Declarations -> Maintenance -> Petty Cash -> Leave Tracking -> Reports -> Admin
  const navItems = [
    { path: '/', icon: LayoutDashboard, labelKey: 'home' },
    { path: '/declarations', icon: FileText, labelKey: 'declarations' },
    { path: '/maintenance', icon: Wrench, labelKey: 'maintenance' },
    { path: '/boxes', icon: Package, labelKey: 'boxesManagement' },
    { path: '/petty-cash', icon: Wallet, labelKey: 'pettyCash' },
    { path: '/leave-tracking', icon: FileText, labelKey: 'leaveTracking' },
    { path: '/holiday-attendance', icon: CalendarDays, labelKey: 'holidayAttendance' },
    { path: '/employees', icon: Users, labelKey: 'employeesManagement' },
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
      items.push({ path: '/admin/data-setup', icon: Database, labelKey: 'dataSetup' });
      items.push({ path: '/admin/app-settings', icon: SettingsIcon, labelKey: 'appSettingsNav' });
    }
    // Inventory tools (all roles)
    items.push({ path: '/inventory/alerts', icon: AlertTriangle, labelKey: 'lowStockAlerts' });
    items.push({ path: '/inventory/stock-counts', icon: ClipboardList, labelKey: 'stockCountsNav' });
    if (user?.role === 'admin' || user?.role === 'manager') {
      items.push({ path: '/admin/item-approvals', icon: ShieldCheck, labelKey: 'itemApprovalsNav' });
      items.push({ path: '/admin/supplier-price-import', icon: Database, labelKey: 'supplierPriceImport' });
    }
    
    return items;
  }, [user?.role]);

  const isRTL = language === 'ar';

  return (
    <nav className="glass-card border-b border-border/50 sticky top-0 z-50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 md:h-16">
          {/* Logo - links to home */}
          <Link to="/" className="flex items-center gap-2 ltr-flex shrink-0">
            <h1 className="text-lg font-bold gradient-text whitespace-nowrap">إدارة المخزن</h1>
          </Link>

          {/* Navigation Links - Hidden in minimal mode (Home page) */}
          {!minimal && (
            <div className="hidden md:flex items-center gap-1 ltr-flex">
              {allNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant={isActive(item.path) ? 'secondary' : 'ghost'}
                      size="sm"
                      className="gap-1.5 ltr-flex px-2 lg:px-3"
                      title={t(item.labelKey)}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="hidden xl:inline text-xs">{t(item.labelKey)}</span>
                    </Button>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Right Side Actions */}
          <div className="flex items-center gap-1.5 md:gap-1 ltr-flex shrink-0">
            <div className="hidden lg:block">
              <OfflineIndicator />
            </div>

            <div className="hidden md:block">
              <ThemeToggleSimple />
            </div>

            {/* Language Toggle - Icon only */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleLanguage}
              title={t('switchLanguage')}
              className="hidden md:inline-flex"
            >
              <Globe className="w-4 h-4" />
            </Button>

            <NotificationCenter />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
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
                {/* Mobile-only: Theme & Language */}
                <DropdownMenuItem onClick={toggleLanguage} className="md:hidden">
                  <Globe className="w-4 h-4 me-2" />
                  {t('switchLanguage')}
                </DropdownMenuItem>
                {!isStandalone && (
                  <DropdownMenuItem onClick={() => navigate('/install')}>
                    <Download className="w-4 h-4 me-2" />
                    {t('installApp')}
                  </DropdownMenuItem>
                )}

                {/* Logs submenu — groups Update Log + Audit Log */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <History className="w-4 h-4 me-2" />
                    {t('recordsMenu')}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => navigate('/update-log')}>
                        <History className="w-4 h-4 me-2" />
                        {t('updateLog')}
                      </DropdownMenuItem>
                      {user?.role === 'admin' && (
                        <DropdownMenuItem onClick={() => navigate('/audit-logs')}>
                          <History className="w-4 h-4 me-2" />
                          {t('auditLog')}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>

                {/* Advanced Tools submenu — Admin only */}
                {user?.role === 'admin' && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Wrench className="w-4 h-4 me-2" />
                      {t('advancedTools')}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={handleForceUpdate} disabled={isUpdating}>
                          <RefreshCw className={`w-4 h-4 me-2 ${isUpdating ? 'animate-spin' : ''}`} />
                          {t('forceUpdate')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/update-diagnostics')}>
                          <History className="w-4 h-4 me-2" />
                          {t('updateDiagnostics')}
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
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
