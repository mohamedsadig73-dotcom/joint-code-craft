import { useMemo } from 'react';
import { RTLEChart } from './RTLEChart';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import type { EChartsOption } from 'echarts';

interface MonthlyData {
  month: string;
  دخول: number;
  خروج: number;
  total?: number;
  completed?: number;
}

interface MonthlyTrendChartProps {
  data: MonthlyData[];
  title: string;
  description?: string;
  height?: string;
}

export function MonthlyTrendChart({ 
  data, 
  title, 
  description, 
  height = '350px'
}: MonthlyTrendChartProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  // Calculate trend
  const trend = useMemo(() => {
    if (data.length < 2) return 0;
    const lastMonth = data[data.length - 1];
    const prevMonth = data[data.length - 2];
    const lastTotal = (lastMonth.دخول || 0) + (lastMonth.خروج || 0);
    const prevTotal = (prevMonth.دخول || 0) + (prevMonth.خروج || 0);
    if (prevTotal === 0) return 0;
    return ((lastTotal - prevTotal) / prevTotal) * 100;
  }, [data]);

  const option = useMemo((): EChartsOption => {
    const months = data.map(d => d.month);
    const inboundData = data.map(d => d.دخول || 0);
    const outboundData = data.map(d => d.خروج || 0);
    const totalData = data.map(d => (d.دخول || 0) + (d.خروج || 0));

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
          type: 'cross',
          crossStyle: {
            color: '#999'
          }
        },
        formatter: (params: any) => {
          const month = params[0]?.axisValue || '';
          let html = `
            <div style="text-align: ${isRTL ? 'right' : 'left'}; direction: ${isRTL ? 'rtl' : 'ltr'}">
              <div style="font-weight: 600; font-size: 14px; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
                📅 ${month}
              </div>
          `;
          
          let total = 0;
          params.forEach((param: any) => {
            total += param.value || 0;
            html += `
              <div style="display: flex; justify-content: space-between; gap: 24px; margin-bottom: 6px;">
                <span style="display: flex; align-items: center; gap: 6px;">
                  <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${param.color}"></span>
                  ${param.seriesName}
                </span>
                <span style="font-weight: 600;">${param.value}</span>
              </div>
            `;
          });
          
          html += `
            <div style="display: flex; justify-content: space-between; gap: 24px; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
              <span style="color: #60a5fa;">${isRTL ? 'الإجمالي' : 'Total'}</span>
              <span style="font-weight: 700; color: #60a5fa;">${total}</span>
            </div>
          `;
          
          html += '</div>';
          return html;
        }
      },
      legend: {
        data: [
          isRTL ? 'إقرارات الدخول' : 'Inbound',
          isRTL ? 'إقرارات الخروج' : 'Outbound',
          isRTL ? 'خط الاتجاه' : 'Trend Line'
        ],
        bottom: 0,
        itemWidth: 20,
        itemHeight: 10,
        textStyle: {
          fontSize: 12,
          fontFamily: 'IBM Plex Sans Arabic, IBM Plex Sans, sans-serif'
        }
      },
      grid: {
        left: isRTL ? 40 : 50,
        right: isRTL ? 50 : 40,
        top: 30,
        bottom: 60,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: months,
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
          fontSize: 12,
          fontFamily: 'IBM Plex Sans Arabic, IBM Plex Sans, sans-serif'
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(150, 150, 150, 0.1)'
          }
        }
      },
      series: [
        {
          name: isRTL ? 'إقرارات الدخول' : 'Inbound',
          type: 'bar',
          stack: 'total',
          barWidth: '40%',
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: '#22c55e' },
                { offset: 1, color: '#16a34a' }
              ]
            },
            borderRadius: [4, 4, 0, 0]
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(34, 197, 94, 0.4)'
            }
          },
          data: inboundData,
          animationDelay: (idx: number) => idx * 100
        },
        {
          name: isRTL ? 'إقرارات الخروج' : 'Outbound',
          type: 'bar',
          stack: 'total',
          barWidth: '40%',
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: '#ef4444' },
                { offset: 1, color: '#dc2626' }
              ]
            },
            borderRadius: [4, 4, 0, 0]
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(239, 68, 68, 0.4)'
            }
          },
          data: outboundData,
          animationDelay: (idx: number) => idx * 100 + 50
        },
        {
          name: isRTL ? 'خط الاتجاه' : 'Trend Line',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: {
            width: 3,
            color: '#3b82f6'
          },
          itemStyle: {
            color: '#3b82f6',
            borderWidth: 2,
            borderColor: '#fff'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
                { offset: 1, color: 'rgba(59, 130, 246, 0)' }
              ]
            }
          },
          data: totalData,
          animationDelay: (idx: number) => idx * 100 + 100
        }
      ],
      animationEasing: 'elasticOut',
      animationDuration: 1200
    };
  }, [data, isRTL]);

  if (data.length === 0) {
    return (
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
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
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {trend !== 0 && (
          <div className={`flex items-center gap-1 text-sm font-medium ${trend > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            <TrendingUp className={`w-4 h-4 ${trend < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </CardHeader>
      <CardContent>
        <RTLEChart option={option} style={{ height }} />
      </CardContent>
    </Card>
  );
}

export default MonthlyTrendChart;
