import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

interface ActivityAreaChartProps {
  data: Array<{
    time: string;
    activity: number;
  }>;
}

export function ActivityAreaChart({ data }: ActivityAreaChartProps) {
  const { t } = useLanguage();

  return (
    <Card className="glass-card border-border/50">
      <CardHeader>
        <CardTitle>{t('dailyActivity') || 'النشاط اليومي'}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))' 
              }} 
            />
            <Area 
              type="monotone" 
              dataKey="activity" 
              stroke="hsl(var(--secondary))" 
              fillOpacity={1} 
              fill="url(#colorActivity)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}