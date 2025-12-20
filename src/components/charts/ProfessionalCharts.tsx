import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts';
import { PieChart as PieChartIcon, BarChart3, Users, TrendingUp, Activity } from 'lucide-react';

interface ChartData {
  name: string;
  value: number;
  color: string;
}

interface StatusData {
  status: string;
  count: number;
  label: string;
}

interface MonthlyData {
  month: string;
  دخول: number;
  خروج: number;
}

interface WeeklyData {
  day: string;
  count: number;
}

interface ProfessionalChartsProps {
  statusData: StatusData[];
  typeData: ChartData[];
  roleData: ChartData[];
  monthlyTrends?: MonthlyData[];
  weeklyActivity?: WeeklyData[];
  statusColors: Record<string, string>;
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg p-3 shadow-xl">
        <p className="font-medium text-sm mb-1">{label || payload[0]?.name}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color || entry.fill }}>
            {entry.name}: <span className="font-semibold">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Custom legend component
const CustomLegend = ({ payload }: any) => {
  return (
    <div className="flex flex-wrap justify-center gap-3 mt-4">
      {payload?.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full shadow-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-muted-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

// Custom pie label
const renderCustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.3;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="currentColor" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      className="text-xs font-medium fill-foreground"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function ProfessionalPieChart({ 
  data, 
  title, 
  description, 
  icon: Icon = PieChartIcon,
  innerRadius = 60,
  outerRadius = 100,
  showLabels = true
}: { 
  data: ChartData[];
  title: string;
  description?: string;
  icon?: React.ComponentType<any>;
  innerRadius?: number;
  outerRadius?: number;
  showLabels?: boolean;
}) {
  const { t } = useLanguage();
  
  if (data.length === 0 || data.every(d => d.value === 0)) {
    return (
      <Card className="glass-card border-border/50 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground">{t('noData')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-border/50 overflow-hidden group hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <defs>
              {data.map((entry, index) => (
                <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                  <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
                </linearGradient>
              ))}
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3"/>
              </filter>
            </defs>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={2}
              dataKey="value"
              label={showLabels ? renderCustomPieLabel : undefined}
              labelLine={false}
              animationBegin={0}
              animationDuration={800}
              animationEasing="ease-out"
              filter="url(#shadow)"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={`url(#gradient-${index})`}
                  stroke={entry.color}
                  strokeWidth={1}
                  className="transition-opacity hover:opacity-80"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center stat */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginTop: '-20px' }}>
          <div className="text-center">
            <p className="text-2xl font-bold">{data.reduce((sum, d) => sum + d.value, 0)}</p>
            <p className="text-xs text-muted-foreground">{t('total')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProfessionalBarChart({ 
  data, 
  title, 
  description,
  dataKey = 'count',
  nameKey = 'name',
  color = 'hsl(var(--primary))',
  showGrid = true
}: { 
  data: any[];
  title: string;
  description?: string;
  dataKey?: string;
  nameKey?: string;
  color?: string;
  showGrid?: boolean;
}) {
  const { t, language } = useLanguage();
  
  if (data.length === 0) {
    return (
      <Card className="glass-card border-border/50 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-primary/10">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground">{t('noData')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-border/50 overflow-hidden group hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart 
            data={data} 
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            layout={language === 'ar' ? 'vertical' : 'horizontal'}
          >
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={1} />
                <stop offset="100%" stopColor={color} stopOpacity={0.6} />
              </linearGradient>
            </defs>
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />}
            <XAxis 
              dataKey={nameKey} 
              tick={{ fontSize: 12 }} 
              className="fill-muted-foreground"
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis 
              tick={{ fontSize: 12 }} 
              className="fill-muted-foreground"
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey={dataKey} 
              fill="url(#barGradient)"
              radius={[6, 6, 0, 0]}
              animationDuration={800}
              animationEasing="ease-out"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function ProfessionalAreaChart({ 
  data, 
  title, 
  description,
  lines = [{ key: 'دخول', color: '#3B82F6' }, { key: 'خروج', color: '#F59E0B' }]
}: { 
  data: any[];
  title: string;
  description?: string;
  lines?: { key: string; color: string }[];
}) {
  const { t } = useLanguage();
  
  if (data.length === 0) {
    return (
      <Card className="glass-card border-border/50 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground">{t('noData')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-border/50 overflow-hidden group hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <defs>
              {lines.map((line, index) => (
                <linearGradient key={`areaGradient-${index}`} id={`areaGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={line.color} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={line.color} stopOpacity={0.05} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12 }} 
              className="fill-muted-foreground"
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis 
              tick={{ fontSize: 12 }} 
              className="fill-muted-foreground"
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
            {lines.map((line, index) => (
              <Area
                key={line.key}
                type="monotone"
                dataKey={line.key}
                stroke={line.color}
                strokeWidth={2}
                fill={`url(#areaGradient-${index})`}
                animationDuration={800}
                animationEasing="ease-out"
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function ProfessionalActivityChart({ 
  data, 
  title, 
  description 
}: { 
  data: WeeklyData[];
  title: string;
  description?: string;
}) {
  const { t } = useLanguage();
  
  if (data.length === 0 || data.every(d => d.count === 0)) {
    return (
      <Card className="glass-card border-border/50 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-primary/10">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground">{t('noData')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count));

  return (
    <Card className="glass-card border-border/50 overflow-hidden group hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-2 h-64 px-4">
          {data.map((item, index) => {
            const height = maxCount > 0 ? (item.count / maxCount) * 180 : 0;
            return (
              <div key={index} className="flex flex-col items-center gap-2 flex-1">
                <span className="text-sm font-semibold text-primary">{item.count}</span>
                <div 
                  className="w-full rounded-t-lg transition-all duration-500 ease-out"
                  style={{ 
                    height: `${height}px`,
                    background: `linear-gradient(to top, hsl(var(--primary)), hsl(var(--primary) / 0.6))`,
                    minHeight: item.count > 0 ? '20px' : '4px',
                    boxShadow: '0 -4px 10px hsl(var(--primary) / 0.3)'
                  }}
                />
                <span className="text-xs text-muted-foreground">{item.day}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
