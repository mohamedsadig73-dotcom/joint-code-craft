import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

interface ComparisonBarChartProps {
  data: Array<{
    category: string;
    [key: string]: string | number;
  }>;
  bars: Array<{
    dataKey: string;
    fill: string;
    name: string;
  }>;
  title?: string;
}

export function ComparisonBarChart({ data, bars, title }: ComparisonBarChartProps) {
  const { t } = useLanguage();

  return (
    <Card className="glass-card border-border/50">
      <CardHeader>
        <CardTitle>{title || t('comparison') || 'مقارنة'}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="category" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))' 
              }} 
            />
            <Legend />
            {bars.map((bar) => (
              <Bar 
                key={bar.dataKey}
                dataKey={bar.dataKey} 
                fill={bar.fill} 
                name={bar.name}
                radius={[8, 8, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}