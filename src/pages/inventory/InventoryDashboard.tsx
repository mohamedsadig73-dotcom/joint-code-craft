import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatsCard } from '@/components/ui/StatsCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RTLEChart } from '@/components/charts/RTLEChart';
import {
  Package,
  Warehouse,
  DollarSign,
  ArrowLeftRight,
  AlertTriangle,
  FileText,
  ClipboardCheck,
  BarChart3,
  Plus,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface DashboardData {
  totalItems: number;
  totalWarehouses: number;
  inventoryValue: number;
  movementsToday: number;
  lowStockCount: number;
  draftMovements: number;
  last30Days: { date: string; receipts: number; issues: number }[];
  topItems: { name: string; qty: number }[];
  warehouseDist: { name: string; value: number }[];
}

export default function InventoryDashboard() {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  async function load() {
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const thirtyAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const [
        itemsRes,
        whsRes,
        balancesRes,
        movementsTodayRes,
        draftRes,
        recent30Res,
      ] = await Promise.all([
        supabase.from('items_master').select('id, min_qty', { count: 'exact', head: false }).limit(5000),
        supabase.from('warehouses').select('id, name_ar, name_en', { count: 'exact' }).eq('is_active', true),
        supabase.from('stock_balances').select('warehouse_id, item_id, qty_on_hand, avg_cost').limit(5000),
        supabase
          .from('stock_movements')
          .select('id', { count: 'exact', head: true })
          .eq('movement_date', today)
          .eq('status', 'posted'),
        supabase
          .from('stock_movements')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'draft'),
        supabase
          .from('stock_movements')
          .select('movement_type, movement_date, total_qty')
          .eq('status', 'posted')
          .gte('movement_date', thirtyAgo)
          .order('movement_date'),
      ]);

      // Inventory value + low stock
      const balances = balancesRes.data ?? [];
      const items = itemsRes.data ?? [];
      const minMap = new Map(items.map((i: any) => [i.id, Number(i.min_qty ?? 0)]));
      let inventoryValue = 0;
      const onHandPerItem = new Map<string, number>();
      const onHandPerWh = new Map<string, number>();
      balances.forEach((b: any) => {
        const q = Number(b.qty_on_hand);
        const c = Number(b.avg_cost);
        inventoryValue += q * c;
        onHandPerItem.set(b.item_id, (onHandPerItem.get(b.item_id) ?? 0) + q);
        onHandPerWh.set(b.warehouse_id, (onHandPerWh.get(b.warehouse_id) ?? 0) + q * c);
      });
      let lowStockCount = 0;
      onHandPerItem.forEach((qty, itemId) => {
        const min = minMap.get(itemId) ?? 0;
        if (min > 0 && qty <= min) lowStockCount++;
      });

      // 30-day chart
      const dayMap = new Map<string, { receipts: number; issues: number }>();
      (recent30Res.data ?? []).forEach((m: any) => {
        const d = m.movement_date;
        const cur = dayMap.get(d) ?? { receipts: 0, issues: 0 };
        const q = Number(m.total_qty) || 0;
        if (m.movement_type === 'receipt') cur.receipts += q;
        else if (m.movement_type === 'issue') cur.issues += q;
        dayMap.set(d, cur);
      });
      const last30Days = Array.from(dayMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({ date, ...v }));

      // Top 10 moved items (by movement lines qty in last 30d)
      const { data: linesData } = await supabase
        .from('stock_movement_lines')
        .select('item_id, qty, movement_id')
        .limit(5000);
      // need to filter by posted/30d -> fetch posted movement IDs in window:
      const postedIds = new Set((recent30Res.data ?? []).map((m: any, i: number) => m.id).filter(Boolean));
      // recent30Res didn't select id; refetch lightweight ids
      const { data: postedMovs } = await supabase
        .from('stock_movements')
        .select('id')
        .eq('status', 'posted')
        .gte('movement_date', thirtyAgo)
        .limit(2000);
      const postedSet = new Set((postedMovs ?? []).map((m: any) => m.id));
      const itemQtyMap = new Map<string, number>();
      (linesData ?? []).forEach((l: any) => {
        if (!postedSet.has(l.movement_id)) return;
        itemQtyMap.set(l.item_id, (itemQtyMap.get(l.item_id) ?? 0) + Number(l.qty));
      });
      const topIds = Array.from(itemQtyMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      let topItems: { name: string; qty: number }[] = [];
      if (topIds.length > 0) {
        const { data: itemsTop } = await supabase
          .from('items_master')
          .select('id, part_no, description')
          .in('id', topIds.map(([id]) => id));
        const m = new Map((itemsTop ?? []).map((i: any) => [i.id, i]));
        topItems = topIds.map(([id, qty]) => {
          const it = m.get(id);
          return {
            name: it ? `${it.part_no}` : '—',
            qty,
          };
        });
      }

      // Warehouse distribution (by value)
      const whs = whsRes.data ?? [];
      const warehouseDist = whs
        .map((w: any) => ({
          name: (language === 'ar' ? w.name_ar : w.name_en || w.name_ar) ?? '—',
          value: Math.round(onHandPerWh.get(w.id) ?? 0),
        }))
        .filter((w) => w.value > 0);

      setData({
        totalItems: itemsRes.count ?? items.length,
        totalWarehouses: whsRes.count ?? whs.length,
        inventoryValue,
        movementsToday: movementsTodayRes.count ?? 0,
        lowStockCount,
        draftMovements: draftRes.count ?? 0,
        last30Days,
        topItems,
        warehouseDist,
      });
    } catch (e: any) {
      toast.error(e.message ?? 'Error');
    } finally {
      setLoading(false);
    }
  }

  const trendOption = useMemo<any>(() => {
    if (!data) return {};
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: [t('movementReceipt'), t('movementIssue')] },
      grid: { left: 40, right: 16, top: 40, bottom: 30 },
      xAxis: { type: 'category', data: data.last30Days.map((d) => d.date.slice(5)) },
      yAxis: { type: 'value' },
      series: [
        {
          name: t('movementReceipt'),
          type: 'line',
          smooth: true,
          data: data.last30Days.map((d) => Math.round(d.receipts)),
          itemStyle: { color: 'hsl(142 71% 45%)' },
        },
        {
          name: t('movementIssue'),
          type: 'line',
          smooth: true,
          data: data.last30Days.map((d) => Math.round(d.issues)),
          itemStyle: { color: 'hsl(38 92% 50%)' },
        },
      ],
    };
  }, [data, t]);

  const topItemsOption = useMemo<any>(() => {
    if (!data) return {};
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 100, right: 16, top: 16, bottom: 30 },
      xAxis: { type: 'value' },
      yAxis: { type: 'category', data: data.topItems.map((i) => i.name).reverse() },
      series: [
        {
          type: 'bar',
          data: data.topItems.map((i) => Math.round(i.qty)).reverse(),
          itemStyle: { color: 'hsl(217 91% 60%)' },
        },
      ],
    };
  }, [data]);

  const whDistOption = useMemo<any>(() => {
    if (!data) return {};
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0 },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          data: data.warehouseDist.map((w) => ({ name: w.name, value: w.value })),
        },
      ],
    };
  }, [data]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        <PageHeader
          title={t('inventoryDashboard')}
          subtitle={t('inventoryDashboardDesc')}
          icon={BarChart3}
          actions={
            <Button variant="outline" asChild>
              <Link to="/inventory">
                <Warehouse className="w-4 h-4 me-1.5" />
                {t('backToInventory')}
              </Link>
            </Button>
          }
        />

        {loading || !data ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              <StatsCard
                label={t('kpiTotalItems')}
                value={data.totalItems.toLocaleString()}
                icon={Package}
                color="text-blue-600"
                bgColor="bg-blue-500/10"
              />
              <StatsCard
                label={t('kpiTotalWarehouses')}
                value={data.totalWarehouses.toLocaleString()}
                icon={Warehouse}
                color="text-purple-600"
                bgColor="bg-purple-500/10"
              />
              <StatsCard
                label={t('kpiInventoryValue')}
                value={Math.round(data.inventoryValue).toLocaleString()}
                icon={DollarSign}
                color="text-green-600"
                bgColor="bg-green-500/10"
              />
              <StatsCard
                label={t('kpiMovementsToday')}
                value={data.movementsToday.toLocaleString()}
                icon={ArrowLeftRight}
                color="text-cyan-600"
                bgColor="bg-cyan-500/10"
              />
              <StatsCard
                label={t('kpiLowStockCount')}
                value={data.lowStockCount.toLocaleString()}
                icon={AlertTriangle}
                color="text-amber-600"
                bgColor="bg-amber-500/10"
              />
              <StatsCard
                label={t('kpiPendingMovements')}
                value={data.draftMovements.toLocaleString()}
                icon={FileText}
                color="text-rose-600"
                bgColor="bg-rose-500/10"
              />
            </div>

            {/* Quick Actions */}
            <Card className="p-4 mb-6">
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link to="/inventory/movements/new">
                    <Plus className="w-4 h-4 me-1.5" />
                    {t('newMovement')}
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/inventory/counts/new">
                    <ClipboardCheck className="w-4 h-4 me-1.5" />
                    {t('newStockCount')}
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/inventory/balances">
                    <BarChart3 className="w-4 h-4 me-1.5" />
                    {t('stockBalances')}
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/inventory/low-stock">
                    <AlertTriangle className="w-4 h-4 me-1.5" />
                    {t('lowStockReport')}
                  </Link>
                </Button>
              </div>
            </Card>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-3">{t('last30DaysMovements')}</h3>
                {data.last30Days.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-12">{t('noStockData')}</div>
                ) : (
                  <RTLEChart option={trendOption} style={{ height: 300 }} />
                )}
              </Card>

              <Card className="p-4">
                <h3 className="font-semibold mb-3">{t('warehouseDistribution')}</h3>
                {data.warehouseDist.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-12">{t('noStockData')}</div>
                ) : (
                  <RTLEChart option={whDistOption} style={{ height: 300 }} />
                )}
              </Card>
            </div>

            <Card className="p-4">
              <h3 className="font-semibold mb-3">{t('topMovedItems')}</h3>
              {data.topItems.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-12">{t('noStockData')}</div>
              ) : (
                <RTLEChart option={topItemsOption} style={{ height: 360 }} />
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  );
}