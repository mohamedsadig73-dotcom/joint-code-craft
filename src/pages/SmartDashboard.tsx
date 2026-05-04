import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStockAlerts } from '@/hooks/useStockAlerts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/ui/StatsCard';
import { CardSkeleton } from '@/components/ui/TableSkeleton';
import {
  FileText, Package, Wrench, Wallet, AlertTriangle, Clock,
  CheckCircle2, Plus, ArrowRight, Activity, Users, Shield,
  CalendarDays, BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * P3: Role-aware Smart Dashboard.
 * Replaces the static App Launcher (Home).
 * Sections:
 *  - Welcome / hero
 *  - KPIs (counts)
 *  - Alerts (overdue, low stock)
 *  - Pending items (require my action)
 *  - Quick Actions (role-filtered)
 */

type Role = 'admin' | 'manager' | 'user';

interface QuickAction {
  path: string;
  labelKey: string;
  fallback: string;
  icon: typeof FileText;
  color: string;
  bg: string;
  roles?: Role[];
}

const QUICK_ACTIONS: QuickAction[] = [
  { path: '/declarations',       labelKey: 'declarations',         fallback: 'الإقرارات',       icon: FileText,    color: 'text-blue-600',    bg: 'bg-blue-500/10' },
  { path: '/inventory',          labelKey: 'inventoryManagement',  fallback: 'المخزن',          icon: Package,     color: 'text-cyan-600',    bg: 'bg-cyan-500/10' },
  { path: '/maintenance',        labelKey: 'maintenance',          fallback: 'الصيانة',         icon: Wrench,      color: 'text-orange-600',  bg: 'bg-orange-500/10' },
  { path: '/petty-cash',         labelKey: 'pettyCash',            fallback: 'العهد',           icon: Wallet,      color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  { path: '/leave-tracking',     labelKey: 'leaveTracking',        fallback: 'الإجازات',        icon: CalendarDays,color: 'text-purple-600',  bg: 'bg-purple-500/10' },
  { path: '/reports-analytics',  labelKey: 'reports',              fallback: 'التقارير',        icon: BarChart3,   color: 'text-sky-600',     bg: 'bg-sky-500/10' },
  { path: '/employees',          labelKey: 'employeesManagement',  fallback: 'الموظفون',        icon: Users,       color: 'text-indigo-600',  bg: 'bg-indigo-500/10', roles: ['admin', 'manager'] },
  { path: '/admin',              labelKey: 'adminDashboard',       fallback: 'الإدارة',         icon: Shield,      color: 'text-red-600',     bg: 'bg-red-500/10', roles: ['admin'] },
];

interface DashStats {
  totalDeclarations: number;
  pending: number;
  completed: number;
  overdue: number;
  lowStock: number;
}

export default function SmartDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const role = (user?.role || 'user') as Role;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashStats>({
    totalDeclarations: 0, pending: 0, completed: 0, overdue: 0, lowStock: 0,
  });
  const { rows: stockRows } = useStockAlerts();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const decRes = await supabase
        .from('declarations')
        .select('id, status, created_at, deleted_at')
        .is('deleted_at', null);

      const decs = decRes.data || [];
      const now = Date.now();

      const pending = decs.filter(d =>
        ['pending_warehouse_signature', 'sent_to_admin_office'].includes(d.status as string)
      ).length;
      const completed = decs.filter(d =>
        ['archived', 'returned_to_warehouse'].includes(d.status as string)
      ).length;
      const overdue = decs.filter(d => {
        const days = (now - new Date(d.created_at).getTime()) / 86_400_000;
        return d.status === 'sent_to_admin_office' && days > 7;
      }).length;
      setStats({
        totalDeclarations: decs.length,
        pending, completed, overdue,
        lowStock: 0, // populated from useStockAlerts in render
      });
    } catch (e) {
      // silent — dashboard should not block on errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visibleActions = useMemo(
    () => QUICK_ACTIONS.filter(a => !a.roles || a.roles.includes(role)),
    [role]
  );

  const alerts = useMemo(() => {
    const lowStock = stockRows.filter(r =>
      r.alert_level === 'out_of_stock' || r.alert_level === 'below_min' || r.alert_level === 'reorder'
    ).length;
    const out: Array<{ key: string; label: string; count: number; tone: 'danger' | 'warning'; path: string; icon: typeof AlertTriangle }> = [];
    if (stats.overdue > 0) out.push({ key: 'overdue', label: t('overdueDeclarations') || 'إقرارات متأخرة', count: stats.overdue, tone: 'danger', path: '/declarations', icon: Clock });
    if (lowStock > 0) out.push({ key: 'low', label: t('lowStockAlerts') || 'تنبيهات نقص المخزون', count: lowStock, tone: 'warning', path: '/inventory?tab=alerts', icon: AlertTriangle });
    return out;
  }, [stats, stockRows, t]);

  return (
    <div className="space-y-6 pb-8">
      {/* Hero */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold leading-tight">
            {t('welcomeBack') || 'مرحباً'}{user?.username ? `, ${user.username}` : ''}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('dashboardSubtitle') || 'نظرة سريعة على نشاطك اليومي'}
          </p>
        </div>
        <Button onClick={() => navigate('/declarations')} className="gap-2">
          <Plus className="w-4 h-4" />
          {t('newDeclaration') || 'إقرار جديد'}
        </Button>
      </div>

      {/* Alerts */}
      {!loading && alerts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {alerts.map(a => {
            const Icon = a.icon;
            return (
              <button
                key={a.key}
                onClick={() => navigate(a.path)}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-xl border p-4 text-start transition-colors hover:bg-muted/30',
                  a.tone === 'danger'
                    ? 'border-destructive/30 bg-destructive/5'
                    : 'border-amber-500/30 bg-amber-500/5'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                    a.tone === 'danger' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-600'
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{a.label}</div>
                    <div className="text-xs text-muted-foreground">{a.count} {t('items') || 'عنصر'}</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground rtl:rotate-180" />
              </button>
            );
          })}
        </div>
      )}

      {/* KPIs */}
      {loading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatsCard
            label={t('totalDeclarations') || 'إجمالي الإقرارات'}
            value={stats.totalDeclarations}
            icon={FileText}
            color="text-primary"
            bgColor="bg-primary/10"
          />
          <StatsCard
            label={t('pendingItems') || 'بانتظار الإجراء'}
            value={stats.pending}
            icon={Clock}
            color="text-amber-600"
            bgColor="bg-amber-500/10"
          />
          <StatsCard
            label={t('completed') || 'منجزة'}
            value={stats.completed}
            icon={CheckCircle2}
            color="text-emerald-600"
            bgColor="bg-emerald-500/10"
          />
          <StatsCard
            label={t('overdue') || 'متأخرة'}
            value={stats.overdue}
            icon={AlertTriangle}
            color="text-destructive"
            bgColor="bg-destructive/10"
          />
        </div>
      )}

      {/* Quick Actions */}
      <Card className="p-4 md:p-5 border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
            {t('quickActions') || 'إجراءات سريعة'}
          </h2>
          <Badge variant="secondary" className="text-[10px]">{visibleActions.length}</Badge>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {visibleActions.map(a => {
            const Icon = a.icon;
            return (
              <button
                key={a.path}
                onClick={() => navigate(a.path)}
                className={cn(
                  'group flex flex-col items-center gap-2 rounded-xl border border-border/50 p-4',
                  'bg-card hover:bg-muted/30 hover:border-border transition-all',
                  'active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                )}
              >
                <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', a.bg)}>
                  <Icon className={cn('w-5 h-5', a.color)} />
                </div>
                <span className="text-xs md:text-sm font-medium text-center leading-tight">
                  {t(a.labelKey) || a.fallback}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Role-aware footer hint for managers/admins */}
      {(role === 'manager' || role === 'admin') && (
        <Card className="p-4 border-border/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">
                {role === 'admin' ? (t('adminDashboard') || 'لوحة الإدارة') : (t('managerDashboard') || 'لوحة المدير')}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {t('viewDetailedAnalytics') || 'عرض التحليلات التفصيلية والنشاطات'}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(role === 'admin' ? '/admin' : '/manager-dashboard')}
            className="gap-2 shrink-0"
          >
            {t('open') || 'فتح'}
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </Button>
        </Card>
      )}
    </div>
  );
}