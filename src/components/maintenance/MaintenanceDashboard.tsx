import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wrench, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { TableSkeleton, CardSkeleton } from '@/components/ui/TableSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { maintenanceStatusLabels, maintenanceStatusColors, emptyStateMessages } from '@/constants/statusLabels';
import { useMaintenanceRealtime } from '@/hooks/useRealtimeUpdates';
import { formatDate } from '@/utils/dateUtils';

interface DashboardStats {
  totalItems: number;
  pendingTasks: number;
  overdueTasks: number;
  completedThisMonth: number;
  upcomingTasks: {
    id: string;
    item_name: string;
    scheduled_date: string;
    status: string;
  }[];
}

export function MaintenanceDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalItems: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    completedThisMonth: 0,
    upcomingTasks: [],
  });
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      const [itemsRes, pendingRes, overdueRes, completedRes, upcomingRes] = await Promise.all([
        supabase.from('maintenance_items').select('id').eq('active', true),
        supabase.from('maintenance_schedule').select('id').eq('status', 'pending').eq('year', currentYear),
        supabase.from('maintenance_schedule').select('id').eq('status', 'overdue').eq('year', currentYear),
        supabase.from('maintenance_schedule').select('id').eq('status', 'done').eq('year', currentYear).eq('month', currentMonth),
        supabase
          .from('maintenance_schedule')
          .select(`id, scheduled_date, status, maintenance_items!inner(name)`)
          .eq('year', currentMonth === 12 ? currentYear + 1 : currentYear)
          .eq('month', currentMonth === 12 ? 1 : currentMonth + 1)
          .eq('status', 'pending')
          .order('scheduled_date')
          .limit(5),
      ]);

      setStats({
        totalItems: itemsRes.data?.length || 0,
        pendingTasks: pendingRes.data?.length || 0,
        overdueTasks: overdueRes.data?.length || 0,
        completedThisMonth: completedRes.data?.length || 0,
        upcomingTasks: (upcomingRes.data || []).map((task: any) => ({
          id: task.id,
          item_name: task.maintenance_items.name,
          scheduled_date: task.scheduled_date,
          status: task.status,
        })),
      });
    } catch (error: any) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Realtime updates
  useMaintenanceRealtime(loadDashboardData);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold gradient-text">لوحة تحكم الصيانة</h2>
          <p className="text-muted-foreground">نظرة عامة على حالة الصيانة الدورية</p>
        </div>
        <CardSkeleton count={4} />
        <Card className="glass-card border-border/50 p-6">
          <h3 className="text-lg font-semibold mb-4">المهام القادمة</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم البند</TableHead>
                <TableHead>التاريخ المحدد</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableSkeleton rows={5} columns={3} />
            </TableBody>
          </Table>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold gradient-text">لوحة تحكم الصيانة</h2>
        <p className="text-muted-foreground">نظرة عامة على حالة الصيانة الدورية</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card border-border/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Wrench className="w-6 h-6 text-primary" />
            </div>
            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <div className="text-3xl font-bold mb-1">{stats.totalItems}</div>
          <div className="text-sm text-muted-foreground">إجمالي بنود الصيانة</div>
        </Card>

        <Card className="glass-card border-border/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-yellow-500/10">
              <Clock className="w-6 h-6 text-yellow-700 dark:text-yellow-300" />
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">{stats.pendingTasks}</div>
          <div className="text-sm text-muted-foreground">مهام معلقة</div>
        </Card>

        <Card className="glass-card border-border/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-red-500/10">
              <AlertTriangle className="w-6 h-6 text-red-700 dark:text-red-300" />
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">{stats.overdueTasks}</div>
          <div className="text-sm text-muted-foreground">مهام متأخرة</div>
        </Card>

        <Card className="glass-card border-border/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-green-500/10">
              <CheckCircle className="w-6 h-6 text-green-700 dark:text-green-300" />
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">{stats.completedThisMonth}</div>
          <div className="text-sm text-muted-foreground">مكتملة هذا الشهر</div>
        </Card>
      </div>

      {/* Upcoming Tasks */}
      <Card className="glass-card border-border/50 p-6">
        <h3 className="text-lg font-semibold mb-4">المهام القادمة</h3>
        {stats.upcomingTasks.length === 0 ? (
          <EmptyState
            variant="maintenance"
            title={emptyStateMessages.maintenance.title}
            description="لا توجد مهام صيانة قادمة حالياً"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم البند</TableHead>
                <TableHead>التاريخ المحدد</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.upcomingTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.item_name}</TableCell>
                  <TableCell>
                    {formatDate(task.scheduled_date)}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline"
                      className={maintenanceStatusColors[task.status] || 'bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30'}
                    >
                      {maintenanceStatusLabels[task.status] || task.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
