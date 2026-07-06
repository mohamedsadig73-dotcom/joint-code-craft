import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp,
  RefreshCw,
  Activity,
  Users,
  Shield
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { CardSkeleton } from '@/components/ui/TableSkeleton';
import { formatDateTime } from '@/utils/dateUtils';
import { StatsCard } from '@/components/ui/StatsCard';
import { 
  statusLabels, 
  statusColors,
  auditActionLabels 
} from '@/constants/statusLabels';

interface DashboardStats {
  totalDeclarations: number;
  pendingCount: number;
  completedCount: number;
  overdueCount: number;
  thisMonthCount: number;
  lastMonthCount: number;
}

interface RecentActivity {
  id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  created_at: string;
  profiles?: {
    username: string;
  } | null;
}

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Get declarations stats
      const { data: declarations, error: decError } = await supabase
        .from('declarations')
        .select('id, status, created_at, deleted_at')
        .is('deleted_at', null);

      if (decError) throw decError;

      // Calculate stats
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const statsData: DashboardStats = {
        totalDeclarations: declarations?.length || 0,
        pendingCount: declarations?.filter(d => 
          ['pending_warehouse_signature', 'sent_to_admin_office'].includes(d.status)
        ).length || 0,
        completedCount: declarations?.filter(d => 
          ['archived', 'returned_to_warehouse'].includes(d.status)
        ).length || 0,
        overdueCount: declarations?.filter(d => {
          const createdAt = new Date(d.created_at);
          const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
          return d.status === 'sent_to_admin_office' && daysSinceCreation > 7;
        }).length || 0,
        thisMonthCount: declarations?.filter(d => 
          new Date(d.created_at) >= thisMonthStart
        ).length || 0,
        lastMonthCount: declarations?.filter(d => {
          const createdAt = new Date(d.created_at);
          return createdAt >= lastMonthStart && createdAt <= lastMonthEnd;
        }).length || 0,
      };

      setStats(statsData);

      // Calculate status breakdown
      const breakdown: Record<string, number> = {};
      declarations?.forEach(d => {
        breakdown[d.status] = (breakdown[d.status] || 0) + 1;
      });
      setStatusBreakdown(breakdown);

      // Get recent activities (limited for manager role)
      const { data: activities, error: actError } = await supabase
        .from('audit_logs')
        .select('id, action, table_name, record_id, created_at, user_id')
        .in('table_name', ['declarations', 'maintenance_items', 'maintenance_schedule'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (actError) throw actError;

      // Get user profiles for activities
      const userIds = [...new Set(activities?.map(a => a.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const activitiesWithProfiles = activities?.map(activity => ({
        ...activity,
        profiles: profilesMap.get(activity.user_id) || null,
      })) || [];

      setRecentActivities(activitiesWithProfiles as RecentActivity[]);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      toast({
        title: 'خطأ',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'manager' || user?.role === 'admin') {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

  const growthRate = useMemo(() => {
    if (!stats || stats.lastMonthCount === 0) return 0;
    return Math.round(((stats.thisMonthCount - stats.lastMonthCount) / stats.lastMonthCount) * 100);
  }, [stats]);

  // Access control
  if (user?.role !== 'manager' && user?.role !== 'admin') {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="glass-card border-border/50 p-8 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">غير مصرح</h2>
            <p className="text-muted-foreground">هذه الصفحة متاحة للمدراء فقط</p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">لوحة تحكم المدير</h1>
              <p className="text-muted-foreground text-sm mt-0.5">نظرة عامة على الإقرارات والنشاطات</p>
            </div>
          </div>
          <Button onClick={loadDashboardData} variant="outline" disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>

        {/* Stats Cards */}
        {loading ? (
          <CardSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              label="إجمالي الإقرارات"
              value={stats?.totalDeclarations || 0}
              icon={FileText}
              color="text-primary"
              bgColor="bg-primary/10"
              trend={growthRate !== 0 ? { value: Math.abs(growthRate), isPositive: growthRate > 0 } : undefined}
            />
            <StatsCard
              label="قيد المعالجة"
              value={stats?.pendingCount || 0}
              icon={Clock}
              color="text-yellow-600"
              bgColor="bg-yellow-500/10"
            />
            <StatsCard
              label="مكتملة"
              value={stats?.completedCount || 0}
              icon={CheckCircle2}
              color="text-green-600"
              bgColor="bg-green-500/10"
            />
            <StatsCard
              label="متأخرة"
              value={stats?.overdueCount || 0}
              icon={AlertTriangle}
              color="text-red-600"
              bgColor="bg-red-500/10"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Status Breakdown */}
          <Card className="glass-card border-border/50 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">توزيع الحالات</h3>
            </div>
            
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(statusBreakdown).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <Badge className={statusColors[status as keyof typeof statusColors] || 'bg-gray-500/20'}>
                      {statusLabels[status as keyof typeof statusLabels] || status}
                    </Badge>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
                {Object.keys(statusBreakdown).length === 0 && (
                  <p className="text-muted-foreground text-center py-4">لا توجد بيانات</p>
                )}
              </div>
            )}
          </Card>

          {/* Recent Activities */}
          <Card className="glass-card border-border/50 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-secondary/10">
                <Activity className="w-5 h-5 text-secondary" />
              </div>
              <h3 className="text-lg font-semibold">آخر النشاطات</h3>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-16 bg-muted/50 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {recentActivities.map((activity) => (
                  <div 
                    key={activity.id} 
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="p-2 rounded-full bg-primary/10 mt-0.5">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {activity.profiles?.username || 'مستخدم'}
                        <span className="text-muted-foreground mx-2">•</span>
                        <span className="text-muted-foreground">
                          {auditActionLabels[activity.action as keyof typeof auditActionLabels] || activity.action}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDateTime(activity.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                {recentActivities.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">لا توجد نشاطات حديثة</p>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Monthly Comparison */}
        <Card className="glass-card border-border/50 p-6 mt-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold">مقارنة شهرية</h3>
          </div>
          
          {loading ? (
            <div className="h-24 bg-muted/50 rounded animate-pulse" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 rounded-lg bg-muted/30">
                <p className="text-3xl font-bold text-primary">{stats?.thisMonthCount || 0}</p>
                <p className="text-sm text-muted-foreground mt-1">هذا الشهر</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/30">
                <p className="text-3xl font-bold text-muted-foreground">{stats?.lastMonthCount || 0}</p>
                <p className="text-sm text-muted-foreground mt-1">الشهر الماضي</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/30">
                <p className={`text-3xl font-bold ${growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {growthRate >= 0 ? '+' : ''}{growthRate}%
                </p>
                <p className="text-sm text-muted-foreground mt-1">نسبة النمو</p>
              </div>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}