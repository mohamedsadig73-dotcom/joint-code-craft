import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useLanguage } from '@/contexts/LanguageContext';
import { Wallet, Plus, FileText, TrendingUp, Settings } from 'lucide-react';
import { PettyCashDashboard } from '@/components/petty-cash/PettyCashDashboard';
import { PettyCashList } from '@/components/petty-cash/PettyCashList';
import { PettyCashReports } from '@/components/petty-cash/PettyCashReports';
import { CostCentersManagement } from '@/components/petty-cash/CostCentersManagement';

export default function PettyCash() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  return (
    <div className="min-h-screen pb-24 md:pb-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        <Breadcrumbs />
        
        {/* Header Section - Compact on mobile */}
        <div className="mb-4 md:mb-8">
          <div className={`flex items-center gap-2 md:gap-3 mb-1 md:mb-2`}>
            <Wallet className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            <h1 className="text-xl md:text-3xl font-bold gradient-text">
              {t('pettyCashTitle')}
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            {t('pettyCashSubtitle')}
          </p>
        </div>

        <Card className="glass-card border-border/50">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="p-3 md:p-6">
            {/* Scrollable tabs on mobile */}
            <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0 mb-4 md:mb-6">
              <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-4 h-auto gap-1 md:gap-2">
                <TabsTrigger value="dashboard" className="gap-1 md:gap-2 py-2 px-3 md:px-4 whitespace-nowrap">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs md:text-sm">{t('overview')}</span>
                </TabsTrigger>
                <TabsTrigger value="expenses" className="gap-1 md:gap-2 py-2 px-3 md:px-4 whitespace-nowrap">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs md:text-sm">{t('expenses')}</span>
                </TabsTrigger>
                <TabsTrigger value="reports" className="gap-1 md:gap-2 py-2 px-3 md:px-4 whitespace-nowrap">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs md:text-sm">{t('reports')}</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="gap-1 md:gap-2 py-2 px-3 md:px-4 whitespace-nowrap">
                  <Settings className="w-4 h-4" />
                  <span className="text-xs md:text-sm">{t('costCenters')}</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="dashboard">
              <PettyCashDashboard />
            </TabsContent>

            <TabsContent value="expenses">
              <PettyCashList />
            </TabsContent>

            <TabsContent value="reports">
              <PettyCashReports />
            </TabsContent>

            <TabsContent value="settings">
              <CostCentersManagement />
            </TabsContent>
          </Tabs>
        </Card>
      </main>
    </div>
  );
}
