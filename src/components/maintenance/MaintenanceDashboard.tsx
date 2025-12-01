import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wrench, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';

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

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      // جلب البنود النشطة
      const { data: items, error: itemsError } = await supabase
        .from('maintenance_items')
        .select('id')
        .eq('active', true);

      if (itemsError) throw itemsError;

      // جلب المهام المعلقة
      const { data: pending, error: pendingError } = await supabase
        .from('maintenance_schedule')
        .select('id')
        .eq('status', 'pending')
        .eq('year', currentYear);

      if (pendingError) throw pendingError;

      // جلب المهام المتأخرة
      const { data: overdue, error: overdueError } = await supabase
        .from('maintenance_schedule')
        .select('id')
        .eq('status', 'overdue')
        .eq('year', currentYear);

      if (overdueError) throw overdueError;

      // جلب المهام المكتملة هذا الشهر
      const { data: completed, error: completedError } = await supabase
        .from('maintenance_schedule')
        .select('id')
        .eq('status', 'done')
        .eq('year', currentYear)
        .eq('month', currentMonth);

      if (completedError) throw completedError;

      // جلب المهام القادمة (الشهر القادم)
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

      const { data: upcoming, error: upcomingError } = await supabase
        .from('maintenance_schedule')
        .select(`
          id,
          scheduled_date,
          status,
          maintenance_items!inner(name)
        `)
        .eq('year', nextYear)
        .eq('month', nextMonth)
        .eq('status', 'pending')
        .order('scheduled_date')
        .limit(5);

      if (upcomingError) throw upcomingError;

      setStats({
        totalItems: items?.length || 0,
        pendingTasks: pending?.length || 0,
        overdueTasks: overdue?.length || 0,
        completedThisMonth: completed?.length || 0,
        upcomingTasks: (upcoming || []).map((task: any) => ({
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
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
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
            <TrendingUp className="w-4 h-4 text-success" />
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>اسم البند</TableHead>
              <TableHead>التاريخ المحدد</TableHead>
              <TableHead>الحالة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  جاري التحميل...
                </TableCell>
              </TableRow>
            ) : stats.upcomingTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  لا توجد مهام قادمة
                </TableCell>
              </TableRow>
            ) : (
              stats.upcomingTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.item_name}</TableCell>
                  <TableCell>
                    {new Date(task.scheduled_date).toLocaleDateString('ar-SA')}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline"
                      className={
                        task.status === 'pending' 
                          ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30'
                          : task.status === 'done'
                          ? 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30'
                          : task.status === 'overdue'
                          ? 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30'
                          : 'bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30'
                      }
                    >
                      {task.status === 'pending' && 'مطلوب'}
                      {task.status === 'done' && 'تم'}
                      {task.status === 'not_required' && 'غير مطلوب'}
                      {task.status === 'overdue' && 'متأخر'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
