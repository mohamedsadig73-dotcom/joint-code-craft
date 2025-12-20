import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { AnalyticsHeader } from '@/components/analytics/AnalyticsHeader';
import { AnalyticsKPICards } from '@/components/analytics/AnalyticsKPICards';
import { AnalyticsTabs } from '@/components/analytics/AnalyticsTabs';
import { AnalyticsLoadingSkeleton } from '@/components/analytics/AnalyticsLoadingSkeleton';

export default function Analytics() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('6months');
  const [activeTab, setActiveTab] = useState('overview');
  const { data, loading, loadAnalytics } = useAnalyticsData(timeRange);

  useEffect(() => {
    if (user) loadAnalytics();
  }, [user, loadAnalytics]);

  if (loading) {
    return <AnalyticsLoadingSkeleton />;
  }

  return (
    <div className="min-h-screen">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50">
        Skip to main content
      </a>
      <Navigation />
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs />
        <AnalyticsHeader
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          onRefresh={loadAnalytics}
          loading={loading}
        />
        <AnalyticsKPICards data={data} />
        <AnalyticsTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          data={data}
        />
      </main>
    </div>
  );
}
