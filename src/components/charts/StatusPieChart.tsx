import { useMemo } from 'react';
import { RTLEChart } from './RTLEChart';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart as PieChartIcon } from 'lucide-react';
import type { EChartsOption } from 'echarts';

interface StatusData {
  status: string;
  count: number;
  label: string;
  color?: string;
}

interface StatusPieChartProps {
  data: StatusData[];
  title: string;
  description?: string;
  height?: string;
  showLegend?: boolean;
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

export function StatusPieChart({ 
  data, 
  title, 
  description, 
  height = '320px',
  showLegend = true,
  colors = DEFAULT_COLORS
}: StatusPieChartProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  const total = useMemo(() => data.reduce((sum, item) => sum + item.count, 0), [data]);

  const option = useMemo((): EChartsOption => {
    const chartData = data.map(item => ({
      name: item.label,
      value: item.count,
      itemStyle: {
        color: item.color || colors[item.status] || '#94a3b8'
      }
    }));

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
          const insight = getStatusInsight(params.name, params.value, total, isRTL);
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
      legend: showLegend ? {
        orient: 'vertical',
        left: isRTL ? 'left' : 'right',
        top: 'center',
        itemWidth: 12,
        itemHeight: 12,
        itemGap: 12,
        icon: 'circle',
        textStyle: {
          fontSize: 12,
          fontFamily: 'IBM Plex Sans Arabic, IBM Plex Sans, sans-serif'
        }
      } : undefined,
      series: [
        {
          name: title,
          type: 'pie',
          radius: ['45%', '70%'],
          center: showLegend ? ['35%', '50%'] : ['50%', '50%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 8,
            borderColor: 'transparent',
            borderWidth: 2
          },
          label: {
            show: true,
            position: 'outside',
            formatter: '{b}\n{d}%',
            fontSize: 11,
            fontFamily: 'IBM Plex Sans Arabic, IBM Plex Sans, sans-serif',
            color: 'inherit'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 13,
              fontWeight: 'bold'
            },
            itemStyle: {
              shadowBlur: 20,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.3)'
            }
          },
          data: chartData,
          animationType: 'scale',
          animationEasing: 'elasticOut',
          animationDuration: 1000
        }
      ]
    };
  }, [data, title, showLegend, colors, isRTL, total]);

  if (data.length === 0) {
    return (
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="w-5 h-5" />
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
          <PieChartIcon className="w-5 h-5" />
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

function getStatusInsight(name: string, value: number, total: number, isRTL: boolean): string {
  const percentage = (value / total) * 100;
  
  if (percentage > 40) {
    return isRTL 
      ? 'نسبة مرتفعة - تحتاج إلى متابعة' 
      : 'High percentage - needs attention';
  } else if (percentage > 20) {
    return isRTL 
      ? 'نسبة متوسطة - أداء طبيعي' 
      : 'Medium percentage - normal performance';
  } else {
    return isRTL 
      ? 'نسبة منخفضة - ضمن المعدل المتوقع' 
      : 'Low percentage - within expected range';
  }
}

export default StatusPieChart;
