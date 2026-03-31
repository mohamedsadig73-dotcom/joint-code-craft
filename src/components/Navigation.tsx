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
    <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/40 shadow-sm">
      <div className="max-w-[1440px] mx-auto px-3 lg:px-6">
        <div className="flex items-center justify-between h-12">
          
          {/* Logo — compact */}
          <Link to="/" className="flex items-center gap-2 ltr-flex shrink-0 me-4">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <LayoutDashboard className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm whitespace-nowrap hidden sm:block">
              {isRTL ? 'إدارة المخزن' : 'DTS Store'}
            </span>
          </Link>

          {/* Center Nav — pill style */}
          <div className="hidden md:flex items-center gap-px ltr-flex flex-1 justify-center">
            {allNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link key={item.path} to={item.path}>
                  <button
                    className={`flex items-center gap-1.5 ltr-flex px-2.5 lg:px-3 h-8 rounded-md text-[11px] lg:text-xs font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    }`}
                    title={t(item.labelKey)}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-primary' : ''}`} />
                    <span className="hidden lg:inline">{t(item.labelKey)}</span>
                  </button>
                </Link>
              );
            })}
          </div>

          {/* Actions — right side */}
          <div className="flex items-center gap-1 ltr-flex shrink-0 ms-4">
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
