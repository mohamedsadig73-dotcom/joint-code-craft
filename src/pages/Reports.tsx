import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Download, TrendingUp, Users, FileText, Clock, Shield } from 'lucide-react';
import { exportDeclarationsToExcel } from '@/utils/excelExport';
import { exportDeclarationsToPDF } from '@/utils/pdfExport';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart 
} from 'recharts';

const CHART_COLORS = {
  draft: 'hsl(var(--muted))',
  pending: 'hsl(var(--chart-3))',
  signed: 'hsl(var(--chart-1))',
  sent: 'hsl(var(--chart-2))',
  received: 'hsl(var(--primary))',
  returned: 'hsl(var(--chart-4))',
  archived: 'hsl(var(--chart-5))',
  rejected: 'hsl(var(--destructive))',
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
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

export default function Reports() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    draft: 0,
    pending_warehouse_signature: 0,
    warehouse_signed: 0,
    sent_to_admin_office: 0,
    received_by_admin_office: 0,
    returned_to_warehouse: 0,
    archived: 0,
    rejected: 0,
    total: 0,
  });
  const [weeklyData, setWeeklyData] = useState<{ day: string; count: number }[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; warehouse_signed: number; pending_warehouse_signature: number; draft: number }[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [avgProcessingTime, setAvgProcessingTime] = useState('0h');
  const [completionRate, setCompletionRate] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      // Load declarations data
      const { data, error } = await supabase
        .from('declarations')
        .select('status, created_at, updated_at');

      if (error) throw error;

      // Calculate status stats
      const newStats = {
        draft: data?.filter(d => d.status === 'draft').length || 0,
        pending_warehouse_signature: data?.filter(d => d.status === 'pending_warehouse_signature').length || 0,
        warehouse_signed: data?.filter(d => d.status === 'warehouse_signed').length || 0,
        sent_to_admin_office: data?.filter(d => d.status === 'sent_to_admin_office').length || 0,
        received_by_admin_office: data?.filter(d => d.status === 'received_by_admin_office').length || 0,
        returned_to_warehouse: data?.filter(d => d.status === 'returned_to_warehouse').length || 0,
        archived: data?.filter(d => d.status === 'archived').length || 0,
        rejected: data?.filter(d => d.status === 'rejected').length || 0,
        total: data?.length || 0,
      };
      setStats(newStats);

      // Calculate completion rate (archived / total)
      const completionPercentage = newStats.total > 0 
        ? Math.round((newStats.archived / newStats.total) * 100)
        : 0;
      setCompletionRate(completionPercentage);

      // Calculate average processing time
      const completedDeclarations = data?.filter(d => d.status === 'archived');
      if (completedDeclarations && completedDeclarations.length > 0) {
        const totalHours = completedDeclarations.reduce((sum, dec) => {
          const created = new Date(dec.created_at).getTime();
          const updated = new Date(dec.updated_at).getTime();
          const hours = (updated - created) / (1000 * 60 * 60);
          return sum + hours;
        }, 0);
        const avgHours = Math.round(totalHours / completedDeclarations.length);
        const days = Math.floor(avgHours / 24);
        const hours = avgHours % 24;
        setAvgProcessingTime(days > 0 ? `${days}d ${hours}h` : `${hours}h`);
      }

      // Load total users count
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id');
      setTotalUsers(profiles?.length || 0);

      // Calculate weekly data (last 7 days)
      const now = new Date();
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const weekly = days.map((day, index) => ({
        day,
        count: 0
      }));
      
      data?.forEach(d => {
        const createdDate = new Date(d.created_at);
        const diffDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 7) {
          const dayIndex = 6 - diffDays;
          if (weekly[dayIndex]) {
            weekly[dayIndex].count++;
          }
        }
      });
      setWeeklyData(weekly);

      // Calculate monthly data (last 6 months)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyMap = new Map<string, { warehouse_signed: number; pending_warehouse_signature: number; draft: number }>();
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${months[date.getMonth()]}`;
        monthlyMap.set(monthKey, { warehouse_signed: 0, pending_warehouse_signature: 0, draft: 0 });
      }

      data?.forEach(d => {
        const createdDate = new Date(d.created_at);
        const monthKey = months[createdDate.getMonth()];
        if (monthlyMap.has(monthKey)) {
          const current = monthlyMap.get(monthKey)!;
          if (d.status === 'warehouse_signed') current.warehouse_signed++;
          else if (d.status === 'pending_warehouse_signature') current.pending_warehouse_signature++;
          else if (d.status === 'draft') current.draft++;
        }
      });

      const monthlyArray = Array.from(monthlyMap.entries()).map(([month, data]) => ({
        month,
        ...data
      }));
      setMonthlyData(monthlyArray);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const metrics = [
    { label: t('totalDeclarations'), value: stats.total.toString(), icon: FileText },
    { label: t('avgProcessingTime'), value: avgProcessingTime, icon: Clock },
    { label: t('activeUsers'), value: totalUsers.toString(), icon: Users },
    { label: t('completionRate'), value: `${completionRate}%`, icon: TrendingUp },
  ];

  const handleExportExcel = async () => {
    try {
      const { data, error } = await supabase
        .from('declarations')
        .select(`
          *,
          sender:profiles(username)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const exportData = (data || []).map(dec => ({
        id: dec.id,
        type: dec.type,
        sender: dec.sender?.username || 'غير معروف',
        status: t(dec.status),
        archive_number: dec.archive_number || '-',
        created_at: new Date(dec.created_at).toLocaleDateString('en-US'),
      }));

      exportDeclarationsToExcel(exportData, 'تقرير_كامل_الإقرارات');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    }
  };

  const handleExportPDF = async () => {
    try {
      const { data, error } = await supabase
        .from('declarations')
        .select(`
          *,
          sender:profiles(username)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const exportData = (data || []).map(dec => ({
        id: dec.id,
        type: dec.type,
        sender: dec.sender?.username || 'غير معروف',
        status: t(dec.status),
        archive_number: dec.archive_number || '-',
        created_at: new Date(dec.created_at).toLocaleDateString('en-US'),
      }));

      exportDeclarationsToPDF(exportData, 'تقرير_كامل_الإقرارات');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
    }
  };

  const pieChartData = [
    { name: statusLabels.draft, value: stats.draft, color: CHART_COLORS.draft },
    { name: statusLabels.pending_warehouse_signature, value: stats.pending_warehouse_signature, color: CHART_COLORS.pending },
    { name: statusLabels.warehouse_signed, value: stats.warehouse_signed, color: CHART_COLORS.signed },
    { name: statusLabels.archived, value: stats.archived, color: CHART_COLORS.archived },
    { name: statusLabels.rejected, value: stats.rejected, color: CHART_COLORS.rejected },
  ].filter(item => item.value > 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{payload[0].name}</p>
          <p className="text-lg font-bold text-primary">{payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold">{t('reportsAnalytics')}</h1>
            </div>
            <p className="text-muted-foreground">{t('reportsSubtitle')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handleExportPDF}>
              <Download className="w-4 h-4" />
              {t('exportPDF')}
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleExportExcel}>
              <Download className="w-4 h-4" />
              {t('exportExcel')}
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.label} className="glass-card border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold mb-1">{metric.value}</div>
                  <div className="text-sm text-muted-foreground">{metric.label}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Status Distribution Pie Chart */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                {t('statusDistribution')}
              </CardTitle>
              <CardDescription>{t('declarationsByStatus')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Weekly Activity Bar Chart */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {t('userActivity')}
              </CardTitle>
              <CardDescription>{t('last7Days')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="day" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="count" 
                    fill={CHART_COLORS.primary}
                    radius={[8, 8, 0, 0]}
                    animationBegin={0}
                    animationDuration={800}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trends Area Chart - Full Width */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {t('monthlyTrends')}
            </CardTitle>
            <CardDescription>{t('last6Months')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorSigned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.signed} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={CHART_COLORS.signed} stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.pending} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={CHART_COLORS.pending} stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorDraft" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.draft} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={CHART_COLORS.draft} stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="line"
                />
                <Area
                  type="monotone"
                  dataKey="warehouse_signed"
                  name={statusLabels.warehouse_signed}
                  stroke={CHART_COLORS.signed}
                  fillOpacity={1}
                  fill="url(#colorSigned)"
                  animationBegin={0}
                  animationDuration={1000}
                />
                <Area
                  type="monotone"
                  dataKey="pending_warehouse_signature"
                  name={statusLabels.pending_warehouse_signature}
                  stroke={CHART_COLORS.pending}
                  fillOpacity={1}
                  fill="url(#colorPending)"
                  animationBegin={200}
                  animationDuration={1000}
                />
                <Area
                  type="monotone"
                  dataKey="draft"
                  name={statusLabels.draft}
                  stroke={CHART_COLORS.draft}
                  fillOpacity={1}
                  fill="url(#colorDraft)"
                  animationBegin={400}
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}