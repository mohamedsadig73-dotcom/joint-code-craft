import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { StatsCard } from '@/components/ui/StatsCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, FileText, Activity, TrendingUp, Shield, UserCheck, BarChart3, Download, RefreshCw, Clock } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { toGregorianDateTime, toGregorianDate } from '@/utils/dateUtils';
import { exportToExcel } from '@/utils/excelExport';
import { generateDeclarationsPDF } from '@/utils/pdfExport';

interface SystemStats {
  totalUsers: number;
  adminCount: number;
  managerCount: number;
  userCount: number;
  totalDeclarations: number;
  declarationsByStatus: { status: string; count: number; label: string }[];
  declarationsByType: { type: string; count: number }[];
  monthlyTrends: { month: string; دخول: number; خروج: number }[];
  recentActivities: { id: string; type: string; message: string; timestamp: string }[];
  averageProcessingTime: number;
  completionRate: number;
}

const COLORS = {
  admin: 'hsl(var(--destructive))', manager: 'hsl(var(--chart-2))', user: 'hsl(var(--chart-1))',
  draft: 'hsl(var(--muted))', pending: 'hsl(var(--chart-3))', signed: 'hsl(var(--chart-1))',
  sent: 'hsl(var(--chart-2))', received: 'hsl(var(--primary))', returned: 'hsl(var(--chart-4))',
  archived: 'hsl(var(--chart-5))', rejected: 'hsl(var(--destructive))',
  entrance: 'hsl(var(--chart-1))', exit: 'hsl(var(--chart-2))',
};

const statusLabels: Record<string, string> = {
  draft: 'مسودة', pending_warehouse_signature: 'بانتظار التوقيع', warehouse_signed: 'موقّع',
  sent_to_admin_office: 'مُرسل', received_by_admin_office: 'مستلم', returned_to_warehouse: 'مُعاد',
  archived: 'مؤرشف', rejected: 'مرفوض',
};

