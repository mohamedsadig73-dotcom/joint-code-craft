import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, BarChart3, Clock, Activity } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { RTLEChart } from '@/components/charts/RTLEChart';
import { getChartTheme, buildChartTooltip, CHART_FONT_FAMILY } from '@/components/charts/chartTheme';
import type { ReportsData } from '@/hooks/useReportsData';
import type { EChartsOption } from 'echarts';

interface Props { data: ReportsData; }

export const ReportsTrendsTab = memo(function ReportsTrendsTab({ data }: Props) {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const isDark = document.documentElement.classList.contains('dark');
  const theme = getChartTheme(isDark);
  const tooltip = buildChartTooltip(theme, isAr);

  const monthlyOption = useMemo((): EChartsOption => ({
    tooltip: { ...tooltip, trigger: 'axis' },
    legend: { bottom: 0, textStyle: { fontFamily: CHART_FONT_FAMILY, fontSize: 11, color: theme.text } },
    grid: { left: '3%', right: '4%', bottom: 45, top: 30, containLabel: true },
    xAxis: { type: 'category', data: data.monthlyTrends.map(e => e.month), axisLabel: { fontFamily: CHART_FONT_FAMILY, color: theme.textSecondary }, axisLine: { lineStyle: { color: theme.border } } },
    yAxis: { type: 'value', axisLabel: { color: theme.textSecondary }, splitLine: { lineStyle: { color: theme.border, type: 'dashed' } } },
    series: [
      { name: isAr ? 'الإجمالي' : 'Total', type: 'line', smooth: true, lineStyle: { width: 3, color: theme.series[0] }, itemStyle: { color: theme.series[0] }, areaStyle: { opacity: 0.1, color: theme.series[0] }, symbol: 'circle', symbolSize: 6, data: data.monthlyTrends.map(e => e.total) },
      { name: t('inboundType'), type: 'bar', stack: 'types', itemStyle: { color: theme.success, borderRadius: [4, 4, 0, 0] }, barWidth: '40%', data: data.monthlyTrends.map(e => e.دخول) },
      { name: t('outboundType'), type: 'bar', stack: 'types', itemStyle: { color: theme.danger, borderRadius: [4, 4, 0, 0] }, data: data.monthlyTrends.map(e => e.خروج) },
      { name: isAr ? 'المكتمل' : 'Completed', type: 'line', smooth: true, lineStyle: { width: 2, color: theme.warning, type: 'dashed' }, itemStyle: { color: theme.warning }, symbol: 'diamond', symbolSize: 7, data: data.monthlyTrends.map(e => e.completed) },
    ],
  }), [data.monthlyTrends, theme, tooltip, isAr, t]);

  const weeklyOption = useMemo((): EChartsOption => ({
    tooltip: { ...tooltip, trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', top: 20, containLabel: true },
    xAxis: { type: 'category', data: data.weeklyActivity.map(e => e.day), axisLabel: { fontFamily: CHART_FONT_FAMILY, color: theme.textSecondary } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: theme.border, type: 'dashed' } } },
    series: [{
      type: 'bar', barWidth: '55%',
      itemStyle: {
        borderRadius: [8, 8, 0, 0],
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: theme.series[0] }, { offset: 1, color: theme.info }] } as any,
      },
      emphasis: { itemStyle: { shadowBlur: 12, shadowColor: 'rgba(0,0,0,0.2)' } },
      data: data.weeklyActivity.map(e => e.count),
      animationDuration: 800,
    }],
  }), [data.weeklyActivity, theme, tooltip]);

  const hourlyOption = useMemo((): EChartsOption => {
    const maxCount = Math.max(...data.hourlyDistribution.map(h => h.count), 1);
    return {
      tooltip: { ...tooltip, trigger: 'axis', formatter: (p: any) => {
        const d = p[0];
        return `<div style="direction:${isAr ? 'rtl' : 'ltr'}"><b>${d.name}</b><br/>${d.value} ${isAr ? 'إقرار' : 'declarations'}</div>`;
      }},
      grid: { left: '3%', right: '4%', bottom: '3%', top: 20, containLabel: true },
      xAxis: { type: 'category', data: data.hourlyDistribution.map(h => `${h.hour}:00`), axisLabel: { fontFamily: CHART_FONT_FAMILY, fontSize: 10, color: theme.textSecondary, interval: 2 } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: theme.border, type: 'dashed' } } },
      series: [{
        type: 'line', smooth: true,
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: `${theme.info}66` }, { offset: 1, color: `${theme.info}05` }] } as any },
        lineStyle: { width: 2.5, color: theme.info },
        itemStyle: { color: theme.info },
        symbol: 'none',
        data: data.hourlyDistribution.map(h => h.count),
        animationDuration: 1000,
      }],
      visualMap: [{
        show: false, type: 'continuous',
        min: 0, max: maxCount,
        inRange: { color: [theme.info, theme.warning] },
        dimension: 1,
      }],
    };
  }, [data.hourlyDistribution, theme, tooltip, isAr]);

  const noData = (h = '250px') => (
    <div className="flex items-center justify-center text-muted-foreground" style={{ height: h }}>
      {isAr ? 'لا توجد بيانات' : 'No data'}
    </div>
  );

  return (
    <div className="space-y-6">
      <Card className="glass-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-5 h-5 text-primary" />{t('monthlyTrendChart')}
          </CardTitle>
          <CardDescription>{t('monthlyTrendDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {data.monthlyTrends.length === 0 ? noData('300px') : <RTLEChart option={monthlyOption} style={{ height: '350px' }} />}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-5 h-5 text-primary" />{t('weeklyActivityChart')}
            </CardTitle>
            <CardDescription>{t('weeklyActivityDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.weeklyActivity.every(w => w.count === 0) ? noData() : <RTLEChart option={weeklyOption} style={{ height: '280px' }} />}
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="w-5 h-5 text-primary" />{isAr ? 'التوزيع بالساعة' : 'Hourly Distribution'}
            </CardTitle>
            <CardDescription>{isAr ? 'أوقات الذروة لإنشاء الإقرارات' : 'Peak hours for declaration creation'}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.hourlyDistribution.every(h => h.count === 0) ? noData() : <RTLEChart option={hourlyOption} style={{ height: '280px' }} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
});
