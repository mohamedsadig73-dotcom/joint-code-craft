import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBoxReceipts } from '@/hooks/useBoxReceipts';
import { useBoxSummary } from '@/hooks/useBoxSummary';
import { RTLEChart } from '@/components/charts/RTLEChart';
import { Package, Boxes, Truck, Users, Loader2 } from 'lucide-react';

export function BoxesDashboardTab() {
  const { t } = useLanguage();
  const { receipts, loading } = useBoxReceipts();
  const { summary } = useBoxSummary();

  const stats = useMemo(() => {
    const totalQty = receipts.reduce((s, r) => s + r.qty, 0);
    const suppliers = new Set(receipts.map((r) => r.supplier)).size;
    const boxes = new Set(receipts.map((r) => r.box_no)).size;
    const morocco = receipts.filter((r) => r.destination === 'morocco');
    const uzbekistan = receipts.filter((r) => r.destination === 'uzbekistan');
    return {
      items: receipts.length,
      totalQty,
      boxes,
      suppliers,
      moroccoCount: morocco.length,
      moroccoQty: morocco.reduce((s, r) => s + r.qty, 0),
      uzbCount: uzbekistan.length,
      uzbQty: uzbekistan.reduce((s, r) => s + r.qty, 0),
    };
  }, [receipts]);

  const qtyPerBoxOption = useMemo(() => ({
    tooltip: { trigger: 'axis' },
    grid: { top: 20, left: 50, right: 20, bottom: 50 },
    xAxis: { type: 'category', data: summary.map((s) => s.box_no), axisLabel: { rotate: 45 } },
    yAxis: { type: 'value' },
    series: [{
      type: 'bar',
      data: summary.map((s) => s.total_qty),
      itemStyle: { color: '#2E75B6' },
    }],
  }), [summary]);

  const destPieOption = useMemo(() => ({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: [
        { value: stats.moroccoQty, name: t('dest_morocco'), itemStyle: { color: '#FF8C42' } },
        { value: stats.uzbQty, name: t('dest_uzbekistan'), itemStyle: { color: '#4CAF50' } },
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
    { label: t('suppliers'), value: stats.suppliers, icon: Users, color: 'text-purple-600' },
    { label: t('dest_morocco'), value: `${stats.moroccoCount} / ${stats.moroccoQty}`, icon: Truck, color: 'text-orange-600' },
    { label: t('dest_uzbekistan'), value: `${stats.uzbCount} / ${stats.uzbQty}`, icon: Truck, color: 'text-green-600' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold mb-2">{t('qtyPerBox')}</h3>
          <RTLEChart option={qtyPerBoxOption} style={{ height: '320px' }} />
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold mb-2">{t('destDistribution')}</h3>
          <RTLEChart option={destPieOption} style={{ height: '320px' }} />
        </Card>
      </div>
    </div>
  );
}