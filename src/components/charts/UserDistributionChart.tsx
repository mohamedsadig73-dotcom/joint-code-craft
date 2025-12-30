import { useMemo } from 'react';
import { RTLEChart } from './RTLEChart';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users } from 'lucide-react';
import type { EChartsOption } from 'echarts';

interface UserData {
  name: string;
  value: number;
  color: string;
}

interface UserDistributionChartProps {
  data: UserData[];
  title: string;
  description?: string;
  height?: string;
}

export function UserDistributionChart({ 
  data, 
  title, 
  description, 
  height = '280px'
}: UserDistributionChartProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);

  const option = useMemo((): EChartsOption => {
    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderRadius: 12,
        padding: [12, 16],
        textStyle: {
          color: '#fff',
          fontSize: 13,
          fontFamily: 'IBM Plex Sans Arabic, IBM Plex Sans, sans-serif'
        },
        formatter: (params: any) => {
          const percentage = ((params.value / total) * 100).toFixed(1);
          return `
            <div style="text-align: ${isRTL ? 'right' : 'left'}; direction: ${isRTL ? 'rtl' : 'ltr'}">
              <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${params.color}"></span>
                ${params.name}
              </div>
              <div style="display: flex; justify-content: space-between; gap: 24px; margin-bottom: 4px;">
                <span style="color: #9ca3af;">${isRTL ? 'العدد' : 'Count'}:</span>
                <span style="font-weight: 600;">${params.value}</span>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 24px;">
                <span style="color: #9ca3af;">${isRTL ? 'النسبة' : 'Percentage'}:</span>
                <span style="font-weight: 600;">${percentage}%</span>
              </div>
            </div>
          `;
        }
      },
      legend: {
        orient: 'horizontal',
        bottom: 0,
        itemWidth: 12,
        itemHeight: 12,
        itemGap: 20,
        icon: 'circle',
        textStyle: {
          fontSize: 12,
          fontFamily: 'IBM Plex Sans Arabic, IBM Plex Sans, sans-serif'
        }
      },
      series: [
        {
          name: title,
          type: 'pie',
          radius: ['40%', '65%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 6,
            borderColor: 'transparent',
            borderWidth: 2
          },
          label: {
            show: true,
            position: 'outside',
            formatter: (params: any) => {
              const percentage = ((params.value / total) * 100).toFixed(0);
              return `${params.name}\n${percentage}%`;
            },
            fontSize: 11,
            fontFamily: 'IBM Plex Sans Arabic, IBM Plex Sans, sans-serif',
            color: 'inherit',
            lineHeight: 16
          },
          labelLine: {
            show: true,
            length: 15,
            length2: 10
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 12,
              fontWeight: 'bold'
            },
            itemStyle: {
              shadowBlur: 15,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.3)'
            }
          },
          data: data.map(item => ({
            name: item.name,
            value: item.value,
            itemStyle: { color: item.color }
          })),
          animationType: 'scale',
          animationEasing: 'elasticOut',
          animationDuration: 1000
        }
      ]
    };
  }, [data, title, isRTL, total]);

  if (data.length === 0 || total === 0) {
    return (
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center" style={{ height }}>
            <p className="text-muted-foreground">{t('noData')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <RTLEChart option={option} style={{ height }} />
      </CardContent>
    </Card>
  );
}

export default UserDistributionChart;
