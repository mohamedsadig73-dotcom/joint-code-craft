/**
 * ⚠️ TECH DEBT NOTICE
 * This file (689 lines) exceeds the recommended 300-line limit.
 * Planned refactor (post-release):
 * - Extract: ReportsHeader, ReportsKPIs, ReportsCharts, ReportsExport
 * - Extract: useReportsData.ts hook for data/logic
 * - No UI, DB, or logic changes — extraction only
 * Ticket: TECH-DEBT-001
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { StatsCard } from '@/components/ui/StatsCard';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format, subDays, startOfDay, endOfDay, startOfYear, endOfYear, getYear } from 'date-fns';
import { 
  Users, FileText, Activity, TrendingUp, Shield, UserCheck, 
  BarChart3, Download, RefreshCw, Clock, CalendarIcon, 
  PieChartIcon, LineChart, LayoutGrid
} from 'lucide-react';
import { 
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, LineChart as RechartsLineChart, Line 
} from 'recharts';
import { toGregorianDateTime, toGregorianDate } from '@/utils/dateUtils';
import { exportDeclarationsToExcel } from '@/utils/excelExport';
import { exportDeclarationsToPDFSecure } from '@/utils/pdfExportSecure';
import { statusLabels, CHART_COLORS } from '@/constants/statusLabels';

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
  weeklyActivity: { day: string; count: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  draft: CHART_COLORS.draft,
  pending_warehouse_signature: CHART_COLORS.pending,
  warehouse_signed: CHART_COLORS.signed,
  sent_to_admin_office: CHART_COLORS.sent,
  received_by_admin_office: CHART_COLORS.received,
  returned_to_warehouse: CHART_COLORS.returned,
  archived: CHART_COLORS.archived,
  rejected: CHART_COLORS.rejected,
};

export default function ReportsAnalytics() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Year selector state - default to current year
  const currentYear = getYear(new Date());
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  
  // Date range state - linked to selected year
  const [dateFrom, setDateFrom] = useState<Date>(startOfYear(new Date(selectedYear, 0, 1)));
  const [dateTo, setDateTo] = useState<Date>(endOfYear(new Date(selectedYear, 0, 1)));
  
  // Generate available years (last 5 years + current)
  const availableYears = useMemo(() => {
    const years = [];
    for (let y = currentYear; y >= currentYear - 5; y--) {
      years.push(y);
    }
    return years;
  }, [currentYear]);
  
  // Handle year change
  const handleYearChange = useCallback((year: string) => {
    const yearNum = parseInt(year);
    setSelectedYear(yearNum);
    setDateFrom(startOfYear(new Date(yearNum, 0, 1)));
    setDateTo(endOfYear(new Date(yearNum, 0, 1)));
    // Save to localStorage
    localStorage.setItem('reports_selected_year', year);
  }, []);
  
  // Load saved year from localStorage on mount
  useEffect(() => {
    const savedYear = localStorage.getItem('reports_selected_year');
    if (savedYear) {
      const yearNum = parseInt(savedYear);
      if (yearNum >= currentYear - 5 && yearNum <= currentYear) {
        setSelectedYear(yearNum);
        setDateFrom(startOfYear(new Date(yearNum, 0, 1)));
        setDateTo(endOfYear(new Date(yearNum, 0, 1)));
      }
    }
  }, [currentYear]);
  
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0, adminCount: 0, managerCount: 0, userCount: 0, totalDeclarations: 0,
    declarationsByStatus: [], declarationsByType: [], monthlyTrends: [], recentActivities: [],
    averageProcessingTime: 0, completionRate: 0, weeklyActivity: [],
  });

  const loadSystemStats = useCallback(async () => {
    try {
      setLoading(true);
      
      const fromDate = startOfDay(dateFrom).toISOString();
      const toDate = endOfDay(dateTo).toISOString();
      
      const [rolesResult, declarationsResult, activitiesResult] = await Promise.all([
        supabase.from('user_roles').select('role'),
        supabase.from('declarations')
          .select('status, type, created_at, updated_at')
          .is('deleted_at', null)
          .gte('created_at', fromDate)
          .lte('created_at', toDate),
        supabase.from('declaration_status_history')
          .select(`id, declaration_id, old_status, new_status, changed_at, changed_by, profiles!declaration_status_history_changed_by_fkey(username)`)
          .gte('changed_at', fromDate)
          .lte('changed_at', toDate)
          .order('changed_at', { ascending: false })
          .limit(15)
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
      const declarationsByStatus = Object.entries(statusCounts).map(([status, count]) => ({ 
        status, count, label: statusLabels[status] || status 
      }));

      const typeCounts: Record<string, number> = {};
      declarations.forEach(d => { typeCounts[d.type] = (typeCounts[d.type] || 0) + 1; });
      const declarationsByType = Object.entries(typeCounts).map(([type, count]) => ({ type, count }));

      // Monthly trends
      const monthlyData: Record<string, { دخول: number; خروج: number }> = {};
      declarations.forEach(d => {
        const date = new Date(d.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[monthKey]) monthlyData[monthKey] = { دخول: 0, خروج: 0 };
        if (d.type === 'دخول' || d.type === 'خروج') monthlyData[monthKey][d.type]++;
      });
      const monthlyTrends = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, data]) => ({
          month: new Date(month + '-01').toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short' }), 
          ...data,
        }));

      // Weekly activity
      const weeklyData: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      declarations.forEach(d => {
        const day = new Date(d.created_at).getDay();
        weeklyData[day]++;
      });
      const dayNames = language === 'ar' 
        ? [t('sunday'), t('monday'), t('tuesday'), t('wednesday'), t('thursday'), t('friday'), t('saturday')]
        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weeklyActivity = Object.entries(weeklyData).map(([day, count]) => ({
        day: dayNames[parseInt(day)],
        count,
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
        message: `${(a.profiles as any)?.username || t('userLabel')} ${t('changedDeclarationStatus')} ${a.declaration_id}`,
        timestamp: a.changed_at,
      }));

      setStats({ 
        totalUsers: roles.length, adminCount, managerCount, userCount, 
        totalDeclarations: declarations.length, declarationsByStatus, declarationsByType, 
        monthlyTrends, recentActivities, averageProcessingTime, completionRate, weeklyActivity 
      });
    } catch (error: any) { 
      toast({ variant: 'destructive', title: t('error'), description: error.message }); 
    }
    finally { setLoading(false); }
  }, [toast, language, t, dateFrom, dateTo]);

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
      const fromDate = startOfDay(dateFrom).toISOString();
      const toDate = endOfDay(dateTo).toISOString();
      
      const { data, error } = await supabase.from('declarations')
        .select(`*, sender:profiles!sender_id(username)`)
        .is('deleted_at', null)
        .gte('created_at', fromDate)
        .lte('created_at', toDate)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const formattedData = (data || []).map(d => ({ 
        id: d.id, type: d.type, sender: d.sender?.username || t('unknown'), 
        status: statusLabels[d.status] || d.status, created_at: toGregorianDate(d.created_at) 
      }));
      exportDeclarationsToExcel(formattedData, language === 'ar' ? 'تقرير_الإقرارات' : 'Declarations_Report');
      toast({ title: t('success'), description: t('exportSuccess') });
    } catch (error: any) { toast({ variant: 'destructive', title: t('error'), description: error.message }); }
    finally { setExporting(false); }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const fromDate = startOfDay(dateFrom).toISOString();
      const toDate = endOfDay(dateTo).toISOString();
      
      const { data, error } = await supabase.from('declarations')
        .select(`*, sender:profiles!sender_id(username)`)
        .is('deleted_at', null)
        .gte('created_at', fromDate)
        .lte('created_at', toDate)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const formattedData = (data || []).map(d => ({ 
        id: d.id, type: d.type, sender: d.sender?.username || t('unknown'), 
        status: statusLabels[d.status] || d.status, created_at: toGregorianDate(d.created_at) 
      }));
      const reportTitle = 'Declarations Report';
      await exportDeclarationsToPDFSecure(formattedData, reportTitle);
      toast({ title: t('success'), description: t('exportSuccess') });
    } catch (error: any) { toast({ variant: 'destructive', title: t('error'), description: error.message }); }
    finally { setExporting(false); }
  };

  const roleData = useMemo(() => [
    { name: t('systemAdmins'), value: stats.adminCount, color: CHART_COLORS.admin }, 
    { name: t('managers'), value: stats.managerCount, color: CHART_COLORS.manager }, 
    { name: t('regularUser'), value: stats.userCount, color: CHART_COLORS.user }
  ], [stats, t]);
  
  const typeData = useMemo(() => stats.declarationsByType.map(d => ({ 
    name: d.type, value: d.count, color: d.type === 'دخول' ? CHART_COLORS.entrance : CHART_COLORS.exit 
  })), [stats.declarationsByType]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <Skeleton className="h-10 w-64" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-80 rounded-lg" />
              <Skeleton className="h-80 rounded-lg" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        <Breadcrumbs />
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 mb-4 md:mb-6">
          <div>
            <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
              <BarChart3 className="w-6 h-6 md:w-8 md:h-8 text-primary" />
              <h1 className="text-xl md:text-3xl font-bold gradient-text">{t('reportsTitle')}</h1>
            </div>
            <p className="text-muted-foreground text-sm">{t('reportsSubtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Year Selector - Primary filter */}
            <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
              <SelectTrigger className="w-[120px]">
                <CalendarIcon className="me-2 h-4 w-4" />
                <SelectValue placeholder={t('selectYear')} />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Custom Date Range (optional fine-tuning) */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal text-xs", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="me-1 h-3 w-3" />
                  {format(dateFrom, "dd/MM")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar 
                  mode="single" 
                  selected={dateFrom} 
                  onSelect={(date) => date && setDateFrom(date)} 
                  initialFocus 
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground self-center">—</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal text-xs", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="me-1 h-3 w-3" />
                  {format(dateTo, "dd/MM")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar 
                  mode="single" 
                  selected={dateTo} 
                  onSelect={(date) => date && setDateTo(date)} 
                  initialFocus 
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            
            <Button variant="outline" size="sm" onClick={loadSystemStats} disabled={loading} aria-label={t('refresh')}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Selected Year Indicator */}
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="outline" className="text-sm">
            {language === 'ar' ? `عرض بيانات سنة ${selectedYear}` : `Showing data for ${selectedYear}`}
          </Badge>
          {stats.totalDeclarations === 0 && !loading && (
            <Badge variant="secondary" className="text-sm">
              {language === 'ar' ? 'لا توجد بيانات لهذه الفترة' : 'No data for this period'}
            </Badge>
          )}
        </div>

        {/* KPI Cards - 2 columns on mobile */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4 mb-4 md:mb-6">
          <StatsCard label={t('totalUsers')} value={stats.totalUsers} icon={Users} color="text-primary" bgColor="bg-primary/10" size="sm" />
          <StatsCard label={t('systemAdmins')} value={stats.adminCount} icon={Shield} color="text-destructive" bgColor="bg-destructive/10" size="sm" />
          <StatsCard label={t('managers')} value={stats.managerCount} icon={UserCheck} color="text-chart-2" bgColor="bg-chart-2/10" size="sm" />
          <StatsCard label={t('totalDeclarations')} value={stats.totalDeclarations} icon={FileText} color="text-chart-1" bgColor="bg-chart-1/10" size="sm" />
          <StatsCard label={t('completionRate')} value={`${stats.completionRate}%`} icon={TrendingUp} color="text-green-600 dark:text-green-400" bgColor="bg-green-500/10" size="sm" />
          <StatsCard label={t('avgProcessingTime')} value={`${stats.averageProcessingTime}`} icon={Clock} color="text-orange-600 dark:text-orange-400" bgColor="bg-orange-500/10" size="sm" />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">{t('overviewTab')}</span>
            </TabsTrigger>
            <TabsTrigger value="trends" className="gap-2">
              <LineChart className="w-4 h-4" />
              <span className="hidden sm:inline">{t('trendsTab')}</span>
            </TabsTrigger>
            <TabsTrigger value="export" className="gap-2">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">{t('export')}</span>
            </TabsTrigger>
            <TabsTrigger value="admin" className="gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">{t('statistics')}</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status Distribution */}
              <Card className="glass-card border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5" />
                    {t('statusDistributionChart')}
                  </CardTitle>
                  <CardDescription>{t('statusDistributionDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.declarationsByStatus.length === 0 ? (
                    <div className="h-64 flex items-center justify-center">
                      <p className="text-muted-foreground">{t('noData')}</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={stats.declarationsByStatus}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ label, percent }) => `${label}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          dataKey="count"
                        >
                          {stats.declarationsByStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || CHART_COLORS.user} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Type Distribution */}
              <Card className="glass-card border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    {t('typeDistributionChart')}
                  </CardTitle>
                  <CardDescription>{t('typeDistributionDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {typeData.length === 0 ? (
                    <div className="h-64 flex items-center justify-center">
                      <p className="text-muted-foreground">{t('noData')}</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={typeData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          dataKey="value"
                        >
                          {typeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* User Distribution */}
            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {t('userDistribution')}
                </CardTitle>
                <CardDescription>{t('rolePercentage')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={roleData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={80} dataKey="value">
                      {roleData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Trends */}
              <Card className="glass-card border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    {t('monthlyTrendChart')}
                  </CardTitle>
                  <CardDescription>{t('monthlyTrendDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.monthlyTrends.length === 0 ? (
                    <div className="h-64 flex items-center justify-center">
                      <p className="text-muted-foreground">{t('noData')}</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={stats.monthlyTrends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                        <Legend />
                        <Area type="monotone" dataKey="دخول" stackId="1" stroke={CHART_COLORS.entrance} fill={CHART_COLORS.entrance} fillOpacity={0.6} />
                        <Area type="monotone" dataKey="خروج" stackId="1" stroke={CHART_COLORS.exit} fill={CHART_COLORS.exit} fillOpacity={0.6} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Weekly Activity */}
              <Card className="glass-card border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    {t('weeklyActivityChart')}
                  </CardTitle>
                  <CardDescription>{t('weeklyActivityDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.weeklyActivity.every(w => w.count === 0) ? (
                    <div className="h-64 flex items-center justify-center">
                      <p className="text-muted-foreground">{t('noData')}</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={stats.weeklyActivity}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Declaration Status Distribution */}
            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  {t('declarationDistribution')}
                </CardTitle>
                <CardDescription>{t('countByStage')}</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.declarationsByStatus.length === 0 ? (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-muted-foreground">{t('noData')}</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.declarationsByStatus}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                        {stats.declarationsByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || CHART_COLORS.user} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-6">
            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  {t('exportOptions')}
                </CardTitle>
                <CardDescription>
                  {language === 'ar' 
                    ? `تصدير البيانات من ${format(dateFrom, "yyyy-MM-dd")} إلى ${format(dateTo, "yyyy-MM-dd")}`
                    : `Export data from ${format(dateFrom, "yyyy-MM-dd")} to ${format(dateTo, "yyyy-MM-dd")}`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  <Button onClick={handleExportExcel} disabled={exporting} size="lg" variant="outline" className="gap-2">
                    <Download className="w-5 h-5" />
                    {t('exportExcel')}
                  </Button>
                  <Button onClick={handleExportPDF} disabled={exporting} size="lg" className="gap-2">
                    <Download className="w-5 h-5" />
                    {t('exportPDF')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admin Stats Tab */}
          <TabsContent value="admin" className="space-y-6">
            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  {t('recentActivities')}
                </CardTitle>
                <CardDescription>{t('latestSystemChanges')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                {stats.recentActivities.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>{t('noRecentActivities')}</p>
                      <p className="text-sm mt-1">{language === 'ar' ? 'لا توجد نشاطات في الفترة المحددة' : 'No activities in the selected period'}</p>
                    </div>
                  ) : (
                    stats.recentActivities.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="w-2 h-2 mt-2 rounded-full bg-primary animate-pulse" aria-hidden="true"></div>
                        <div className="flex-1">
                          <p className="text-sm">{activity.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{toGregorianDateTime(activity.timestamp)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
