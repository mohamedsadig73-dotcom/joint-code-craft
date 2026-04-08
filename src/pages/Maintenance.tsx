import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MaintenanceDashboard } from '@/components/maintenance/MaintenanceDashboard';
import { VendorsManagement } from '@/components/maintenance/VendorsManagement';
import { AssetsManagement } from '@/components/maintenance/AssetsManagement';
import { MaintenanceItems } from '@/components/maintenance/MaintenanceItems';
import { AnnualSchedule } from '@/components/maintenance/AnnualSchedule';
import { Wrench, Building2, Package, Calendar, LayoutDashboard } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { PageHeader } from '@/components/ui/PageHeader';

export default function Maintenance() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  return (
    <div className="min-h-screen pb-24 md:pb-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        <Breadcrumbs />
        
        <PageHeader
          icon={Wrench}
          title={t('maintenanceTitle')}
          subtitle={t('maintenanceSubtitle')}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-5 h-auto gap-1">
              <TabsTrigger value="dashboard" className="gap-1.5 py-2 px-3 whitespace-nowrap">
                <LayoutDashboard className="w-4 h-4" />
                <span className="text-xs md:text-sm">{t('maintenanceDashboard')}</span>
              </TabsTrigger>
              <TabsTrigger value="schedule" className="gap-1.5 py-2 px-3 whitespace-nowrap">
                <Calendar className="w-4 h-4" />
                <span className="text-xs md:text-sm">{t('annualSchedule')}</span>
              </TabsTrigger>
              <TabsTrigger value="items" className="gap-1.5 py-2 px-3 whitespace-nowrap">
                <Wrench className="w-4 h-4" />
                <span className="text-xs md:text-sm">{t('maintenanceItems')}</span>
              </TabsTrigger>
              <TabsTrigger value="assets" className="gap-1.5 py-2 px-3 whitespace-nowrap">
                <Building2 className="w-4 h-4" />
                <span className="text-xs md:text-sm">{t('assets')}</span>
              </TabsTrigger>
              <TabsTrigger value="vendors" className="gap-1.5 py-2 px-3 whitespace-nowrap">
                <Package className="w-4 h-4" />
                <span className="text-xs md:text-sm">{t('vendors')}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard"><MaintenanceDashboard /></TabsContent>
          <TabsContent value="schedule"><AnnualSchedule /></TabsContent>
          <TabsContent value="items"><MaintenanceItems /></TabsContent>
          <TabsContent value="assets"><AssetsManagement /></TabsContent>
          <TabsContent value="vendors"><VendorsManagement /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}