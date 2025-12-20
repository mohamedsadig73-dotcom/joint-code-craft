import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CardSkeleton, ChartSkeleton } from '@/components/ui/TableSkeleton';
import { StaggerContainer, StaggerItem } from '@/components/PageTransition';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadialBarChart, RadialBar, ComposedChart
} from 'recharts';
import {
  TrendingUp, TrendingDown, Activity, FileText, Users, Clock,
  Calendar, Target, Zap, Award, RefreshCw, BarChart3, PieChartIcon,
  ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import { statusLabels, CHART_COLORS } from '@/constants/statusLabels';
import { differenceInDays, subMonths, format, startOfMonth, endOfMonth } from 'date-fns';

interface AnalyticsData {
  totalDeclarations: number;
  monthlyGrowth: number;
  weeklyGrowth: number;
  avgProcessingDays: number;
  completionRate: number;
  pendingCount: number;
  overdueCount: number;
  statusDistribution: { status: string; count: number; label: string; color: string }[];
  typeDistribution: { type: string; count: number; percentage: number }[];
  monthlyTrend: { month: string; total: number; دخول: number; خروج: number; completed: number }[];
  weeklyActivity: { day: string; count: number }[];
  topSenders: { username: string; count: number; percentage: number }[];
  performanceMetrics: { metric: string; value: number; target: number; fill: string }[];
  hourlyDistribution: { hour: string; count: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#94a3b8',
  pending_warehouse_signature: '#f59e0b',
  warehouse_signed: '#3b82f6',
  sent_to_admin_office: '#8b5cf6',
  received_by_admin_office: '#06b6d4',
  returned_to_warehouse: '#f97316',
  archived: '#22c55e',
  rejected: '#ef4444',
};

export default function Analytics() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('6months');
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState<AnalyticsData>({
    totalDeclarations: 0,
    monthlyGrowth: 0,
    weeklyGrowth: 0,
    avgProcessingDays: 0,
    completionRate: 0,
    pendingCount: 0,
    overdueCount: 0,
    statusDistribution: [],
    typeDistribution: [],
    monthlyTrend: [],
    weeklyActivity: [],
    topSenders: [],
    performanceMetrics: [],
    hourlyDistribution: [],
  });

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const now = new Date();
      let startDate: Date;
      switch (timeRange) {
        case '1month': startDate = subMonths(now, 1); break;
        case '3months': startDate = subMonths(now, 3); break;
        case '1year': startDate = subMonths(now, 12); break;
        default: startDate = subMonths(now, 6);
      }

      // Fetch declarations with sender info
      const { data: declarations, error } = await supabase
        .from('declarations')
        .select(`*, sender:profiles!sender_id(username)`)
        .is('deleted_at', null)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const allDeclarations = declarations || [];
      
      // Calculate growth rates
      const lastMonth = subMonths(now, 1);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const prevMonth = subMonths(now, 2);
      
      const thisMonthCount = allDeclarations.filter(d => new Date(d.created_at) >= startOfMonth(now)).length;
      const lastMonthCount = allDeclarations.filter(d => {
        const date = new Date(d.created_at);
        return date >= startOfMonth(lastMonth) && date < startOfMonth(now);
      }).length;
      
      const thisWeekCount = allDeclarations.filter(d => new Date(d.created_at) >= lastWeek).length;
      const prevWeekCount = allDeclarations.filter(d => {
        const date = new Date(d.created_at);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        return date >= twoWeeksAgo && date < lastWeek;
      }).length;

      const monthlyGrowth = lastMonthCount > 0 ? ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100 : 0;
      const weeklyGrowth = prevWeekCount > 0 ? ((thisWeekCount - prevWeekCount) / prevWeekCount) * 100 : 0;

      // Status distribution
      const statusCounts: Record<string, number> = {};
      allDeclarations.forEach(d => {
        statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;
      });
      const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
        label: statusLabels[status] || status,
        color: STATUS_COLORS[status] || '#94a3b8',
      }));

      // Type distribution
      const typeCounts: Record<string, number> = {};
      allDeclarations.forEach(d => {
        typeCounts[d.type] = (typeCounts[d.type] || 0) + 1;
      });
      const typeDistribution = Object.entries(typeCounts).map(([type, count]) => ({
        type,
        count,
        percentage: Math.round((count / allDeclarations.length) * 100),
      }));

      // Monthly trend
      const monthlyData: Record<string, { total: number; دخول: number; خروج: number; completed: number }> = {};
      allDeclarations.forEach(d => {
        const monthKey = format(new Date(d.created_at), 'yyyy-MM');
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { total: 0, دخول: 0, خروج: 0, completed: 0 };
        }
        monthlyData[monthKey].total++;
        if (d.type === 'دخول') monthlyData[monthKey].دخول++;
        if (d.type === 'خروج') monthlyData[monthKey].خروج++;
        if (d.status === 'archived') monthlyData[monthKey].completed++;
      });
      
      const monthlyTrend = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, values]) => ({
          month: format(new Date(month + '-01'), 'MMM', { locale: language === 'ar' ? undefined : undefined }),
          ...values,
        }));

      // Weekly activity with translated day names
      const weekDaysEn = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const weeklyActivityData: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      allDeclarations.forEach(d => {
        const day = new Date(d.created_at).getDay();
        weeklyActivityData[day]++;
      });
      const weeklyActivity = Object.entries(weeklyActivityData).map(([day, count]) => ({
        day: t(weekDaysEn[parseInt(day)]),
        count,
      }));

      // Hourly distribution
      const hourlyData: Record<number, number> = {};
      for (let i = 0; i < 24; i++) hourlyData[i] = 0;
      allDeclarations.forEach(d => {
        const hour = new Date(d.created_at).getHours();
        hourlyData[hour]++;
      });
      const hourlyDistribution = Object.entries(hourlyData).map(([hour, count]) => ({
        hour: `${hour}:00`,
        count,
      }));

      // Top senders
      const senderCounts: Record<string, number> = {};
      allDeclarations.forEach(d => {
        const username = d.sender?.username || t('unknown');
        senderCounts[username] = (senderCounts[username] || 0) + 1;
      });
      const topSenders = Object.entries(senderCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([username, count]) => ({
          username,
          count,
          percentage: Math.round((count / allDeclarations.length) * 100),
        }));

      // Calculate metrics
      const archivedDeclarations = allDeclarations.filter(d => d.status === 'archived');
      let totalDays = 0;
      archivedDeclarations.forEach(d => {
        totalDays += differenceInDays(new Date(d.updated_at), new Date(d.created_at));
      });
      const avgProcessingDays = archivedDeclarations.length > 0 ? Math.round(totalDays / archivedDeclarations.length) : 0;
      const completionRate = allDeclarations.length > 0 ? Math.round((archivedDeclarations.length / allDeclarations.length) * 100) : 0;
      const pendingCount = allDeclarations.filter(d => 
        ['pending_warehouse_signature', 'warehouse_signed', 'sent_to_admin_office'].includes(d.status)
      ).length;
      const overdueCount = allDeclarations.filter(d => {
        if (!['pending_warehouse_signature', 'sent_to_admin_office'].includes(d.status)) return false;
        return differenceInDays(now, new Date(d.created_at)) > 7;
      }).length;

      // Performance metrics for radial chart
      const performanceMetrics = [
        { metric: t('completionRateMetric'), value: completionRate, target: 100, fill: '#22c55e' },
        { metric: t('processingSpeedMetric'), value: Math.max(0, 100 - avgProcessingDays * 10), target: 100, fill: '#3b82f6' },
        { metric: t('efficiencyMetric'), value: Math.round(100 - (pendingCount / Math.max(allDeclarations.length, 1)) * 100), target: 100, fill: '#f59e0b' },
      ];

      setData({
        totalDeclarations: allDeclarations.length,
        monthlyGrowth,
        weeklyGrowth,
        avgProcessingDays,
        completionRate,
        pendingCount,
        overdueCount,
        statusDistribution,
        typeDistribution,
        monthlyTrend,
        weeklyActivity,
        topSenders,
        performanceMetrics,
        hourlyDistribution,
      });

    } catch (error: any) {
      toast({ variant: 'destructive', title: t('error'), description: error.message });
    } finally {
      setLoading(false);
    }
  }, [timeRange, toast, language]);

  useEffect(() => {
    if (user) loadAnalytics();
  }, [user, loadAnalytics]);

  const GrowthIndicator = ({ value }: { value: number }) => {
    if (value > 0) return <span className="text-green-600 dark:text-green-400 flex items-center gap-1"><ArrowUpRight className="w-4 h-4" />+{value.toFixed(1)}%</span>;
    if (value < 0) return <span className="text-red-600 dark:text-red-400 flex items-center gap-1"><ArrowDownRight className="w-4 h-4" />{value.toFixed(1)}%</span>;
    return <span className="text-muted-foreground flex items-center gap-1"><Minus className="w-4 h-4" />0%</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs />
          <div className="space-y-6">
            <CardSkeleton count={4} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glass-card border-border/50 p-6">
                <ChartSkeleton />
              </Card>
              <Card className="glass-card border-border/50 p-6">
                <ChartSkeleton />
              </Card>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-primary/10">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold gradient-text">
                {t('analyticsTitle')}
              </h1>
            </div>
            <p className="text-muted-foreground text-sm">
              {t('analyticsSubtitle')}
            </p>
          </div>
          <div className="flex gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="w-4 h-4 me-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1month">{t('oneMonth')}</SelectItem>
                <SelectItem value="3months">{t('threeMonths')}</SelectItem>
                <SelectItem value="6months">{t('sixMonths')}</SelectItem>
                <SelectItem value="1year">{t('oneYear')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadAnalytics}>
              <RefreshCw className={`w-4 h-4 me-2 ${loading ? 'animate-spin' : ''}`} />
              {t('refreshData')}
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StaggerItem>
            <Card className="glass-card border-border/50 p-5 hover-lift">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <Badge variant="outline" className="text-xs">
                  <GrowthIndicator value={data.monthlyGrowth} />
                </Badge>
              </div>
              <div className="text-3xl font-bold mb-1">{data.totalDeclarations}</div>
              <div className="text-sm text-muted-foreground">{t('totalDeclarationsCard')}</div>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Card className="glass-card border-border/50 p-5 hover-lift">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-green-500/10">
                  <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="text-3xl font-bold mb-1">{data.completionRate}%</div>
              <div className="text-sm text-muted-foreground">{t('completionRateCard')}</div>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Card className="glass-card border-border/50 p-5 hover-lift">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10">
                  <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="text-3xl font-bold mb-1">{data.avgProcessingDays}</div>
              <div className="text-sm text-muted-foreground">{t('avgProcessingDaysCard')}</div>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Card className="glass-card border-border/50 p-5 hover-lift">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-orange-500/10">
                  <Zap className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                {data.overdueCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {data.overdueCount} {t('delayed')}
                  </Badge>
                )}
              </div>
              <div className="text-3xl font-bold mb-1">{data.pendingCount}</div>
              <div className="text-sm text-muted-foreground">{t('inProcessingCard')}</div>
            </Card>
          </StaggerItem>
        </StaggerContainer>

        {/* Tabs for different views */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              {t('overviewTab')}
            </TabsTrigger>
            <TabsTrigger value="trends" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              {t('trendsTab')}
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-2">
              <Award className="w-4 h-4" />
              {t('performanceTab')}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status Distribution */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="glass-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChartIcon className="w-5 h-5" />
                      {t('statusDistributionChart')}
                    </CardTitle>
                    <CardDescription>{t('statusDistributionDesc')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={data.statusDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="count"
                          label={({ label, percent }) => `${label}: ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {data.statusDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '12px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Type Distribution */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="glass-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      {t('typeDistributionChart')}
                    </CardTitle>
                    <CardDescription>{t('typeDistributionDesc')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={data.typeDistribution} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                        <YAxis type="category" dataKey="type" stroke="hsl(var(--muted-foreground))" width={60} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '12px',
                          }}
                        />
                        <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                          {data.typeDistribution.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.type === 'دخول' ? '#22c55e' : '#ef4444'} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Weekly Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="glass-card border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    {t('weeklyActivityChart')}
                  </CardTitle>
                  <CardDescription>{t('weeklyActivityDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data.weeklyActivity}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '12px',
                        }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            {/* Monthly Trend Area Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass-card border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    {t('monthlyTrendChart')}
                  </CardTitle>
                  <CardDescription>{t('monthlyTrendDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <ComposedChart data={data.monthlyTrend}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '12px',
                        }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="total"
                        name={t('totalLabel')}
                        stroke="hsl(var(--primary))"
                        fill="url(#colorTotal)"
                        strokeWidth={2}
                      />
                      <Bar dataKey="دخول" name={t('inboundType')} fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="خروج" name={t('outboundType')} fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Line
                        type="monotone"
                        dataKey="completed"
                        name={t('completedLabel')}
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={{ fill: '#f59e0b', strokeWidth: 2 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* Hourly Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="glass-card border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    {t('timeDistributionChart')}
                  </CardTitle>
                  <CardDescription>{t('timeDistributionDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={data.hourlyDistribution}>
                      <defs>
                        <linearGradient id="colorHourly" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '12px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        name={t('declarationCount')}
                        stroke="#8b5cf6"
                        fill="url(#colorHourly)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance Radial */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="glass-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="w-5 h-5" />
                      {t('performanceIndicatorsChart')}
                    </CardTitle>
                    <CardDescription>{t('performanceIndicatorsDesc')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadialBarChart
                        cx="50%"
                        cy="50%"
                        innerRadius="30%"
                        outerRadius="100%"
                        data={data.performanceMetrics}
                        startAngle={180}
                        endAngle={0}
                      >
                        <RadialBar
                          label={{ position: 'insideStart', fill: '#fff', fontSize: 12 }}
                          background
                          dataKey="value"
                        />
                        <Legend
                          iconSize={10}
                          layout="vertical"
                          verticalAlign="middle"
                          align="right"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '12px',
                          }}
                        />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Top Senders */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="glass-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      {t('topSendersChart')}
                    </CardTitle>
                    <CardDescription>{t('topSendersDesc')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {data.topSenders.map((sender, index) => (
                        <div key={sender.username} className="flex items-center gap-4">
                          <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                            ${index === 0 ? 'bg-yellow-500/20 text-yellow-600' : 
                              index === 1 ? 'bg-gray-300/20 text-gray-600' :
                              index === 2 ? 'bg-orange-500/20 text-orange-600' :
                              'bg-muted text-muted-foreground'}
                          `}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{sender.username}</span>
                              <span className="text-sm text-muted-foreground">{sender.count} {t('declarationCount')}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-primary rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${sender.percentage}%` }}
                                transition={{ delay: index * 0.1, duration: 0.5 }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
