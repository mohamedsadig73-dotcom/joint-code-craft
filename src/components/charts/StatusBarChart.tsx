import { useMemo } from 'react';
import { RTLEChart } from './RTLEChart';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import type { EChartsOption } from 'echarts';

interface StatusData {
  status: string;
  count: number;
  label: string;
}

interface StatusBarChartProps {
  data: StatusData[];
  title: string;
  description?: string;
  height?: string;
  colors?: Record<string, string>;
}

const DEFAULT_COLORS: Record<string, string> = {
  draft: '#94a3b8',
  pending_warehouse_signature: '#f59e0b',
  warehouse_signed: '#3b82f6',
  sent_to_admin_office: '#8b5cf6',
  received_by_admin_office: '#06b6d4',
  returned_to_warehouse: '#f97316',
  archived: '#22c55e',
  rejected: '#ef4444',
};

export function StatusBarChart({ 
  data, 
  title, 
  description, 
  height = '320px',
  colors = DEFAULT_COLORS
}: StatusBarChartProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  const total = useMemo(() => data.reduce((sum, item) => sum + item.count, 0), [data]);

  const option = useMemo((): EChartsOption => {
    // Sort data by count descending
    const sortedData = [...data].sort((a, b) => b.count - a.count);
    const labels = sortedData.map(d => d.label);
    const counts = sortedData.map(d => d.count);
    const barColors = sortedData.map(d => colors[d.status] || '#94a3b8');

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
          const percentage = ((item.value / total) * 100).toFixed(1);
          const statusKey = sortedData[item.dataIndex]?.status;
          const insight = getStatusBarInsight(statusKey, item.value, total, isRTL);

          return `
            <div style="text-align: ${isRTL ? 'right' : 'left'}; direction: ${isRTL ? 'rtl' : 'ltr'}">
              <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 2px; background: ${item.color}"></span>
                ${item.axisValue}
              </div>
              <div style="display: flex; justify-content: space-between; gap: 24px; margin-bottom: 4px;">
                <span style="color: #9ca3af;">${isRTL ? 'العدد' : 'Count'}:</span>
                <span style="font-weight: 600; font-size: 16px;">${item.value}</span>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 24px; margin-bottom: 8px;">
                <span style="color: #9ca3af;">${isRTL ? 'النسبة' : 'Percentage'}:</span>
                <span style="font-weight: 600;">${percentage}%</span>
              </div>
              <div style="font-size: 11px; color: #60a5fa; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;">
                💡 ${insight}
              </div>
            </div>
          `;
        }
      },
      grid: {
        left: isRTL ? 20 : 120,
        right: isRTL ? 120 : 20,
        top: 20,
        bottom: 20,
        containLabel: true
      },
      xAxis: {
        type: 'value',
        position: isRTL ? 'top' : 'bottom',
        axisLine: {
          lineStyle: {
            color: 'rgba(150, 150, 150, 0.3)'
          }
        },
        axisLabel: {
          color: 'inherit',
          fontSize: 11
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(150, 150, 150, 0.1)'
          }
        }
      },
      yAxis: {
        type: 'category',
        data: labels,
        position: isRTL ? 'right' : 'left',
        axisLine: {
          lineStyle: {
            color: 'rgba(150, 150, 150, 0.3)'
          }
        },
        axisLabel: {
          color: 'inherit',
          fontSize: 11,
          fontFamily: 'IBM Plex Sans Arabic, IBM Plex Sans, sans-serif',
          width: 100,
          overflow: 'truncate'
        }
      },
      series: [
        {
          name: title,
          type: 'bar',
          barWidth: '60%',
          itemStyle: {
            borderRadius: [0, 6, 6, 0],
            color: (params: any) => {
              return {
                type: 'linear',
                x: 0, y: 0, x2: 1, y2: 0,
                colorStops: [
                  { offset: 0, color: barColors[params.dataIndex] },
                  { offset: 1, color: adjustColor(barColors[params.dataIndex], 0.7) }
                ]
              };
            }
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.3)'
            }
          },
          label: {
            show: true,
            position: isRTL ? 'left' : 'right',
            formatter: '{c}',
            fontSize: 11,
            fontWeight: 'bold',
            color: 'inherit',
            distance: 8
          },
          data: counts,
          animationDelay: (idx: number) => idx * 100,
          animationDuration: 800
        }
      ],
      animationEasing: 'elasticOut'
    };
  }, [data, title, colors, isRTL, total]);

  if (data.length === 0) {
    return (
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
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
          <BarChart3 className="w-5 h-5" />
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

function adjustColor(color: string, factor: number): string {
  // Simple color adjustment for gradient
  const hex = color.replace('#', '');
  const r = Math.round(parseInt(hex.slice(0, 2), 16) * factor);
  const g = Math.round(parseInt(hex.slice(2, 4), 16) * factor);
  const b = Math.round(parseInt(hex.slice(4, 6), 16) * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

function getStatusBarInsight(status: string, value: number, total: number, isRTL: boolean): string {
  const percentage = (value / total) * 100;
  
  if (status === 'archived' && percentage > 50) {
    return isRTL ? 'نسبة إنجاز ممتازة!' : 'Excellent completion rate!';
  } else if (status === 'pending_warehouse_signature' && percentage > 30) {
    return isRTL ? 'تراكم في الانتظار - يحتاج متابعة' : 'Backlog building up - needs attention';
  } else if (status === 'rejected' && percentage > 10) {
    return isRTL ? 'نسبة رفض مرتفعة - مراجعة مطلوبة' : 'High rejection rate - review needed';
  }
  
  return isRTL ? 'ضمن المعدل الطبيعي' : 'Within normal range';
}

export default StatusBarChart;
