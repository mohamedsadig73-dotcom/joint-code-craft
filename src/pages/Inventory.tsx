import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/ui/PageHeader';
import { Navigation } from '@/components/Navigation';
import { Warehouse, Package, UserCheck, MapPin, ClipboardList } from 'lucide-react';
import { TransactionsTab } from '@/components/inventory/TransactionsTab';
import { StockTab } from '@/components/inventory/StockTab';
import { CustodyTab } from '@/components/inventory/CustodyTab';
import { LocationsTab } from '@/components/inventory/LocationsTab';

export default function Inventory() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<'transactions' | 'stock' | 'custody' | 'locations'>('transactions');

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        <PageHeader title={t('inventoryManagement')} subtitle={t('inventoryManagementDesc')} icon={Warehouse} />

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mt-4">
          <TabsList className="grid w-full grid-cols-4 max-w-3xl">
            <TabsTrigger value="transactions" className="gap-1.5">
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">{t('declarations_and_movements')}</span>
            </TabsTrigger>
            <TabsTrigger value="stock" className="gap-1.5">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">{t('stock')}</span>
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
          <TabsContent value="custody" className="mt-4"><CustodyTab /></TabsContent>
          <TabsContent value="locations" className="mt-4"><LocationsTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}