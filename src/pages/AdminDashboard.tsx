import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Users, FileText, Activity, TrendingUp, Shield, UserCheck, BarChart3 } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { UserManagementTab } from '@/components/UserManagementTab';

interface SystemStats {
  totalUsers: number;
  adminCount: number;
  managerCount: number;
  userCount: number;
  totalDeclarations: number;
  declarationsByStatus: { status: string; count: number; label: string }[];
  recentActivities: {
    id: string;
    type: string;
    message: string;
    timestamp: string;
  }[];
}

const COLORS = {
  admin: 'hsl(var(--destructive))',
  manager: 'hsl(var(--chart-2))',
  user: 'hsl(var(--chart-1))',
  draft: 'hsl(var(--muted))',
  pending: 'hsl(var(--chart-3))',
  signed: 'hsl(var(--chart-1))',
  sent: 'hsl(var(--chart-2))',
  received: 'hsl(var(--primary))',
  returned: 'hsl(var(--chart-4))',
  archived: 'hsl(var(--chart-5))',
  rejected: 'hsl(var(--destructive))',
};

const statusLabels: Record<string, string> = {
  draft: 'مسودة',
  pending_warehouse_signature: 'بانتظار التوقيع',
  warehouse_signed: 'موقّع',
  sent_to_admin_office: 'مُرسل',
  received_by_admin_office: 'مستلم',
  returned_to_warehouse: 'مُعاد',
  archived: 'مؤرشف',
  rejected: 'مرفوض',
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    adminCount: 0,
    managerCount: 0,
    userCount: 0,
    totalDeclarations: 0,
    declarationsByStatus: [],
    recentActivities: [],
  });

  useEffect(() => {
    if (user) {
      loadSystemStats();
    }
  }, [user]);

  const loadSystemStats = async () => {
    try {
      setLoading(true);

      // جلب عدد المستخدمين حسب الصلاحيات
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role');

      if (rolesError) throw rolesError;

      const adminCount = roles?.filter(r => r.role === 'admin').length || 0;
      const managerCount = roles?.filter(r => r.role === 'manager').length || 0;
      const userCount = roles?.filter(r => r.role === 'user').length || 0;

      // جلب إحصائيات الإقرارات
      const { data: declarations, error: declarationsError } = await supabase
        .from('declarations')
        .select('status');

      if (declarationsError) throw declarationsError;

      // تجميع الإقرارات حسب الحالة
      const statusCounts: Record<string, number> = {};
      declarations?.forEach(d => {
        statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;
      });

      const declarationsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
        label: statusLabels[status] || status,
      }));

      // جلب آخر النشاطات من سجل تغيير الحالات
      const { data: activities, error: activitiesError } = await supabase
        .from('declaration_status_history')
        .select(`
          id,
          declaration_id,
          old_status,
          new_status,
          changed_at,
          changed_by,
          profiles!declaration_status_history_changed_by_fkey(username)
        `)
        .order('changed_at', { ascending: false })
        .limit(10);

      if (activitiesError) throw activitiesError;

      const recentActivities = activities?.map(a => ({
        id: a.id,
        type: 'status_change',
        message: `${(a.profiles as any)?.username || 'مستخدم'} قام بتغيير حالة الإقرار ${a.declaration_id} من "${statusLabels[a.old_status || ''] || 'جديد'}" إلى "${statusLabels[a.new_status] || a.new_status}"`,
        timestamp: a.changed_at,
      })) || [];

      setStats({
        totalUsers: roles?.length || 0,
        adminCount,
        managerCount,
        userCount,
        totalDeclarations: declarations?.length || 0,
        declarationsByStatus,
        recentActivities,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const roleData = [
    { name: 'مدير النظام', value: stats.adminCount, color: COLORS.admin },
    { name: 'مدير فرعي', value: stats.managerCount, color: COLORS.manager },
    { name: 'مستخدم', value: stats.userCount, color: COLORS.user },
  ];

  const statusColorMap: Record<string, string> = {
    draft: COLORS.draft,
    pending_warehouse_signature: COLORS.pending,
    warehouse_signed: COLORS.signed,
    sent_to_admin_office: COLORS.sent,
    received_by_admin_office: COLORS.received,
    returned_to_warehouse: COLORS.returned,
    archived: COLORS.archived,
    rejected: COLORS.rejected,
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">جاري التحميل...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">{t('adminDashboardTitle')}</h1>
          </div>
          <p className="text-muted-foreground">{t('adminDashboardSubtitle')}</p>
        </div>

        <Tabs defaultValue="stats" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="stats" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              {t('statistics')}
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              {t('userManagement')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="space-y-6">
            {/* إحصائيات سريعة */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="glass-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalUsers')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">{t('allSystemAccounts')}</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('systemAdmins')}</CardTitle>
              <Shield className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.adminCount}</div>
              <p className="text-xs text-muted-foreground">{t('fullAccess')}</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('managers')}</CardTitle>
              <UserCheck className="h-4 w-4 text-chart-2" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: COLORS.manager }}>{stats.managerCount}</div>
              <p className="text-xs text-muted-foreground">{t('managerialPermissions')}</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalDeclarations')}</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDeclarations}</div>
              <p className="text-xs text-muted-foreground">{t('allDeclarations')}</p>
            </CardContent>
          </Card>
        </div>

        {/* الرسوم البيانية */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* توزيع المستخدمين */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                {t('userDistribution')}
              </CardTitle>
              <CardDescription>{t('rolePercentage')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={roleData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {roleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* توزيع الإقرارات */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                {t('declarationDistribution')}
              </CardTitle>
              <CardDescription>{t('countByStage')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.declarationsByStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="label" 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {stats.declarationsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={statusColorMap[entry.status] || COLORS.user} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* آخر النشاطات */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              {t('recentActivities')}
            </CardTitle>
            <CardDescription>{t('latestSystemChanges')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentActivities.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{t('noRecentActivities')}</p>
              ) : (
                stats.recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 mt-2 rounded-full bg-primary animate-pulse"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{activity.message}</p>
                       <p className="text-xs text-muted-foreground mt-1">
                        {new Date(activity.timestamp).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="users">
            <UserManagementTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
