import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Navigation } from '@/components/Navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWmsKpis, useLowStock } from '@/hooks/useWmsReports';
import { useInvTransactions } from '@/hooks/useInventory';
import {
  LayoutDashboard, Package, MapPin, ArrowDownToLine, ArrowUpFromLine,
  AlertTriangle, UserCheck, FileText, BarChart3, Loader2,
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, color, to }: { icon: typeof Package; label: string; value: number | string; color: string; to?: string }) {
  const content = (
    <Card className="hover:shadow-md transition-shadow h-full">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold tabular-nums">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

export default function WmsDashboard() {
  const { t, language } = useLanguage();
  const { kpis, loading: kpisLoading } = useWmsKpis();
  const { items: lowStock, loading: lowLoading } = useLowStock();
  const { transactions } = useInvTransactions();

  const recent = useMemo(() => transactions.slice(0, 5), [transactions]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        <PageHeader
          title={t('wmsDashboard')}
          subtitle={t('wmsDashboardDesc')}
          icon={LayoutDashboard}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm"><Link to="/inventory"><Package className="w-4 h-4 me-1" />{t('inventoryManagement')}</Link></Button>
              <Button asChild size="sm"><Link to="/wms/reports"><BarChart3 className="w-4 h-4 me-1" />{t('reports')}</Link></Button>
            </div>
          }
        />

        {/* KPIs */}
        {kpisLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            <StatCard icon={Package} label={t('totalItems')} value={kpis.totalItems} color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" to="/items-master" />
            <StatCard icon={MapPin} label={t('totalLocations')} value={kpis.totalLocations} color="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" to="/inventory" />
            <StatCard icon={ArrowDownToLine} label={t('todayMovements')} value={kpis.todayMovements} color="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" to="/inventory" />
            <StatCard icon={UserCheck} label={t('activeCustody')} value={kpis.totalCustody} color="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" to="/inventory" />
            <StatCard icon={AlertTriangle} label={t('lowStockAlerts')} value={kpis.lowStockCount} color="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" to="/wms/reports" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Low Stock Alerts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                {t('lowStockAlerts')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lowLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : lowStock.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">{t('noLowStock')}</p>
              ) : (
                <div className="space-y-2">
                  {lowStock.slice(0, 8).map(item => (
                    <div key={item.item_id} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border/40">
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-sm font-semibold truncate">{item.part_no}</div>
                        <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                      </div>
                      <div className="text-end shrink-0">
                        <Badge variant="destructive" className="tabular-nums">{item.total_qty} / {item.min_qty}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Movements */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                {t('recentMovements')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">{t('noTransactionsDecl')}</p>
              ) : (
                <div className="space-y-2">
                  {recent.map(tx => {
                    const Icon = tx.txn_type === 'in' ? ArrowDownToLine : ArrowUpFromLine;
                    const color = tx.txn_type === 'in' ? 'text-green-600' : 'text-orange-600';
                    return (
                      <Link key={tx.id} to="/inventory" className="flex items-center gap-2 p-2 rounded-lg border border-border/40 hover:bg-muted/40">
                        <Icon className={`w-4 h-4 ${color}`} />
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-sm">{tx.txn_no}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(tx.txn_date).toLocaleDateString('en-GB')}
                            {tx.declaration_id && <> · {tx.declaration_id}</>}
                          </div>
                        </div>
                        <Badge variant={tx.status === 'posted' ? 'default' : 'secondary'} className="text-xs">
                          {t(tx.status)}
                        </Badge>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}