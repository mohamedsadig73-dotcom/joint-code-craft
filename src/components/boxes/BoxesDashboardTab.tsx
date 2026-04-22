import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBoxReceipts } from '@/hooks/useBoxReceipts';
import { useBoxSummary } from '@/hooks/useBoxSummary';
import { RTLEChart } from '@/components/charts/RTLEChart';
import { Package, Boxes, Truck, Users, Loader2, PackageOpen } from 'lucide-react';
import type { EChartsOption } from 'echarts';

export function BoxesDashboardTab() {
  const { t } = useLanguage();
  const { receipts, loading } = useBoxReceipts();
  const { summary } = useBoxSummary();

  const stats = useMemo(() => {
    const totalQty = receipts.reduce((s, r) => s + r.qty, 0);
    const suppliers = new Set(receipts.map((r) => r.supplier)).size;
    const boxedReceipts = receipts.filter((r) => r.packing_type === 'boxed');
    const looseReceipts = receipts.filter((r) => r.packing_type === 'loose');
    const boxes = new Set(boxedReceipts.map((r) => r.box_no).filter(Boolean)).size;
    const morocco = receipts.filter((r) => r.destination === 'morocco');
    const uzbekistan = receipts.filter((r) => r.destination === 'uzbekistan');
    return {
      items: receipts.length,
      totalQty,
      boxes,
      suppliers,
      boxedCount: boxedReceipts.length,
      boxedQty: boxedReceipts.reduce((s, r) => s + r.qty, 0),
      looseCount: looseReceipts.length,
      looseQty: looseReceipts.reduce((s, r) => s + r.qty, 0),
      moroccoCount: morocco.length,
      moroccoQty: morocco.reduce((s, r) => s + r.qty, 0),
      uzbCount: uzbekistan.length,
      uzbQty: uzbekistan.reduce((s, r) => s + r.qty, 0),
    };
  }, [receipts]);

  const qtyPerBoxOption = useMemo<EChartsOption>(() => ({
    tooltip: { trigger: 'axis' as const },
    grid: { top: 20, left: 50, right: 20, bottom: 50 },
    xAxis: { type: 'category' as const, data: summary.map((s) => s.box_no), axisLabel: { rotate: 45 } },
    yAxis: { type: 'value' as const },
    series: [{
      type: 'bar' as const,
      data: summary.map((s) => s.total_qty),
      itemStyle: { color: 'hsl(var(--primary))' },
    }],
  }), [summary]);

  const destPieOption = useMemo<EChartsOption>(() => ({
    tooltip: { trigger: 'item' as const },
    legend: { bottom: 0 },
    series: [{
      type: 'pie' as const,
      radius: ['40%', '70%'],
      data: [
        { value: stats.moroccoQty, name: t('dest_morocco'), itemStyle: { color: 'hsl(25 95% 53%)' } },
        { value: stats.uzbQty, name: t('dest_uzbekistan'), itemStyle: { color: 'hsl(142 71% 45%)' } },
      ],
    }],
  }), [stats, t]);

  const packingPieOption = useMemo<EChartsOption>(() => ({
    tooltip: { trigger: 'item' as const },
    legend: { bottom: 0 },
    series: [{
      type: 'pie' as const,
      radius: ['40%', '70%'],
      data: [
        { value: stats.boxedQty, name: t('boxed'), itemStyle: { color: 'hsl(217 91% 60%)' } },
        { value: stats.looseQty, name: t('loose'), itemStyle: { color: 'hsl(271 81% 56%)' } },
      ],
    }],
  }), [stats, t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin me-2" />{t('loading')}
      </div>
    );
  }

  const kpis = [
    { label: t('totalItems'), value: stats.items, icon: Package, color: 'text-emerald-600' },
    { label: t('totalQty'), value: stats.totalQty, icon: Boxes, color: 'text-blue-600' },
    { label: t('totalBoxes'), value: stats.boxes, icon: Package, color: 'text-destructive' },
    { label: t('looseItems'), value: `${stats.looseCount} / ${stats.looseQty}`, icon: PackageOpen, color: 'text-purple-600' },
    { label: t('suppliers'), value: stats.suppliers, icon: Users, color: 'text-purple-600' },
    { label: t('dest_morocco'), value: `${stats.moroccoCount} / ${stats.moroccoQty}`, icon: Truck, color: 'text-orange-600' },
    { label: t('dest_uzbekistan'), value: `${stats.uzbCount} / ${stats.uzbQty}`, icon: Truck, color: 'text-green-600' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${k.color}`} />
                <span className="text-xs text-muted-foreground truncate">{k.label}</span>
              </div>
              <div className={`text-lg font-bold tabular-nums ${k.color}`}>
                {typeof k.value === 'number' ? k.value.toLocaleString('en-US') : k.value}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold mb-2">{t('qtyPerBox')}</h3>
          <RTLEChart option={qtyPerBoxOption} style={{ height: '320px' }} />
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold mb-2">{t('destDistribution')}</h3>
          <RTLEChart option={destPieOption} style={{ height: '320px' }} />
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold mb-2">{t('packingDistribution')}</h3>
          <RTLEChart option={packingPieOption} style={{ height: '320px' }} />
        </Card>
      </div>
    </div>
  );
}