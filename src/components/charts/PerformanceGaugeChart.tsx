import { useMemo } from 'react';
import { RTLEChart } from './RTLEChart';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Gauge, TrendingUp, Clock, Zap } from 'lucide-react';
import type { EChartsOption } from 'echarts';

interface PerformanceMetric {
  label: string;
  value: number;
  target?: number;
  color: string;
  icon?: 'completion' | 'speed' | 'efficiency';
}

interface PerformanceGaugeChartProps {
  completionRate: number;
  avgProcessingDays: number;
  pendingCount: number;
  totalCount: number;
  title: string;
  description?: string;
  height?: string;
}

export function PerformanceGaugeChart({ 
  completionRate,
  avgProcessingDays,
  pendingCount,
  totalCount,
  title, 
  description, 
  height = '320px'
}: PerformanceGaugeChartProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  const efficiencyScore = useMemo(() => {
    if (totalCount === 0) return 0;
    return Math.max(0, Math.round(100 - (pendingCount / totalCount) * 100));
  }, [pendingCount, totalCount]);

  const processingScore = useMemo(() => {
    // Target is 3 days or less = 100%
    return Math.max(0, Math.min(100, Math.round(100 - (avgProcessingDays - 3) * 15)));
  }, [avgProcessingDays]);

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
          const insight = getPerformanceInsight(params.name, params.value, isRTL);
          return `
            <div style="text-align: ${isRTL ? 'right' : 'left'}; direction: ${isRTL ? 'rtl' : 'ltr'}">
              <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px;">
                ${params.name}
              </div>
              <div style="font-size: 24px; font-weight: 700; color: ${params.color}; margin-bottom: 8px;">
                ${params.value}%
              </div>
              <div style="font-size: 11px; color: #60a5fa; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;">
                💡 ${insight}
              </div>
            </div>
          `;
        }
      },
      series: [
        // Completion Rate Gauge
        {
          name: isRTL ? 'نسبة الإنجاز' : 'Completion Rate',
          type: 'gauge',
          center: ['25%', '55%'],
          radius: '70%',
          startAngle: 200,
          endAngle: -20,
          min: 0,
          max: 100,
          splitNumber: 5,
          pointer: {
            length: '60%',
            width: 6,
            itemStyle: {
              color: '#22c55e'
            }
          },
          axisLine: {
            lineStyle: {
              width: 12,
              color: [
                [0.3, '#ef4444'],
                [0.7, '#f59e0b'],
                [1, '#22c55e']
              ]
            }
          },
          axisTick: {
            distance: -15,
            length: 6,
            lineStyle: {
              color: '#fff',
              width: 1
            }
          },
          splitLine: {
            distance: -20,
            length: 12,
            lineStyle: {
              color: '#fff',
              width: 2
            }
          },
          axisLabel: {
            distance: 20,
            color: 'inherit',
            fontSize: 10,
            fontFamily: 'IBM Plex Sans Arabic, IBM Plex Sans, sans-serif'
          },
          detail: {
            valueAnimation: true,
            formatter: '{value}%',
            color: 'inherit',
            fontSize: 18,
            fontWeight: 'bold',
            offsetCenter: [0, '70%'],
            fontFamily: 'IBM Plex Sans Arabic, IBM Plex Sans, sans-serif'
          },
          title: {
            offsetCenter: [0, '95%'],
            fontSize: 11,
            color: 'inherit',
            fontFamily: 'IBM Plex Sans Arabic, IBM Plex Sans, sans-serif'
          },
          data: [{ value: completionRate, name: isRTL ? 'الإنجاز' : 'Completion' }],
          animationDuration: 1500
        },
        // Processing Speed Gauge
        {
          name: isRTL ? 'سرعة المعالجة' : 'Processing Speed',
          type: 'gauge',
          center: ['75%', '55%'],
          radius: '70%',
          startAngle: 200,
          endAngle: -20,
          min: 0,
          max: 100,
          splitNumber: 5,
          pointer: {
            length: '60%',
            width: 6,
            itemStyle: {
              color: '#3b82f6'
            }
          },
          axisLine: {
            lineStyle: {
              width: 12,
              color: [
                [0.3, '#ef4444'],
                [0.7, '#f59e0b'],
                [1, '#3b82f6']
              ]
            }
          },
          axisTick: {
            distance: -15,
            length: 6,
            lineStyle: {
              color: '#fff',
              width: 1
            }
          },
          splitLine: {
            distance: -20,
            length: 12,
            lineStyle: {
              color: '#fff',
              width: 2
            }
          },
          axisLabel: {
            distance: 20,
            color: 'inherit',
            fontSize: 10,
            fontFamily: 'IBM Plex Sans Arabic, IBM Plex Sans, sans-serif'
          },
          detail: {
            valueAnimation: true,
            formatter: '{value}%',
            color: 'inherit',
            fontSize: 18,
            fontWeight: 'bold',
            offsetCenter: [0, '70%'],
            fontFamily: 'IBM Plex Sans Arabic, IBM Plex Sans, sans-serif'
          },
          title: {
            offsetCenter: [0, '95%'],
            fontSize: 11,
            color: 'inherit',
            fontFamily: 'IBM Plex Sans Arabic, IBM Plex Sans, sans-serif'
          },
          data: [{ value: processingScore, name: isRTL ? 'السرعة' : 'Speed' }],
          animationDuration: 1500,
          animationDelay: 300
        }
      ]
    };
  }, [completionRate, processingScore, isRTL]);

  return (
    <Card className="glass-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="w-5 h-5" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <RTLEChart option={option} style={{ height }} />
        
        {/* Performance Summary */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border/50">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-lg font-bold">{completionRate}%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {isRTL ? 'نسبة الإنجاز' : 'Completion'}
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-lg font-bold">{avgProcessingDays}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {isRTL ? 'أيام المعالجة' : 'Avg Days'}
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-orange-600 dark:text-orange-400 mb-1">
              <Zap className="w-4 h-4" />
              <span className="text-lg font-bold">{efficiencyScore}%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {isRTL ? 'الكفاءة' : 'Efficiency'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getPerformanceInsight(name: string, value: number, isRTL: boolean): string {
  if (value >= 80) {
    return isRTL ? 'أداء ممتاز! استمر على هذا المستوى' : 'Excellent performance! Keep it up';
  } else if (value >= 60) {
    return isRTL ? 'أداء جيد، مع إمكانية التحسين' : 'Good performance, room for improvement';
  } else if (value >= 40) {
    return isRTL ? 'أداء متوسط، يحتاج إلى متابعة' : 'Average performance, needs attention';
  } else {
    return isRTL ? 'أداء يحتاج تحسين عاجل' : 'Performance needs urgent improvement';
  }
}

export default PerformanceGaugeChart;
