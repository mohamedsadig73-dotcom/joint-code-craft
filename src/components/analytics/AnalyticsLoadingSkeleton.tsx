import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Card } from '@/components/ui/card';
import { CardSkeleton, ChartSkeleton } from '@/components/ui/TableSkeleton';

export function AnalyticsLoadingSkeleton() {
  return (
    <div className="min-h-screen">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50">
        Skip to main content
      </a>
      <Navigation />
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs />
        <div className="space-y-6">
          <CardSkeleton count={4} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-card border-border/50 p-6">
              <ChartSkeleton />
            </Card>
            <Card className="glass-card border-border/50 p-6">
              <ChartSkeleton />
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
