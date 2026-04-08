import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useLanguage } from '@/contexts/LanguageContext';
import { Wallet, FileText, TrendingUp, Settings, FolderOpen } from 'lucide-react';
import { PettyCashDashboard } from '@/components/petty-cash/PettyCashDashboard';
import { PettyCashList } from '@/components/petty-cash/PettyCashList';
import { PettyCashReports } from '@/components/petty-cash/PettyCashReports';
import { CostCentersManagement } from '@/components/petty-cash/CostCentersManagement';
import { PettyCashPeriodsManagement } from '@/components/petty-cash/PettyCashPeriodsManagement';
import { PageHeader } from '@/components/ui/PageHeader';

export default function PettyCash() {
  const [activeTab, setActiveTab] = useState('periods');
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  return (
    <div className="min-h-screen pb-24 md:pb-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        <Breadcrumbs />
        
        <PageHeader
          icon={Wallet}
          title={t('pettyCashTitle')}
          subtitle={t('pettyCashSubtitle')}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-5 h-auto gap-1">
              <TabsTrigger value="periods" className="gap-1.5 py-2 px-3 whitespace-nowrap">
                <FolderOpen className="w-4 h-4" />
                <span className="text-xs md:text-sm">{t('pettyCashPeriods')}</span>
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="gap-1.5 py-2 px-3 whitespace-nowrap">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs md:text-sm">{t('overview')}</span>
              </TabsTrigger>
              <TabsTrigger value="expenses" className="gap-1.5 py-2 px-3 whitespace-nowrap">
                <FileText className="w-4 h-4" />
                <span className="text-xs md:text-sm">{t('expenses')}</span>
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-1.5 py-2 px-3 whitespace-nowrap">
                <FileText className="w-4 h-4" />
                <span className="text-xs md:text-sm">{t('reports')}</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1.5 py-2 px-3 whitespace-nowrap">
                <Settings className="w-4 h-4" />
                <span className="text-xs md:text-sm">{t('costCenters')}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="periods"><PettyCashPeriodsManagement /></TabsContent>
          <TabsContent value="dashboard"><PettyCashDashboard /></TabsContent>
          <TabsContent value="expenses"><PettyCashList /></TabsContent>
          <TabsContent value="reports"><PettyCashReports /></TabsContent>
          <TabsContent value="settings"><CostCentersManagement /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
