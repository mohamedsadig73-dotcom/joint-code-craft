import { Card } from '@/components/ui/card';

export function TableSkeleton() {
  return (
    <Card className="glass-card border-border/50 p-6">
      <div className="space-y-4">
        {/* Header skeleton */}
        <div className="flex justify-between items-center">
          <div className="skeleton h-8 w-48 rounded"></div>
          <div className="skeleton h-10 w-32 rounded"></div>
        </div>
        
        {/* Table rows skeleton */}
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4 items-center py-4 border-b border-border/50">
            <div className="skeleton h-5 w-5 rounded"></div>
            <div className="skeleton h-4 w-32 rounded"></div>
            <div className="skeleton h-4 w-24 rounded"></div>
            <div className="skeleton h-4 w-40 rounded"></div>
            <div className="skeleton h-6 w-24 rounded-full"></div>
            <div className="skeleton h-4 w-28 rounded"></div>
            <div className="flex gap-2 ml-auto">
              <div className="skeleton h-8 w-8 rounded"></div>
              <div className="skeleton h-8 w-8 rounded"></div>
              <div className="skeleton h-8 w-8 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function CardSkeleton() {
  return (
    <Card className="glass-card border-border/50 p-6">
      <div className="space-y-4">
        <div className="skeleton h-6 w-32 rounded"></div>
        <div className="skeleton h-4 w-full rounded"></div>
        <div className="skeleton h-4 w-3/4 rounded"></div>
      </div>
    </Card>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="glass-card border-border/50 p-4">
          <div className="skeleton h-8 w-16 rounded mb-2"></div>
          <div className="skeleton h-4 w-24 rounded"></div>
        </Card>
      ))}
    </div>
  );
}
