import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { LayoutGrid, TrendingUp, Award, Download } from 'lucide-react';
import { useReportsData } from '@/hooks/useReportsData';
import { ReportsHeader } from '@/components/reports/ReportsHeader';
import { ReportsKPICards } from '@/components/reports/ReportsKPICards';
import { ReportsOverviewTab } from '@/components/reports/ReportsOverviewTab';
import { ReportsTrendsTab } from '@/components/reports/ReportsTrendsTab';
import { ReportsPerformanceTab } from '@/components/reports/ReportsPerformanceTab';
import { ReportsExportTab } from '@/components/reports/ReportsExportTab';
import { useState } from 'react';

export default function ReportsAnalytics() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  const {
    data, loading, loadData,
    selectedYear, handleYearChange, availableYears,
    dateFrom, setDateFrom, dateTo, setDateTo,
  } = useReportsData();

  useEffect(() => { if (user) loadData(); }, [user, loadData]);

  useEffect(() => {
    const channel = supabase.channel('reports-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'declarations' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  if (loading && data.totalDeclarations === 0) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <Skeleton className="h-10 w-64" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-80 rounded-xl" />
              <Skeleton className="h-80 rounded-xl" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        <Breadcrumbs />

        <ReportsHeader
          selectedYear={selectedYear}
          onYearChange={handleYearChange}
          availableYears={availableYears}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onRefresh={loadData}
          loading={loading}
          totalDeclarations={data.totalDeclarations}
        />

        <ReportsKPICards data={data} />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">{t('overviewTab')}</span>
            </TabsTrigger>
            <TabsTrigger value="trends" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">{t('trendsTab')}</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-2">
              <Award className="w-4 h-4" />
              <span className="hidden sm:inline">{t('performanceTab')}</span>
            </TabsTrigger>
            <TabsTrigger value="export" className="gap-2">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">{t('export')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><ReportsOverviewTab data={data} /></TabsContent>
          <TabsContent value="trends"><ReportsTrendsTab data={data} /></TabsContent>
          <TabsContent value="performance"><ReportsPerformanceTab data={data} /></TabsContent>
          <TabsContent value="export">
            <ReportsExportTab dateFrom={dateFrom} dateTo={dateTo} totalDeclarations={data.totalDeclarations} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
