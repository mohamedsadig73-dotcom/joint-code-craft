import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

interface StatusPieChartProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export function StatusPieChart({ data }: StatusPieChartProps) {
  const { t } = useLanguage();

  return (
    <Card className="glass-card border-border/50">
      <CardHeader>
        <CardTitle>{t('statusDistribution') || 'توزيع الحالات'}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}