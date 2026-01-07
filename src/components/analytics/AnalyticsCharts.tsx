import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadialBarChart, RadialBar, ComposedChart
} from 'recharts';
import {
  TrendingUp, Calendar, Clock, Award, Users, BarChart3, PieChart as PieChartIcon
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { AnalyticsData } from '@/hooks/useAnalyticsData';

interface AnalyticsChartsProps {
  data: AnalyticsData;
  activeTab: string;
}

// Enhanced tooltip style for better readability
const getTooltipStyle = (isRTL: boolean): React.CSSProperties => ({
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '12px',
  boxShadow: '0 10px 25px -5px hsl(var(--background) / 0.5)',
  padding: '12px 16px',
  fontFamily: isRTL ? 'IBM Plex Sans Arabic, sans-serif' : 'IBM Plex Sans, sans-serif',
  direction: isRTL ? 'rtl' : 'ltr',
  textAlign: isRTL ? 'right' : 'left',
});

// Axis style configuration
const getAxisStyle = () => ({
  stroke: 'hsl(var(--muted-foreground))',
  fontSize: 12,
  fontFamily: 'IBM Plex Sans Arabic, IBM Plex Sans, sans-serif',
});

export function AnalyticsCharts({ data, activeTab }: AnalyticsChartsProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  const tooltipStyle = getTooltipStyle(isRTL);
  const axisStyle = getAxisStyle();

  if (activeTab === 'overview') {
    return (
      <div className="space-y-6">
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
                  <PieChartIcon className="w-5 h-5" aria-hidden="true" />
                  {t('statusDistributionChart')}
                </CardTitle>
                <CardDescription>{t('statusDistributionDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart role="img" aria-label={t('statusDistributionChart')}>
                    <Pie
                      data={data.statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="count"
                      label={({ label, percent }) => `${label}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
                    >
                      {data.statusDistribution.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          stroke="hsl(var(--background))"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={tooltipStyle as React.CSSProperties}
                      formatter={(value: number, name: string) => [value, name]}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>}
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
                  <BarChart3 className="w-5 h-5" aria-hidden="true" />
                  {t('typeDistributionChart')}
                </CardTitle>
                <CardDescription>{t('typeDistributionDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart 
                    data={data.typeDistribution} 
                    layout="vertical" 
                    role="img" 
                    aria-label={t('typeDistributionChart')}
                    margin={isRTL ? { right: 60, left: 20 } : { left: 60, right: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" reversed={isRTL} />
                    <YAxis 
                      type="category" 
                      dataKey="type" 
                      stroke="hsl(var(--muted-foreground))" 
                      width={60} 
                      orientation={isRTL ? 'right' : 'left'}
                      tick={{ textAnchor: isRTL ? 'start' : 'end' }}
                    />
                    <Tooltip contentStyle={tooltipStyle as React.CSSProperties} />
                    <Bar dataKey="count" radius={isRTL ? [8, 0, 0, 8] : [0, 8, 8, 0]}>
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
                <Calendar className="w-5 h-5" aria-hidden="true" />
                {t('weeklyActivityChart')}
              </CardTitle>
              <CardDescription>{t('weeklyActivityDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart 
                  data={isRTL ? [...data.weeklyActivity].reverse() : data.weeklyActivity} 
                  role="img" 
                  aria-label={t('weeklyActivityChart')}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" reversed={isRTL} />
                  <YAxis stroke="hsl(var(--muted-foreground))" orientation={isRTL ? 'right' : 'left'} />
                  <Tooltip contentStyle={tooltipStyle as React.CSSProperties} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (activeTab === 'trends') {
    return (
      <div className="space-y-6">
        {/* Monthly Trend Area Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" aria-hidden="true" />
                {t('monthlyTrendChart')}
              </CardTitle>
              <CardDescription>{t('monthlyTrendDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart 
                  data={data.monthlyTrend} 
                  role="img" 
                  aria-label={t('monthlyTrendChart')}
                  margin={isRTL ? { right: 30, left: 20 } : { left: 30, right: 20 }}
                >
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" reversed={isRTL} />
                  <YAxis stroke="hsl(var(--muted-foreground))" orientation={isRTL ? 'right' : 'left'} />
                  <Tooltip contentStyle={tooltipStyle as React.CSSProperties} />
                  <Legend align={isRTL ? 'right' : 'center'} />
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
                <Clock className="w-5 h-5" aria-hidden="true" />
                {t('timeDistributionChart')}
              </CardTitle>
              <CardDescription>{t('timeDistributionDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart 
                  data={data.hourlyDistribution} 
                  role="img" 
                  aria-label={t('timeDistributionChart')}
                  margin={isRTL ? { right: 30, left: 20 } : { left: 30, right: 20 }}
                >
                  <defs>
                    <linearGradient id="colorHourly" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" reversed={isRTL} />
                  <YAxis stroke="hsl(var(--muted-foreground))" orientation={isRTL ? 'right' : 'left'} />
                  <Tooltip contentStyle={tooltipStyle as React.CSSProperties} />
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
      </div>
    );
  }

  if (activeTab === 'performance') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Radial */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" aria-hidden="true" />
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
                  role="img"
                  aria-label={t('performanceIndicatorsChart')}
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
                  <Tooltip contentStyle={tooltipStyle as React.CSSProperties} />
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
                <Users className="w-5 h-5" aria-hidden="true" />
                {t('topSendersChart')}
              </CardTitle>
              <CardDescription>{t('topSendersDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4" role="list" aria-label={t('topSendersChart')}>
                {data.topSenders.map((sender, index) => (
                  <div key={sender.username} className="flex items-center gap-4" role="listitem">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                      ${index === 0 ? 'bg-yellow-500/20 text-yellow-600' : 
                        index === 1 ? 'bg-gray-300/20 text-gray-600' :
                        index === 2 ? 'bg-orange-500/20 text-orange-600' :
                        'bg-muted text-muted-foreground'}
                    `} aria-label={`${t('rank')} ${index + 1}`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{sender.username}</span>
                        <span className="text-sm text-muted-foreground">{sender.count} {t('declarationCount')}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={sender.percentage} aria-valuemin={0} aria-valuemax={100}>
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
    );
  }

  return null;
}
