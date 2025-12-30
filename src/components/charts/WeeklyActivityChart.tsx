import { useMemo } from 'react';
import { RTLEChart } from './RTLEChart';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import type { EChartsOption } from 'echarts';

interface WeeklyData {
  day: string;
  count: number;
}

interface WeeklyActivityChartProps {
  data: WeeklyData[];
  title: string;
  description?: string;
  height?: string;
}

export function WeeklyActivityChart({ 
  data, 
  title, 
  description, 
  height = '280px'
}: WeeklyActivityChartProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  const { maxDay, avgCount } = useMemo(() => {
    if (data.length === 0) return { maxDay: '', avgCount: 0 };
    const max = data.reduce((a, b) => a.count > b.count ? a : b);
    const avg = data.reduce((sum, d) => sum + d.count, 0) / data.length;
    return { maxDay: max.day, avgCount: Math.round(avg) };
  }, [data]);

  const option = useMemo((): EChartsOption => {
    const days = data.map(d => d.day);
    const counts = data.map(d => d.count);
    const maxCount = Math.max(...counts, 1);

    return {
      tooltip: {
        trigger: 'axis',
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
        axisPointer: {
          type: 'shadow'
        },
        formatter: (params: any) => {
          const item = params[0];
          const isMax = item.value === maxCount;
          const aboveAvg = item.value > avgCount;
          
          let insight = '';
          if (isMax) {
            insight = isRTL ? '📈 أعلى نشاط في الأسبوع!' : '📈 Highest activity of the week!';
          } else if (aboveAvg) {
            insight = isRTL ? '✅ أعلى من المتوسط' : '✅ Above average';
          } else {
            insight = isRTL ? '📉 أقل من المتوسط' : '📉 Below average';
          }

          return `
            <div style="text-align: ${isRTL ? 'right' : 'left'}; direction: ${isRTL ? 'rtl' : 'ltr'}">
              <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px;">
                📅 ${item.axisValue}
              </div>
              <div style="display: flex; justify-content: space-between; gap: 24px; margin-bottom: 8px;">
                <span style="color: #9ca3af;">${isRTL ? 'عدد الإقرارات' : 'Declarations'}</span>
                <span style="font-weight: 700; font-size: 16px;">${item.value}</span>
              </div>
              <div style="font-size: 11px; color: ${isMax ? '#22c55e' : aboveAvg ? '#60a5fa' : '#f59e0b'}; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;">
                ${insight}
              </div>
            </div>
          `;
        }
      },
      grid: {
        left: isRTL ? 20 : 40,
        right: isRTL ? 40 : 20,
        top: 20,
        bottom: 40,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: days,
        axisLine: {
          lineStyle: {
            color: 'rgba(150, 150, 150, 0.3)'
          }
        },
        axisLabel: {
          color: 'inherit',
          fontSize: 12,
          fontFamily: 'IBM Plex Sans Arabic, IBM Plex Sans, sans-serif'
        }
      },
      yAxis: {
        type: 'value',
        position: isRTL ? 'right' : 'left',
        axisLine: {
          lineStyle: {
            color: 'rgba(150, 150, 150, 0.3)'
          }
        },
        axisLabel: {
          color: 'inherit',
          fontSize: 12
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(150, 150, 150, 0.1)'
          }
        }
      },
      series: [
        {
          name: isRTL ? 'الإقرارات' : 'Declarations',
          type: 'bar',
          barWidth: '50%',
          itemStyle: {
            color: (params: any) => {
              const value = params.value;
              if (value === maxCount) {
                return {
                  type: 'linear',
                  x: 0, y: 0, x2: 0, y2: 1,
                  colorStops: [
                    { offset: 0, color: '#22c55e' },
                    { offset: 1, color: '#16a34a' }
                  ]
                };
              }
              return {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: 'hsl(var(--primary))' },
                  { offset: 1, color: 'hsl(var(--primary) / 0.7)' }
                ]
              };
            },
            borderRadius: [8, 8, 0, 0]
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 15,
              shadowColor: 'rgba(59, 130, 246, 0.4)'
            }
          },
          data: counts,
          animationDelay: (idx: number) => idx * 80,
          animationDuration: 800
        },
        {
          name: isRTL ? 'المتوسط' : 'Average',
          type: 'line',
          symbol: 'none',
          lineStyle: {
            color: '#f59e0b',
            width: 2,
            type: 'dashed'
          },
          data: new Array(counts.length).fill(avgCount),
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: {
              color: '#f59e0b',
              type: 'dashed',
              width: 2
            },
            label: {
              formatter: isRTL ? 'المتوسط' : 'Avg',
              position: isRTL ? 'start' : 'end',
              fontSize: 11,
              color: '#f59e0b'
            },
            data: [{ yAxis: avgCount }]
          }
        }
      ],
      animationEasing: 'elasticOut'
    };
  }, [data, isRTL, avgCount, maxDay]);

  if (data.length === 0 || data.every(d => d.count === 0)) {
    return (
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {title}
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <div className="text-xs text-muted-foreground">
            {isRTL ? `أعلى نشاط: ${maxDay}` : `Peak: ${maxDay}`}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <RTLEChart option={option} style={{ height }} />
      </CardContent>
    </Card>
  );
}

export default WeeklyActivityChart;
