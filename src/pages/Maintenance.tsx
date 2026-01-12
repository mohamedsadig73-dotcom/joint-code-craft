import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MaintenanceDashboard } from '@/components/maintenance/MaintenanceDashboard';
import { VendorsManagement } from '@/components/maintenance/VendorsManagement';
import { AssetsManagement } from '@/components/maintenance/AssetsManagement';
import { MaintenanceItems } from '@/components/maintenance/MaintenanceItems';
import { AnnualSchedule } from '@/components/maintenance/AnnualSchedule';
import { Wrench, Building2, Package, Calendar, LayoutDashboard } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

export default function Maintenance() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { t, language } = useLanguage();

  const isRTL = language === 'ar';

  return (
    <div className="min-h-screen pb-24 md:pb-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        <Breadcrumbs />
        
        {/* Welcome Section - Compact on mobile */}
        <div className="mb-4 md:mb-8">
          <div className={`flex items-center gap-2 md:gap-3 mb-1 md:mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Wrench className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            <h1 className="text-xl md:text-3xl font-bold gradient-text">
              {t('maintenanceTitle')}
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            {t('maintenanceSubtitle')}
          </p>
        </div>

        <Card className="glass-card border-border/50">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="p-3 md:p-6">
            {/* Scrollable tabs on mobile */}
            <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0 mb-4 md:mb-6">
              <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-5 h-auto gap-1 md:gap-2">
                <TabsTrigger value="dashboard" className="gap-1 md:gap-2 py-2 px-3 md:px-4 whitespace-nowrap">
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="text-xs md:text-sm">{t('maintenanceDashboard')}</span>
                </TabsTrigger>
                <TabsTrigger value="schedule" className="gap-1 md:gap-2 py-2 px-3 md:px-4 whitespace-nowrap">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs md:text-sm">{t('annualSchedule')}</span>
                </TabsTrigger>
                <TabsTrigger value="items" className="gap-1 md:gap-2 py-2 px-3 md:px-4 whitespace-nowrap">
                  <Wrench className="w-4 h-4" />
                  <span className="text-xs md:text-sm">{t('maintenanceItems')}</span>
                </TabsTrigger>
                <TabsTrigger value="assets" className="gap-1 md:gap-2 py-2 px-3 md:px-4 whitespace-nowrap">
                  <Building2 className="w-4 h-4" />
                  <span className="text-xs md:text-sm">{t('assets')}</span>
                </TabsTrigger>
                <TabsTrigger value="vendors" className="gap-1 md:gap-2 py-2 px-3 md:px-4 whitespace-nowrap">
                  <Package className="w-4 h-4" />
                  <span className="text-xs md:text-sm">{t('vendors')}</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="dashboard">
              <MaintenanceDashboard />
            </TabsContent>

            <TabsContent value="schedule">
              <AnnualSchedule />
            </TabsContent>

            <TabsContent value="items">
              <MaintenanceItems />
            </TabsContent>

            <TabsContent value="assets">
              <AssetsManagement />
            </TabsContent>

            <TabsContent value="vendors">
              <VendorsManagement />
            </TabsContent>
          </Tabs>
        </Card>
      </main>
    </div>
  );
}