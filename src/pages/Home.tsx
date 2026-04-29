import { useNavigate } from 'react-router-dom';
import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigation } from '@/components/Navigation';
import { 
  FileText, 
  Wrench, 
  Wallet, 
  CalendarDays, 
  BarChart3, 
  Users, 
  Shield, 
  ClipboardList,
  Search,
  X,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface AppModule {
  path: string;
  icon: typeof FileText;
  labelKey: string;
  description: string;
  color: string;
  bgColor: string;
  roles?: string[];
}

const appModules: AppModule[] = [
  {
    path: '/declarations',
    icon: FileText,
    labelKey: 'declarations',
    description: 'إدارة الإقرارات والمعاملات',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10 dark:bg-blue-500/20',
  },
  {
    path: '/maintenance',
    icon: Wrench,
    labelKey: 'maintenance',
    description: 'الصيانة الدورية والجدولة',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500/10 dark:bg-orange-500/20',
  },
  {
    path: '/boxes',
    icon: Package,
    labelKey: 'boxesManagement',
    description: 'استلام البضائع وإدارة الصناديق',
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-500/10 dark:bg-rose-500/20',
  },
  {
    path: '/inventory',
    icon: Package,
    labelKey: 'inventoryManagement',
    description: 'إدارة المخزن: استلام، صرف، نقل، عُهد',
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-500/10 dark:bg-cyan-500/20',
  },
  {
    path: '/petty-cash',
    icon: Wallet,
    labelKey: 'pettyCash',
    description: 'إدارة العهد والمصاريف النثرية',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/20',
  },
  {
    path: '/leave-tracking',
    icon: CalendarDays,
    labelKey: 'leaveTracking',
    description: 'متابعة الإجازات والأرصدة',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-500/10 dark:bg-purple-500/20',
  },
  {
    path: '/holiday-attendance',
    icon: ClipboardList,
    labelKey: 'holidayAttendance',
    description: 'كشوف حضور العطل الرسمية',
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-500/10 dark:bg-teal-500/20',
  },
  {
    path: '/employees',
    icon: Users,
    labelKey: 'employeesManagement',
    description: 'إدارة بيانات الموظفين',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-500/10 dark:bg-indigo-500/20',
  },
  {
    path: '/reports-analytics',
    icon: BarChart3,
    labelKey: 'reports',
    description: 'التقارير والتحليلات',
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-500/10 dark:bg-cyan-500/20',
  },
  {
    path: '/manager-dashboard',
    icon: BarChart3,
    labelKey: 'managerDashboard',
    description: 'لوحة تحكم المدير',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10 dark:bg-amber-500/20',
    roles: ['manager', 'admin'],
  },
  {
    path: '/admin',
    icon: Shield,
    labelKey: 'adminDashboard',
    description: 'إدارة النظام والمستخدمين',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-500/10 dark:bg-red-500/20',
    roles: ['admin'],
  },
];

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');

  const visibleModules = useMemo(() => 
    appModules.filter(mod => {
      if (mod.roles && !mod.roles.includes(user?.role || '')) return false;
      return true;
    }),
    [user?.role]
  );

  const filteredModules = useMemo(() => {
    if (!search.trim()) return visibleModules;
    const q = search.toLowerCase();
    return visibleModules.filter(mod => 
      t(mod.labelKey).toLowerCase().includes(q) || 
      mod.description.toLowerCase().includes(q)
    );
  }, [search, visibleModules, t]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Minimal navbar - no module links */}
      <Navigation minimal />

      {/* Centered content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
        <div className="w-full max-w-4xl">
          {/* Welcome */}
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold mb-1.5">
              {t('welcomeBack')}{user?.username ? `, ${user.username}` : ''}
            </h1>
            <p className="text-muted-foreground text-sm">
              اختر القسم الذي تريد الوصول إليه
            </p>
          </div>

          {/* Search bar */}
          <div className="relative max-w-md mx-auto mb-10">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن قسم..."
              dir="rtl"
              className="ps-10 pe-9 h-11 rounded-xl bg-muted/40 border-border/40 focus-visible:bg-background"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* App Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {filteredModules.map((mod) => {
              const Icon = mod.icon;
              return (
                <button
                  key={mod.path}
                  onClick={() => navigate(mod.path)}
                  className={cn(
                    'group relative flex flex-col items-center gap-3 p-6 md:p-8',
                    'rounded-2xl border border-border/50',
                    'bg-card hover:bg-card/80',
                    'transition-all duration-300 ease-out',
                    'hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1',
                    'active:scale-[0.97]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  )}
                >
                  <div className={cn(
                    'flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-2xl',
                    'transition-transform duration-300 group-hover:scale-110',
                    mod.bgColor
                  )}>
                    <Icon className={cn('w-7 h-7 md:w-8 md:h-8', mod.color)} />
                  </div>

                  <span className="text-sm md:text-base font-semibold text-center leading-tight">
                    {t(mod.labelKey)}
                  </span>

                  <span className="hidden md:block text-xs text-muted-foreground text-center leading-relaxed">
                    {mod.description}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Empty search state */}
          {filteredModules.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">لا توجد نتائج لـ "{search}"</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
