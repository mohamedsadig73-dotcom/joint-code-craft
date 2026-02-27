import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart as PieChartIcon, BarChart3, Users, GitBranch } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { RTLEChart } from '@/components/charts/RTLEChart';
import { getChartTheme, buildChartTooltip, CHART_FONT_FAMILY } from '@/components/charts/chartTheme';
import type { ReportsData } from '@/hooks/useReportsData';
import type { EChartsOption } from 'echarts';

interface Props { data: ReportsData; }

function useIsDark() {
  return document.documentElement.classList.contains('dark');
}

export const ReportsOverviewTab = memo(function ReportsOverviewTab({ data }: Props) {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const isDark = useIsDark();
  const theme = getChartTheme(isDark);
  const tooltip = buildChartTooltip(theme, isAr);

  const statusPie = useMemo((): EChartsOption => ({
    tooltip: { ...tooltip, trigger: 'item', formatter: (p: any) => `<div style="direction:${isAr ? 'rtl' : 'ltr'}"><b>${p.name}</b><br/>${p.value} (${p.percent}%)</div>` },
    legend: { bottom: 0, icon: 'circle', itemWidth: 10, textStyle: { fontFamily: CHART_FONT_FAMILY, fontSize: 11, color: theme.text } },
    series: [{
      type: 'pie', radius: ['42%', '72%'], center: ['50%', '45%'],
      itemStyle: { borderRadius: 8, borderColor: theme.background, borderWidth: 3 },
      label: { show: true, position: 'outside', fontFamily: CHART_FONT_FAMILY, fontSize: 11, color: theme.text, formatter: '{b}\n{d}%', lineHeight: 16 },
      labelLine: { length: 15, length2: 8 },
      emphasis: { itemStyle: { shadowBlur: 20, shadowColor: 'rgba(0,0,0,0.25)' }, scale: true, scaleSize: 8 },
      data: data.statusDistribution.map(e => ({ name: e.label, value: e.count, itemStyle: { color: e.color } })),
      animationType: 'scale', animationEasing: 'elasticOut', animationDuration: 900,
    }],
  }), [data.statusDistribution, theme, tooltip, isAr]);

  const typePie = useMemo((): EChartsOption => ({
    tooltip: { ...tooltip, trigger: 'item' },
    legend: { bottom: 0, icon: 'circle', itemWidth: 10, textStyle: { fontFamily: CHART_FONT_FAMILY, fontSize: 11, color: theme.text } },
    series: [{
      type: 'pie', radius: ['42%', '72%'], center: ['50%', '45%'], roseType: 'area',
      itemStyle: { borderRadius: 8, borderColor: theme.background, borderWidth: 3 },
      label: { show: true, fontFamily: CHART_FONT_FAMILY, fontSize: 12, color: theme.text, formatter: '{b}: {c}' },
      data: data.typeDistribution.map(e => ({
        name: e.type, value: e.count,
        itemStyle: { color: e.type === 'دخول' ? theme.success : theme.danger },
      })),
      animationType: 'scale', animationDuration: 900,
    }],
  }), [data.typeDistribution, theme, tooltip]);

  const rolePie = useMemo((): EChartsOption => ({
    tooltip: { ...tooltip, trigger: 'item' },
    legend: { bottom: 0, icon: 'circle', itemWidth: 10, textStyle: { fontFamily: CHART_FONT_FAMILY, fontSize: 11, color: theme.text } },
    series: [{
      type: 'pie', radius: ['42%', '72%'], center: ['50%', '45%'],
      itemStyle: { borderRadius: 8, borderColor: theme.background, borderWidth: 3 },
      label: { show: true, fontFamily: CHART_FONT_FAMILY, fontSize: 11, color: theme.text, formatter: '{b}\n{c}' },
      data: [
        { name: isAr ? 'مدير نظام' : 'Admin', value: data.adminCount, itemStyle: { color: theme.danger } },
        { name: isAr ? 'مدير' : 'Manager', value: data.managerCount, itemStyle: { color: theme.warning } },
        { name: isAr ? 'مستخدم' : 'User', value: data.userCount, itemStyle: { color: theme.info } },
      ],
      animationType: 'scale', animationDuration: 900,
    }],
  }), [data.adminCount, data.managerCount, data.userCount, theme, tooltip, isAr]);

  const funnelOption = useMemo((): EChartsOption => ({
    tooltip: { ...tooltip, trigger: 'item', formatter: (p: any) => `<div style="direction:${isAr ? 'rtl' : 'ltr'}"><b>${p.name}</b><br/>${p.value} ${isAr ? 'إقرار' : 'declarations'}</div>` },
    series: [{
      type: 'funnel', left: '10%', top: 20, bottom: 20, width: '80%',
      min: 0, max: Math.max(...data.funnelData.map(d => d.count), 1),
      minSize: '10%', maxSize: '100%',
      sort: 'descending', gap: 4,
      label: { show: true, position: 'inside', fontFamily: CHART_FONT_FAMILY, fontSize: 12, color: '#fff', formatter: '{b}: {c}' },
      itemStyle: { borderWidth: 0, borderRadius: 4 },
      emphasis: { label: { fontSize: 14 } },
      data: data.funnelData.map(d => ({ name: d.stage, value: d.count, itemStyle: { color: d.color } })),
      animationDuration: 1000,
    }],
  }), [data.funnelData, theme, tooltip, isAr]);

  const noData = (h = '250px') => (
    <div className="flex items-center justify-center text-muted-foreground" style={{ height: h }}>
      {isAr ? 'لا توجد بيانات' : 'No data'}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChartIcon className="w-5 h-5 text-primary" />{t('statusDistributionChart')}
            </CardTitle>
            <CardDescription>{t('statusDistributionDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.statusDistribution.length === 0 ? noData() : <RTLEChart option={statusPie} style={{ height: '300px' }} />}
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-5 h-5 text-primary" />{t('typeDistributionChart')}
            </CardTitle>
            <CardDescription>{t('typeDistributionDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.typeDistribution.length === 0 ? noData() : <RTLEChart option={typePie} style={{ height: '300px' }} />}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-5 h-5 text-primary" />{t('userDistribution')}
            </CardTitle>
            <CardDescription>{t('rolePercentage')}</CardDescription>
          </CardHeader>
          <CardContent>
            <RTLEChart option={rolePie} style={{ height: '280px' }} />
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <GitBranch className="w-5 h-5 text-primary" />{isAr ? 'قمع دورة حياة الإقرارات' : 'Declaration Lifecycle Funnel'}
            </CardTitle>
            <CardDescription>{isAr ? 'تدفق الإقرارات عبر المراحل' : 'How declarations flow through stages'}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.funnelData.length === 0 ? noData() : <RTLEChart option={funnelOption} style={{ height: '280px' }} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
});