export default function Reports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0, adminCount: 0, managerCount: 0, userCount: 0, totalDeclarations: 0,
    declarationsByStatus: [], declarationsByType: [], monthlyTrends: [], recentActivities: [],
    averageProcessingTime: 0, completionRate: 0,
  });

  const loadSystemStats = useCallback(async () => {
    try {
      setLoading(true);
      const [rolesResult, declarationsResult, activitiesResult] = await Promise.all([
        supabase.from('user_roles').select('role'),
        supabase.from('declarations').select('status, type, created_at, updated_at').is('deleted_at', null),
        supabase.from('declaration_status_history').select(`id, declaration_id, old_status, new_status, changed_at, changed_by, profiles!declaration_status_history_changed_by_fkey(username)`).order('changed_at', { ascending: false }).limit(15)
      ]);
      if (rolesResult.error) throw rolesResult.error;
      if (declarationsResult.error) throw declarationsResult.error;
      if (activitiesResult.error) throw activitiesResult.error;

      const roles = rolesResult.data || [];
      const declarations = declarationsResult.data || [];
      const activities = activitiesResult.data || [];

      const adminCount = roles.filter(r => r.role === 'admin').length;
      const managerCount = roles.filter(r => r.role === 'manager').length;
      const userCount = roles.filter(r => r.role === 'user').length;

      const statusCounts: Record<string, number> = {};
      declarations.forEach(d => { statusCounts[d.status] = (statusCounts[d.status] || 0) + 1; });
      const declarationsByStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count, label: statusLabels[status] || status }));

      const typeCounts: Record<string, number> = {};
      declarations.forEach(d => { typeCounts[d.type] = (typeCounts[d.type] || 0) + 1; });
      const declarationsByType = Object.entries(typeCounts).map(([type, count]) => ({ type, count }));

      const monthlyData: Record<string, { دخول: number; خروج: number }> = {};
      declarations.forEach(d => {
        const date = new Date(d.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[monthKey]) monthlyData[monthKey] = { دخول: 0, خروج: 0 };
        if (d.type === 'دخول' || d.type === 'خروج') monthlyData[monthKey][d.type]++;
      });
      const monthlyTrends = Object.entries(monthlyData).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short' }), ...data,
      }));

      const archivedCount = declarations.filter(d => d.status === 'archived').length;
      const completionRate = declarations.length > 0 ? Math.round((archivedCount / declarations.length) * 100) : 0;
      const completedDeclarations = declarations.filter(d => d.status === 'archived');
      let totalDays = 0;
      completedDeclarations.forEach(d => {
        totalDays += Math.ceil((new Date(d.updated_at).getTime() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24));
      });
      const averageProcessingTime = completedDeclarations.length > 0 ? Math.round(totalDays / completedDeclarations.length) : 0;
      const recentActivities = activities.map(a => ({
        id: a.id, type: 'status_change',
        message: `${(a.profiles as any)?.username || 'مستخدم'} قام بتغيير حالة الإقرار ${a.declaration_id}`,
        timestamp: a.changed_at,
      }));

      setStats({ totalUsers: roles.length, adminCount, managerCount, userCount, totalDeclarations: declarations.length, declarationsByStatus, declarationsByType, monthlyTrends, recentActivities, averageProcessingTime, completionRate });
    } catch (error: any) { toast({ variant: 'destructive', title: 'خطأ', description: error.message }); }
    finally { setLoading(false); }
  }, [toast, language]);

  useEffect(() => { if (user) loadSystemStats(); }, [user, loadSystemStats]);

  useEffect(() => {
    const channel = supabase.channel('reports-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'declarations' }, () => loadSystemStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'declaration_status_history' }, () => loadSystemStats())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadSystemStats]);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.from('declarations').select(`*, sender:profiles!sender_id(username)`).is('deleted_at', null).order('created_at', { ascending: false });
      if (error) throw error;
      const formattedData = (data || []).map(d => ({ 'رقم الإقرار': d.id, 'النوع': d.type, 'المرسل': d.sender?.username || 'غير معروف', 'الحالة': statusLabels[d.status] || d.status, 'رقم الأرشيف': d.archive_number || '-', 'تاريخ الإنشاء': toGregorianDate(d.created_at) }));
      exportToExcel(formattedData, 'تقرير_الإقرارات');
      toast({ title: t('success'), description: 'تم تصدير التقرير بنجاح' });
    } catch (error: any) { toast({ variant: 'destructive', title: t('error'), description: error.message }); }
    finally { setExporting(false); }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.from('declarations').select(`*, sender:profiles!sender_id(username)`).is('deleted_at', null).order('created_at', { ascending: false });
      if (error) throw error;
      await generateDeclarationsPDF(data || [], 'تقرير الإقرارات');
      toast({ title: t('success'), description: 'تم تصدير التقرير بنجاح' });
    } catch (error: any) { toast({ variant: 'destructive', title: t('error'), description: error.message }); }
    finally { setExporting(false); }
  };

  const roleData = [{ name: t('systemAdmins'), value: stats.adminCount, color: COLORS.admin }, { name: t('managers'), value: stats.managerCount, color: COLORS.manager }, { name: t('regularUser'), value: stats.userCount, color: COLORS.user }];
  const typeData = stats.declarationsByType.map(d => ({ name: d.type, value: d.count, color: d.type === 'دخول' ? COLORS.entrance : COLORS.exit }));
  const statusColorMap: Record<string, string> = { draft: COLORS.draft, pending_warehouse_signature: COLORS.pending, warehouse_signed: COLORS.signed, sent_to_admin_office: COLORS.sent, received_by_admin_office: COLORS.received, returned_to_warehouse: COLORS.returned, archived: COLORS.archived, rejected: COLORS.rejected };

  if (loading) return (<div className="min-h-screen"><Navigation /><main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><div className="space-y-6"><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}</div></div></main></div>);

  return (
    <div className="min-h-screen"><Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs />
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div><div className="flex items-center gap-3 mb-2"><BarChart3 className="w-8 h-8 text-primary" /><h1 className="text-2xl md:text-3xl font-bold gradient-text">{t('reportsTitle')}</h1></div><p className="text-muted-foreground text-sm">{t('reportsSubtitle')}</p></div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadSystemStats} disabled={loading}><RefreshCw className={`w-4 h-4 me-2 ${loading ? 'animate-spin' : ''}`} />{t('refresh')}</Button>
            <Button variant="outline" onClick={handleExportExcel} disabled={exporting}><Download className="w-4 h-4 me-2" />{t('exportExcel')}</Button>
            <Button onClick={handleExportPDF} disabled={exporting}><Download className="w-4 h-4 me-2" />{t('exportPDF')}</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <StatsCard label={t('totalUsers')} value={stats.totalUsers} icon={Users} color="text-primary" bgColor="bg-primary/10" />
          <StatsCard label={t('systemAdmins')} value={stats.adminCount} icon={Shield} color="text-destructive" bgColor="bg-destructive/10" />
          <StatsCard label={t('managers')} value={stats.managerCount} icon={UserCheck} color="text-chart-2" bgColor="bg-chart-2/10" />
          <StatsCard label={t('totalDeclarations')} value={stats.totalDeclarations} icon={FileText} color="text-chart-1" bgColor="bg-chart-1/10" />
          <StatsCard label={t('completionRate')} value={`${stats.completionRate}%`} icon={TrendingUp} color="text-green-600 dark:text-green-400" bgColor="bg-green-500/10" />
          <StatsCard label={t('avgProcessingTime')} value={`${stats.averageProcessingTime}`} icon={Clock} color="text-orange-600 dark:text-orange-400" bgColor="bg-orange-500/10" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="glass-card border-border/50"><CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />{t('userDistribution')}</CardTitle><CardDescription>{t('rolePercentage')}</CardDescription></CardHeader><CardContent><ResponsiveContainer width="100%" height={280}><PieChart><Pie data={roleData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={80} dataKey="value">{roleData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></CardContent></Card>
          <Card className="glass-card border-border/50"><CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" />{t('declarationDistribution')}</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={280}><BarChart data={stats.declarationsByStatus}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} /><YAxis stroke="hsl(var(--muted-foreground))" /><Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} /><Bar dataKey="count" radius={[8, 8, 0, 0]}>{stats.declarationsByStatus.map((entry, index) => <Cell key={`cell-${index}`} fill={statusColorMap[entry.status] || COLORS.user} />)}</Bar></BarChart></ResponsiveContainer></CardContent></Card>
        </div>
        <Card className="glass-card border-border/50"><CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5" />{t('recentActivities')}</CardTitle></CardHeader><CardContent><div className="space-y-3">{stats.recentActivities.length === 0 ? <p className="text-center text-muted-foreground py-8">{t('noRecentActivities')}</p> : stats.recentActivities.map((activity) => <div key={activity.id} className="flex items-start gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"><div className="w-2 h-2 mt-2 rounded-full bg-primary animate-pulse"></div><div className="flex-1"><p className="text-sm">{activity.message}</p><p className="text-xs text-muted-foreground mt-1">{toGregorianDateTime(activity.timestamp)}</p></div></div>)}</div></CardContent></Card>
      </main>
    </div>
  );
}