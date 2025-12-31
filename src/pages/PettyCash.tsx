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
    <div className="min-h-screen" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs />
        
        {/* Header Section */}
        <div className="mb-8">
          <div className={`flex items-center gap-3 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Wallet className="w-8 h-8 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold gradient-text">
              {t('pettyCashTitle')}
            </h1>
          </div>
          <p className="text-muted-foreground">
            {t('pettyCashSubtitle')}
          </p>
        </div>

        <Card className="glass-card border-border/50">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="p-6">
            <TabsList className={`grid w-full grid-cols-2 md:grid-cols-4 mb-6 h-auto gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <TabsTrigger value="dashboard" className="gap-2 py-2">
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">{t('overview')}</span>
              </TabsTrigger>
              <TabsTrigger value="expenses" className="gap-2 py-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">{t('expenses')}</span>
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-2 py-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">{t('reports')}</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2 py-2">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">{t('costCenters')}</span>
              </TabsTrigger>
            </TabsList>

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
