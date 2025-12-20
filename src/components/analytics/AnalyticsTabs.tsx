import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Award, BarChart3 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AnalyticsCharts } from './AnalyticsCharts';
import type { AnalyticsData } from '@/hooks/useAnalyticsData';

interface AnalyticsTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  data: AnalyticsData;
}

export function AnalyticsTabs({ activeTab, onTabChange, data }: AnalyticsTabsProps) {
  const { t } = useLanguage();

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-6">
      <TabsList className="grid w-full max-w-md grid-cols-3" role="tablist" aria-label={t('analyticsTabs')}>
        <TabsTrigger value="overview" className="gap-2" role="tab" aria-controls="overview-panel">
          <BarChart3 className="w-4 h-4" aria-hidden="true" />
          {t('overviewTab')}
        </TabsTrigger>
        <TabsTrigger value="trends" className="gap-2" role="tab" aria-controls="trends-panel">
          <TrendingUp className="w-4 h-4" aria-hidden="true" />
          {t('trendsTab')}
        </TabsTrigger>
        <TabsTrigger value="performance" className="gap-2" role="tab" aria-controls="performance-panel">
          <Award className="w-4 h-4" aria-hidden="true" />
          {t('performanceTab')}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" id="overview-panel" role="tabpanel" aria-labelledby="overview-tab">
        <AnalyticsCharts data={data} activeTab="overview" />
      </TabsContent>

      <TabsContent value="trends" id="trends-panel" role="tabpanel" aria-labelledby="trends-tab">
        <AnalyticsCharts data={data} activeTab="trends" />
      </TabsContent>

      <TabsContent value="performance" id="performance-panel" role="tabpanel" aria-labelledby="performance-tab">
        <AnalyticsCharts data={data} activeTab="performance" />
      </TabsContent>
    </Tabs>
  );
}
