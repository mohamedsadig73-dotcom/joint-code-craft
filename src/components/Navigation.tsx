import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { NotificationCenter } from '@/components/NotificationCenter';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { ThemeToggleSimple } from '@/components/ThemeToggle';
import { 
  LayoutDashboard, 
  Warehouse, 
  BarChart3, 
  LogOut, 
  User,
  Globe,
  Shield,
  Download,
  Wrench,
  History,
  RefreshCw,
  Package,
  MapPin,
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardList,
  Truck,
  ChevronDown,
  AlertTriangle,
  RotateCcw,
  ArrowRightLeft,
  Hash,
  Ship,
  Target,
  Users,
  Keyboard,
  BrainCircuit,
  Globe2,
  Building2,
  Receipt,
  ShoppingCart,
  Thermometer,
  Factory
} from 'lucide-react';
import { useState } from 'react';
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
} from '@/components/ui/dropdown-menu';

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
    
    try {
      // التحقق من وجود service worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        
        if (registration) {
          // إجبار التحديث
          await registration.update();
          
          toast({
            title: t('checkingUpdates'),
            description: t('checkingUpdates') + '...',
          });
          
          // انتظار التحديث الجديد
          const waitForUpdate = new Promise<boolean>((resolve) => {
            const timeout = setTimeout(() => resolve(false), 5000);
            
            registration.addEventListener('updatefound', () => {
              clearTimeout(timeout);
              const newWorker = registration.installing;
              
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    resolve(true);
                  }
                });
              }
            });
          });
          
          const hasUpdate = await waitForUpdate;
          
          if (hasUpdate) {
            toast({
              title: t('updateAvailable'),
              description: t('pageWillReload'),
            });
            
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          } else {
            toast({
              title: t('noUpdates'),
              description: t('youUsingLatest'),
            });
            setIsUpdating(false);
          }
        } else {
          toast({
            variant: 'destructive',
            title: t('error'),
            description: t('serviceWorkerNotRegistered'),
          });
          setIsUpdating(false);
        }
      } else {
        toast({
          variant: 'destructive',
          title: t('notSupported'),
          description: t('browserNotSupport'),
        });
        setIsUpdating(false);
      }
    } catch (error) {
      console.error('Error forcing update:', error);
      toast({
        variant: 'destructive',
        title: t('error'),
        description: t('updateCheckFailed'),
      });
      setIsUpdating(false);
    }
  };

  const wmsSubItems = [
    { path: '/wms', icon: LayoutDashboard, labelKey: 'wmsDashboard' },
    { path: '/wms/products', icon: Package, labelKey: 'wmsProducts' },
    { path: '/wms/inventory', icon: Boxes, labelKey: 'wmsInventory' },
    { path: '/wms/locations', icon: MapPin, labelKey: 'wmsLocations' },
    { path: '/wms/inbound', icon: ArrowDownToLine, labelKey: 'wmsInbound' },
    { path: '/wms/outbound', icon: ArrowUpFromLine, labelKey: 'wmsOutbound' },
    { path: '/wms/suppliers', icon: Truck, labelKey: 'wmsSuppliers' },
    { path: '/wms/customers', icon: Users, labelKey: 'wmsCustomers' },
    { path: '/wms/transactions', icon: ClipboardList, labelKey: 'wmsTransactions' },
    { path: '/wms/cycle-count', icon: BarChart3, labelKey: 'wmsCycleCount' },
    { path: '/wms/shipments', icon: Ship, labelKey: 'wmsShipments' },
    { path: '/wms/rma', icon: RotateCcw, labelKey: 'wmsRMA' },
    { path: '/wms/cross-dock', icon: ArrowRightLeft, labelKey: 'wmsCrossDock' },
    { path: '/wms/serial-numbers', icon: Hash, labelKey: 'wmsSerialNumbers' },
    { path: '/wms/reports', icon: BarChart3, labelKey: 'wmsReports' },
    { path: '/wms/advanced-reports', icon: Target, labelKey: 'wmsAdvancedReports' },
    { path: '/wms/predictive-analytics', icon: BrainCircuit, labelKey: 'wmsPredictiveAnalytics' },
    ...(user?.role === 'admin' || user?.role === 'manager' ? [{ path: '/wms/worker-productivity', icon: Users, labelKey: 'wmsWorkerProductivity' }] : []),
    { path: '/wms/customer-portal', icon: Globe2, labelKey: 'wmsCustomerPortal' },
    { path: '/wms/3pl-tenants', icon: Building2, labelKey: 'wms3PLTenants' },
    { path: '/wms/billing', icon: Receipt, labelKey: 'wmsBilling' },
    { path: '/wms/ecommerce', icon: ShoppingCart, labelKey: 'wmsEcommerce' },
    { path: '/wms/temperature-zones', icon: Thermometer, labelKey: 'wmsTemperatureZones' },
    { path: '/wms/mes', icon: Factory, labelKey: 'wmsMES' },
    { path: '/wms/alerts', icon: AlertTriangle, labelKey: 'wmsAlerts' },
  ];

  const navItems = [
    { path: '/', icon: LayoutDashboard, labelKey: 'declarations' },
    { path: '/maintenance', icon: Wrench, labelKey: 'maintenance' },
    { path: '/reports-analytics', icon: BarChart3, labelKey: 'reportsTitle' },
  ];

  // Add admin dashboard link for admins only
  const allNavItems = user?.role === 'admin' 
    ? [
        ...navItems, 
        { path: '/admin', icon: Shield, labelKey: 'adminDashboard' }
      ]
    : navItems;

  return (
    <nav className="glass-card border-b border-border/50 sticky top-0 z-50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold gradient-text">WMS</h1>
            <span className="hidden md:block text-sm text-muted-foreground">
              {t('systemTitle')}
            </span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-2">
            {/* WMS Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={location.pathname.startsWith('/wms') ? 'secondary' : 'ghost'}
                  size="sm"
                  className="gap-2"
                >
                  <Warehouse className="w-4 h-4" />
                  {t('wmsTitle')}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {wmsSubItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem key={item.path} onClick={() => navigate(item.path)} className="gap-2 cursor-pointer">
                      <Icon className="w-4 h-4" />
                      {t(item.labelKey)}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {allNavItems.map((item) => {
              const Icon = item.icon;
              const isReportsLink = item.path === '/reports-analytics';
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive(item.path) ? 'secondary' : 'ghost'}
                    size="sm"
                    className="gap-2"
                    data-tour={isReportsLink ? 'nav-reports' : undefined}
                  >
                    <Icon className="w-4 h-4" />
                    {t(item.labelKey)}
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            {/* Offline Indicator */}
            <OfflineIndicator />
            
            {/* Force Update Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleForceUpdate}
              disabled={isUpdating}
              className="gap-2"
              title={t('checkingUpdates')}
            >
              <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">{t('forceUpdate')}</span>
            </Button>

            {/* Theme Toggle */}
            <ThemeToggleSimple />

            {/* Language Toggle - More Prominent */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLanguage}
              className="gap-2 bg-primary/10 hover:bg-primary/20 border-primary/30"
              title={t('switchLanguage')}
            >
              <Globe className="w-4 h-4 text-primary" />
              <span className="font-medium">{language === 'en' ? 'العربية' : 'English'}</span>
            </Button>

            {/* Notifications */}
            <div data-tour="notifications">
              <NotificationCenter />
            </div>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium">{user?.username}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="w-4 h-4 me-2" />
                  {t('profile')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/install')}>
                  <Download className="w-4 h-4 me-2" />
                  {t('installApp')}
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

        {/* Mobile Navigation */}
        <div className="md:hidden flex justify-around py-2 border-t border-border/50 overflow-x-auto">
          <Link to="/">
            <Button variant={isActive('/') ? 'secondary' : 'ghost'} size="sm" className="gap-1 px-2">
              <LayoutDashboard className="w-4 h-4" />
              <span className="text-xs">{t('declarations')}</span>
            </Button>
          </Link>
          <Link to="/wms">
            <Button variant={location.pathname.startsWith('/wms') ? 'secondary' : 'ghost'} size="sm" className="gap-1 px-2">
              <Warehouse className="w-4 h-4" />
              <span className="text-xs">{t('wmsTitle')}</span>
            </Button>
          </Link>
          <Link to="/maintenance">
            <Button variant={isActive('/maintenance') ? 'secondary' : 'ghost'} size="sm" className="gap-1 px-2">
              <Wrench className="w-4 h-4" />
              <span className="text-xs">{t('maintenance')}</span>
            </Button>
          </Link>
          <Link to="/reports-analytics">
            <Button variant={isActive('/reports-analytics') ? 'secondary' : 'ghost'} size="sm" className="gap-1 px-2">
              <BarChart3 className="w-4 h-4" />
              <span className="text-xs">{t('reportsTitle')}</span>
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
