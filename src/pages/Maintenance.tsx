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

  return (
    <div className="min-h-screen" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs />
        
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Wrench className="w-8 h-8 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold gradient-text">
              {t('maintenanceTitle')}
            </h1>
          </div>
          <p className="text-muted-foreground">
            {t('maintenanceSubtitle')}
          </p>
        </div>

        <Card className="glass-card border-border/50">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="p-6">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-6 h-auto gap-2">
              <TabsTrigger value="dashboard" className="gap-2 py-2">
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">{t('maintenanceDashboard')}</span>
              </TabsTrigger>
              <TabsTrigger value="schedule" className="gap-2 py-2">
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">{t('annualSchedule')}</span>
              </TabsTrigger>
              <TabsTrigger value="items" className="gap-2 py-2">
                <Wrench className="w-4 h-4" />
                <span className="hidden sm:inline">{t('maintenanceItems')}</span>
              </TabsTrigger>
              <TabsTrigger value="assets" className="gap-2 py-2">
                <Building2 className="w-4 h-4" />
                <span className="hidden sm:inline">{t('assets')}</span>
              </TabsTrigger>
              <TabsTrigger value="vendors" className="gap-2 py-2">
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline">{t('vendors')}</span>
              </TabsTrigger>
            </TabsList>

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