/**
 * InventoryModule (Sprint 4 / P3)
 * ------------------------------------------------------------
 * Single entry point for the inventory domain. Renders all
 * inventory sub-features as tabs (transactions, stock, alerts,
 * counts, custody, locations) so the sidebar exposes ONE link
 * instead of six.
 *
 * The legacy `src/pages/Inventory.tsx` page is kept temporarily
 * as a thin re-export until the next cleanup sprint (S7).
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  Warehouse, Package, UserCheck, MapPin,
  ClipboardList, AlertTriangle, ListChecks,
} from 'lucide-react';
import { TransactionsTab } from '@/components/inventory/TransactionsTab';
import { StockTab } from '@/components/inventory/StockTab';
import { CustodyTab } from '@/components/inventory/CustodyTab';
import { LocationsTab } from '@/components/inventory/LocationsTab';
import { AlertsTab } from '@/components/inventory/AlertsTab';
import { CountsTab } from '@/components/inventory/CountsTab';

type TabKey = 'transactions' | 'stock' | 'alerts' | 'counts' | 'custody' | 'locations';
const VALID: TabKey[] = ['transactions', 'stock', 'alerts', 'counts', 'custody', 'locations'];

export default function InventoryModule() {
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();
  const initial = (params.get('tab') as TabKey) || 'transactions';
  const [tab, setTab] = useState<TabKey>(VALID.includes(initial) ? initial : 'transactions');

  useEffect(() => {
    const current = params.get('tab');
    if (current !== tab) {
      const next = new URLSearchParams(params);
      next.set('tab', tab);
      setParams(next, { replace: true });
    }
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
      <PageHeader title={t('inventoryManagement')} subtitle={t('inventoryManagementDesc')} icon={Warehouse} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="mt-4">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 max-w-4xl">
          <TabsTrigger value="transactions" className="gap-1.5">
            <ClipboardList className="w-4 h-4" />
            <span className="hidden sm:inline">{t('declarations_and_movements')}</span>
          </TabsTrigger>
          <TabsTrigger value="stock" className="gap-1.5">
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">{t('stock')}</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            <span className="hidden sm:inline">{t('lowStockAlerts')}</span>
          </TabsTrigger>
          <TabsTrigger value="counts" className="gap-1.5">
            <ListChecks className="w-4 h-4" />
            <span className="hidden sm:inline">{t('stockCountsNav')}</span>
          </TabsTrigger>
          <TabsTrigger value="custody" className="gap-1.5">
            <UserCheck className="w-4 h-4" />
            <span className="hidden sm:inline">{t('custody')}</span>
          </TabsTrigger>
          <TabsTrigger value="locations" className="gap-1.5">
            <MapPin className="w-4 h-4" />
            <span className="hidden sm:inline">{t('locations')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-4"><TransactionsTab /></TabsContent>
        <TabsContent value="stock" className="mt-4"><StockTab /></TabsContent>
        <TabsContent value="alerts" className="mt-4"><AlertsTab /></TabsContent>
        <TabsContent value="counts" className="mt-4"><CountsTab /></TabsContent>
        <TabsContent value="custody" className="mt-4"><CustodyTab /></TabsContent>
        <TabsContent value="locations" className="mt-4"><LocationsTab /></TabsContent>
      </Tabs>
    </main>
  );
}