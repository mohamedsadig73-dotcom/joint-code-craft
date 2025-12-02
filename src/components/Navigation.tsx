import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { NotificationCenter } from '@/components/NotificationCenter';
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
  RefreshCw
} from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
            title: 'جاري التحديث',
            description: 'يتم فحص التحديثات...',
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
              title: 'تحديث متاح',
              description: 'سيتم إعادة تحميل الصفحة لتطبيق التحديث...',
            });
            
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          } else {
            toast({
              title: 'لا توجد تحديثات',
              description: 'أنت تستخدم أحدث إصدار من التطبيق',
            });
            setIsUpdating(false);
          }
        } else {
          toast({
            variant: 'destructive',
            title: 'خطأ',
            description: 'Service Worker غير مسجل',
          });
          setIsUpdating(false);
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'غير مدعوم',
          description: 'متصفحك لا يدعم ميزة Service Worker',
        });
        setIsUpdating(false);
      }
    } catch (error) {
      console.error('Error forcing update:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'فشل التحقق من التحديثات',
      });
      setIsUpdating(false);
    }
  };

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'الرئيسية' },
    { path: '/dashboard', icon: FileText, label: 'الإقرارات' },
    { path: '/manage', icon: FolderOpen, label: 'الإدارة' },
    { path: '/maintenance', icon: Wrench, label: 'الصيانة' },
    { path: '/reports', icon: BarChart3, label: 'التقارير' },
  ];

  // Add admin dashboard link for admins only
  const allNavItems = user?.role === 'admin' 
    ? [
        ...navItems, 
        { path: '/admin', icon: Shield, label: t('adminDashboard') }
      ]
    : navItems;

  return (
    <nav className="glass-card border-b border-border/50 sticky top-0 z-50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold gradient-text">DTS</h1>
            <span className="hidden md:block text-sm text-muted-foreground">
              {t('systemTitle')}
            </span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-2">
            {allNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive(item.path) ? 'secondary' : 'ghost'}
                    size="sm"
                    className="gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            {/* Force Update Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleForceUpdate}
              disabled={isUpdating}
              className="gap-2"
              title="فحص التحديثات"
            >
              <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">تحديث</span>
            </Button>

            {/* Language Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="gap-2"
            >
              <Globe className="w-4 h-4" />
              {language === 'en' ? 'العربية' : 'English'}
            </Button>

            {/* Notifications */}
            <NotificationCenter />

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
                  <User className="w-4 h-4 mr-2" />
                  {t('profile')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/install')}>
                  <Download className="w-4 h-4 mr-2" />
                  تثبيت التطبيق
                </DropdownMenuItem>
                {user?.role === 'admin' && (
                  <DropdownMenuItem onClick={() => navigate('/audit-logs')}>
                    <History className="w-4 h-4 mr-2" />
                    سجل التدقيق
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex justify-around py-2 border-t border-border/50">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive(item.path) ? 'secondary' : 'ghost'}
                  size="sm"
                  className="gap-2"
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs">{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
