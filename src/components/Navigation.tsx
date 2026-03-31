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
  Users
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const APP_VERSION = '4.4.0';

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
    }
    
    return items;
  }, [user?.role]);

  const isRTL = language === 'ar';

  return (
    <nav className="border-b border-border/30 sticky top-0 z-50 bg-background/95 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 ltr-flex shrink-0 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <LayoutDashboard className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-base font-bold tracking-tight whitespace-nowrap hidden sm:inline">
              {isRTL ? 'إدارة المخزن' : 'DTS Store'}
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-0.5 ltr-flex bg-muted/30 rounded-lg p-1">
            {allNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`gap-1.5 ltr-flex px-2.5 h-8 rounded-md transition-all text-xs font-medium ${
                      active 
                        ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                    title={t(item.labelKey)}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden xl:inline">{t(item.labelKey)}</span>
                  </Button>
                </Link>
              );
            })}
          </div>

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
