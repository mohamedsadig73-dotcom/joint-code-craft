import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EmptyState } from '@/components/EmptyState';
import { useLanguage } from '@/contexts/LanguageContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PieChart as PieChartIcon, BarChart3 } from 'lucide-react';
import { statusLabels, CHART_COLORS } from '@/constants/statusLabels';
import { DeclarationStats } from '@/types/declarations';

interface DashboardChartsProps {
  stats: DeclarationStats;
  loading?: boolean;
}

export function DashboardCharts({ stats, loading }: DashboardChartsProps) {
  const { t } = useLanguage();

  const statusData = useMemo(() => {
    const data = [
      { name: t('draft'), value: stats.draft, color: CHART_COLORS.draft },
      { name: t('pendingWarehouseSignature'), value: stats.pending_warehouse_signature, color: CHART_COLORS.pending },
      { name: t('warehouseSigned'), value: stats.warehouse_signed, color: CHART_COLORS.signed },
      { name: t('sentToAdminOffice'), value: stats.sent_to_admin_office, color: CHART_COLORS.sent },
      { name: t('receivedByAdminOffice'), value: stats.received_by_admin_office, color: CHART_COLORS.received },
      { name: t('returnedToWarehouse'), value: stats.returned_to_warehouse, color: CHART_COLORS.returned },
      { name: t('archived'), value: stats.archived, color: CHART_COLORS.archived },
      { name: t('rejected'), value: stats.rejected, color: CHART_COLORS.rejected },
    ].filter(item => item.value > 0);
    return data;
  }, [stats, t]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card border-border/50 h-80 animate-pulse">
          <div className="h-full bg-muted/20 rounded-lg" />
        </Card>
        <Card className="glass-card border-border/50 h-80 animate-pulse">
          <div className="h-full bg-muted/20 rounded-lg" />
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Status Distribution Chart */}
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="w-5 h-5" />
            {t('statusDistributionChart')}
          </CardTitle>
          <CardDescription>{t('statusDistributionDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {statusData.length === 0 ? (
            <div className="h-64 flex items-center justify-center">
              <EmptyState
                variant="declarations"
                title={t('noData')}
                description={t('noDeclarations')}
              />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats Overview */}
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {t('quickStatsOverview')}
          </CardTitle>
          <CardDescription>{t('declarationBreakdown')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {statusData.length === 0 ? (
              <EmptyState
                variant="declarations"
                title={t('noData')}
                description={t('noDeclarations')}
              />
            ) : (
              statusData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{item.value}</span>
                    <span className="text-muted-foreground text-xs">
                      ({Math.round((item.value / stats.total) * 100)}%)
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
