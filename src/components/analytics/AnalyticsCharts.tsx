import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { motion } from 'framer-motion';
import {
  TrendingUp, Calendar, Clock, Award, Users, BarChart3, PieChart as PieChartIcon
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { RTLEChart } from '@/components/charts/RTLEChart';
import type { AnalyticsData } from '@/hooks/useAnalyticsData';
import type { EChartsOption } from 'echarts';

interface AnalyticsChartsProps {
  data: AnalyticsData;
  activeTab: string;
}

const FONT_FAMILY = 'IBM Plex Sans Arabic, IBM Plex Sans, sans-serif';

function buildTooltip(isRTL: boolean): EChartsOption['tooltip'] {
  return {
    trigger: 'item',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderRadius: 12,
    padding: [12, 16],
    textStyle: { color: '#fff', fontSize: 13, fontFamily: FONT_FAMILY },
  };
}

export function AnalyticsCharts({ data, activeTab }: AnalyticsChartsProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  // ─── Overview Tab Charts ───
  const statusPieOption = useMemo((): EChartsOption => ({
    tooltip: {
      ...buildTooltip(isRTL),
      trigger: 'item',
      formatter: (params: any) => {
        const pct = ((params.value / data.statusDistribution.reduce((s: number, i: any) => s + i.count, 0)) * 100).toFixed(1);
        return `<div style="direction:${isRTL ? 'rtl' : 'ltr'}; text-align:${isRTL ? 'right' : 'left'}">
          <b>${params.name}</b><br/>${isRTL ? 'العدد' : 'Count'}: ${params.value}<br/>${isRTL ? 'النسبة' : 'Pct'}: ${pct}%</div>`;
      },
    },
    legend: { bottom: 0, icon: 'circle', itemWidth: 12, itemHeight: 12, textStyle: { fontFamily: FONT_FAMILY, fontSize: 11 } },
    series: [{
      type: 'pie', radius: ['40%', '70%'], center: ['50%', '45%'],
      itemStyle: { borderRadius: 6, borderColor: 'transparent', borderWidth: 2 },
      label: {
        show: true, position: 'outside', fontSize: 11, fontFamily: FONT_FAMILY,
        formatter: (p: any) => `${p.name}\n${((p.value / data.statusDistribution.reduce((s: number, i: any) => s + i.count, 0)) * 100).toFixed(0)}%`,
        lineHeight: 16,
      },
      labelLine: { show: true, length: 15, length2: 10 },
      emphasis: { itemStyle: { shadowBlur: 15, shadowColor: 'rgba(0,0,0,0.3)' } },
      data: data.statusDistribution.map(e => ({ name: e.label, value: e.count, itemStyle: { color: e.color } })),
      animationType: 'scale', animationEasing: 'elasticOut', animationDuration: 800,
    }],
  }), [data.statusDistribution, isRTL]);

  const typeBarOption = useMemo((): EChartsOption => ({
    tooltip: { ...buildTooltip(isRTL), trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: data.typeDistribution.map(e => e.type), axisLabel: { fontFamily: FONT_FAMILY } },
    series: [{
      type: 'bar', barWidth: '60%',
      itemStyle: { borderRadius: [0, 8, 8, 0] },
      data: data.typeDistribution.map(e => ({
        value: e.count,
        itemStyle: { color: e.type === 'دخول' ? '#22c55e' : '#ef4444' },
      })),
      animationDuration: 800,
    }],
  }), [data.typeDistribution, isRTL]);

  const weeklyBarOption = useMemo((): EChartsOption => ({
    tooltip: { ...buildTooltip(isRTL), trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: data.weeklyActivity.map(e => e.day), axisLabel: { fontFamily: FONT_FAMILY } },
    yAxis: { type: 'value' },
    series: [{
      type: 'bar', barWidth: '50%',
      itemStyle: { borderRadius: [8, 8, 0, 0], color: 'hsl(var(--primary))' },
      data: data.weeklyActivity.map(e => e.count),
      animationDuration: 800,
    }],
  }), [data.weeklyActivity, isRTL]);

  // ─── Trends Tab Charts ───
  const monthlyTrendOption = useMemo((): EChartsOption => ({
    tooltip: { ...buildTooltip(isRTL), trigger: 'axis' },
    legend: { bottom: 0, textStyle: { fontFamily: FONT_FAMILY, fontSize: 11 } },
    grid: { left: '3%', right: '4%', bottom: 40, containLabel: true },
    xAxis: { type: 'category', data: data.monthlyTrend.map(e => e.month), axisLabel: { fontFamily: FONT_FAMILY } },
    yAxis: { type: 'value' },
    series: [
      {
        name: t('totalLabel'), type: 'line', smooth: true,
        areaStyle: { opacity: 0.15 },
        lineStyle: { width: 2 },
        data: data.monthlyTrend.map(e => e.total),
        animationDuration: 1000,
      },
      {
        name: t('inboundType'), type: 'bar', stack: 'types',
        itemStyle: { color: '#22c55e', borderRadius: [4, 4, 0, 0] },
        data: data.monthlyTrend.map(e => e.دخول),
      },
      {
        name: t('outboundType'), type: 'bar', stack: 'types',
        itemStyle: { color: '#ef4444', borderRadius: [4, 4, 0, 0] },
        data: data.monthlyTrend.map(e => e.خروج),
      },
      {
        name: t('completedLabel'), type: 'line', smooth: true,
        lineStyle: { width: 2, color: '#f59e0b' },
        itemStyle: { color: '#f59e0b' },
        symbol: 'circle', symbolSize: 6,
        data: data.monthlyTrend.map(e => e.completed),
      },
    ],
  }), [data.monthlyTrend, isRTL, t]);

  const hourlyAreaOption = useMemo((): EChartsOption => ({
    tooltip: { ...buildTooltip(isRTL), trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: data.hourlyDistribution.map(e => e.hour), axisLabel: { fontFamily: FONT_FAMILY, fontSize: 10 } },
    yAxis: { type: 'value' },
    series: [{
      name: t('declarationCount'), type: 'line', smooth: true,
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(139,92,246,0.4)' }, { offset: 1, color: 'rgba(139,92,246,0)' }] } },
      lineStyle: { width: 2, color: '#8b5cf6' },
      itemStyle: { color: '#8b5cf6' },
      data: data.hourlyDistribution.map(e => e.count),
      animationDuration: 1000,
    }],
  }), [data.hourlyDistribution, isRTL, t]);

  // ─── Performance Tab Charts ───
  const performanceGaugeOption = useMemo((): EChartsOption => ({
    tooltip: { ...buildTooltip(isRTL), trigger: 'item' },
    legend: { bottom: 0, textStyle: { fontFamily: FONT_FAMILY, fontSize: 11 } },
    series: [{
      type: 'pie', radius: ['30%', '55%'], center: ['50%', '45%'],
      startAngle: 180, endAngle: 360,
      itemStyle: { borderRadius: 6 },
      label: { show: true, position: 'outside', fontFamily: FONT_FAMILY, fontSize: 11, formatter: '{b}: {c}%' },
      data: data.performanceMetrics.map(m => ({
        name: m.metric, value: m.value, itemStyle: { color: m.fill },
      })),
      animationType: 'scale', animationDuration: 800,
    }],
  }), [data.performanceMetrics, isRTL]);

  if (activeTab === 'overview') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5" aria-hidden="true" />
                  {t('statusDistributionChart')}
                </CardTitle>
                <CardDescription>{t('statusDistributionDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <RTLEChart option={statusPieOption} style={{ height: '300px' }} />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" aria-hidden="true" />
                  {t('typeDistributionChart')}
                </CardTitle>
                <CardDescription>{t('typeDistributionDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <RTLEChart option={typeBarOption} style={{ height: '300px' }} />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" aria-hidden="true" />
                {t('weeklyActivityChart')}
              </CardTitle>
              <CardDescription>{t('weeklyActivityDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <RTLEChart option={weeklyBarOption} style={{ height: '250px' }} />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (activeTab === 'trends') {
    return (
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" aria-hidden="true" />
                {t('monthlyTrendChart')}
              </CardTitle>
              <CardDescription>{t('monthlyTrendDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <RTLEChart option={monthlyTrendOption} style={{ height: '350px' }} />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" aria-hidden="true" />
                {t('timeDistributionChart')}
              </CardTitle>
              <CardDescription>{t('timeDistributionDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <RTLEChart option={hourlyAreaOption} style={{ height: '250px' }} />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (activeTab === 'performance') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" aria-hidden="true" />
                {t('performanceIndicatorsChart')}
              </CardTitle>
              <CardDescription>{t('performanceIndicatorsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <RTLEChart option={performanceGaugeOption} style={{ height: '300px' }} />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" aria-hidden="true" />
                {t('topSendersChart')}
              </CardTitle>
              <CardDescription>{t('topSendersDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4" role="list" aria-label={t('topSendersChart')}>
                {data.topSenders.map((sender, index) => (
                  <div key={sender.username} className="flex items-center gap-4" role="listitem">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                      ${index === 0 ? 'bg-yellow-500/20 text-yellow-600' : 
                        index === 1 ? 'bg-gray-300/20 text-gray-600' :
                        index === 2 ? 'bg-orange-500/20 text-orange-600' :
                        'bg-muted text-muted-foreground'}
                    `} aria-label={`${t('rank')} ${index + 1}`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{sender.username}</span>
                        <span className="text-sm text-muted-foreground">{sender.count} {t('declarationCount')}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={sender.percentage} aria-valuemin={0} aria-valuemax={100}>
                        <motion.div
                          className="h-full bg-primary rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${sender.percentage}%` }}
                          transition={{ delay: index * 0.1, duration: 0.5 }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return null;
}
