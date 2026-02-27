import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Award, Users, Activity, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { RTLEChart } from '@/components/charts/RTLEChart';
import { getChartTheme, buildChartTooltip, CHART_FONT_FAMILY } from '@/components/charts/chartTheme';
import { toGregorianDateTime } from '@/utils/dateUtils';
import { statusLabels, statusLabelsEn } from '@/constants/statusLabels';
import type { ReportsData } from '@/hooks/useReportsData';
import type { EChartsOption } from 'echarts';

interface Props { data: ReportsData; }

export const ReportsPerformanceTab = memo(function ReportsPerformanceTab({ data }: Props) {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const isDark = document.documentElement.classList.contains('dark');
  const theme = getChartTheme(isDark);
  const tooltip = buildChartTooltip(theme, isAr);
  const labels = isAr ? statusLabels : statusLabelsEn;

  // Gauge charts for key metrics
  const completionGauge = useMemo((): EChartsOption => ({
    series: [{
      type: 'gauge', startAngle: 200, endAngle: -20,
      min: 0, max: 100,
      pointer: { show: true, length: '60%', width: 4, itemStyle: { color: theme.success } },
      progress: { show: true, width: 14, itemStyle: { color: theme.success } },
      axisLine: { lineStyle: { width: 14, color: [[1, theme.border]] } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      detail: { valueAnimation: true, fontFamily: CHART_FONT_FAMILY, fontSize: 28, fontWeight: 'bold', color: theme.text, formatter: '{value}%', offsetCenter: [0, '35%'] },
      title: { show: true, offsetCenter: [0, '60%'], fontFamily: CHART_FONT_FAMILY, fontSize: 13, color: theme.textSecondary },
      data: [{ value: data.completionRate, name: isAr ? 'نسبة الإنجاز' : 'Completion Rate' }],
    }],
  }), [data.completionRate, theme, isAr]);

  const processingGauge = useMemo((): EChartsOption => {
    const speed = Math.max(0, 100 - data.avgProcessingDays * 10);
    return {
      series: [{
        type: 'gauge', startAngle: 200, endAngle: -20,
        min: 0, max: 100,
        pointer: { show: true, length: '60%', width: 4, itemStyle: { color: theme.series[0] } },
        progress: { show: true, width: 14, itemStyle: { color: theme.series[0] } },
        axisLine: { lineStyle: { width: 14, color: [[1, theme.border]] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail: { valueAnimation: true, fontFamily: CHART_FONT_FAMILY, fontSize: 28, fontWeight: 'bold', color: theme.text, formatter: `${data.avgProcessingDays} ${isAr ? 'يوم' : 'days'}`, offsetCenter: [0, '35%'] },
        title: { show: true, offsetCenter: [0, '60%'], fontFamily: CHART_FONT_FAMILY, fontSize: 13, color: theme.textSecondary },
        data: [{ value: speed, name: isAr ? 'سرعة المعالجة' : 'Processing Speed' }],
      }],
    };
  }, [data.avgProcessingDays, theme, isAr]);

  const efficiencyGauge = useMemo((): EChartsOption => {
    const eff = data.totalDeclarations > 0
      ? Math.round(100 - (data.pendingCount / data.totalDeclarations) * 100)
      : 0;
    return {
      series: [{
        type: 'gauge', startAngle: 200, endAngle: -20,
        min: 0, max: 100,
        pointer: { show: true, length: '60%', width: 4, itemStyle: { color: theme.warning } },
        progress: { show: true, width: 14, itemStyle: { color: theme.warning } },
        axisLine: { lineStyle: { width: 14, color: [[1, theme.border]] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail: { valueAnimation: true, fontFamily: CHART_FONT_FAMILY, fontSize: 28, fontWeight: 'bold', color: theme.text, formatter: '{value}%', offsetCenter: [0, '35%'] },
        title: { show: true, offsetCenter: [0, '60%'], fontFamily: CHART_FONT_FAMILY, fontSize: 13, color: theme.textSecondary },
        data: [{ value: eff, name: isAr ? 'الكفاءة' : 'Efficiency' }],
      }],
    };
  }, [data.totalDeclarations, data.pendingCount, theme, isAr]);

  return (
    <div className="space-y-6">
      {/* Gauge Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card border-border/50">
          <CardContent className="pt-4">
            <RTLEChart option={completionGauge} style={{ height: '220px' }} />
          </CardContent>
        </Card>
        <Card className="glass-card border-border/50">
          <CardContent className="pt-4">
            <RTLEChart option={processingGauge} style={{ height: '220px' }} />
          </CardContent>
        </Card>
        <Card className="glass-card border-border/50">
          <CardContent className="pt-4">
            <RTLEChart option={efficiencyGauge} style={{ height: '220px' }} />
          </CardContent>
        </Card>
      </div>

      {/* Top Senders + Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-5 h-5 text-primary" />{isAr ? 'أكثر المستخدمين نشاطاً' : 'Top Active Users'}
            </CardTitle>
            <CardDescription>{isAr ? 'ترتيب المستخدمين حسب عدد الإقرارات' : 'Users ranked by declaration count'}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topSenders.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">{isAr ? 'لا توجد بيانات' : 'No data'}</div>
            ) : (
              <div className="space-y-3">
                {data.topSenders.map((s, i) => (
                  <div key={s.username} className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                      i === 1 ? 'bg-slate-300/30 text-slate-600 dark:text-slate-300' :
                      i === 2 ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400' :
                      'bg-muted text-muted-foreground'
                    }`}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm truncate">{s.username}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">{s.count} ({s.percentage}%)</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${s.percentage}%`, transitionDelay: `${i * 80}ms` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-5 h-5 text-primary" />{t('recentActivities')}
            </CardTitle>
            <CardDescription>{t('latestSystemChanges')}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentActivities.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">{isAr ? 'لا توجد نشاطات' : 'No activities'}</div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {data.recentActivities.map(a => (
                  <div key={a.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="w-1.5 h-1.5 mt-2 rounded-full bg-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm"><span className="font-medium">{a.username}</span> <span className="text-muted-foreground">— {a.message}</span></p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground font-mono">{a.action}</span>
                        <span className="text-[10px] text-muted-foreground">{toGregorianDateTime(a.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
});
