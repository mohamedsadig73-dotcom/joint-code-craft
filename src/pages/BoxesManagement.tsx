import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/ui/PageHeader';
import { ReceiptsTab } from '@/components/boxes/ReceiptsTab';
import { BoxesSummaryTab } from '@/components/boxes/BoxesSummaryTab';
import { BoxesDashboardTab } from '@/components/boxes/BoxesDashboardTab';
import { Package, ClipboardList, BarChart3 } from 'lucide-react';
import { Navigation } from '@/components/Navigation';

export default function BoxesManagement() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<'receipts' | 'boxes' | 'dashboard'>('receipts');

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        <PageHeader
          title={t('boxesManagement')}
          subtitle={t('boxesManagementDesc')}
          icon={Package}
        />

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mt-4">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl">
            <TabsTrigger value="receipts" className="gap-1.5">
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">{t('receiptsLog')}</span>
              <span className="sm:hidden">{t('receiptsLogShort')}</span>
            </TabsTrigger>
            <TabsTrigger value="boxes" className="gap-1.5">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">{t('boxesSummary')}</span>
              <span className="sm:hidden">{t('boxesShort')}</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-1.5">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">{t('statistics')}</span>
              <span className="sm:hidden">{t('stats')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="receipts" className="mt-4">
            <ReceiptsTab />
          </TabsContent>
          <TabsContent value="boxes" className="mt-4">
            <BoxesSummaryTab />
          </TabsContent>
          <TabsContent value="dashboard" className="mt-4">
            <BoxesDashboardTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}