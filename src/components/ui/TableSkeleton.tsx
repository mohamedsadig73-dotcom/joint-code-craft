import { Skeleton } from '@/components/ui/skeleton';
import { TableRow, TableCell } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableSkeleton({ rows = 5, columns = 6, className }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow 
          key={rowIndex} 
          className={cn(
            "border-border/30 hover:bg-transparent",
            className
          )}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <TableCell key={colIndex} className="py-4">
              <Skeleton 
                className={cn(
                  "h-4 rounded-md",
                  colIndex === 0 && "w-8",
                  colIndex === 1 && "w-32",
                  colIndex === columns - 1 && "w-20 ms-auto",
                  colIndex > 1 && colIndex < columns - 1 && "w-24"
                )}
                style={{ 
                  animationDelay: `${(rowIndex * columns + colIndex) * 30}ms`
                }} 
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

interface CardSkeletonProps {
  count?: number;
  className?: string;
}

export function CardSkeleton({ count = 4, className }: CardSkeletonProps) {
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <Card 
          key={index} 
          className="p-5 glass-card border-border/50 overflow-hidden relative"
        >
          {/* Shimmer overlay */}
          <div 
            className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-foreground/5 to-transparent"
            style={{ animationDelay: `${index * 150}ms` }}
          />
          
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <Skeleton className="h-4 w-4 rounded-full" />
          </div>
          <Skeleton className="h-8 w-20 mb-2 rounded-md" />
          <Skeleton className="h-3 w-28 rounded-md" />
        </Card>
      ))}
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("h-[280px] flex items-end justify-around gap-3 p-4 relative", className)}>
      {/* Grid lines */}
      <div className="absolute inset-4 flex flex-col justify-between pointer-events-none">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-t border-border/20" />
        ))}
      </div>
      
      {Array.from({ length: 8 }).map((_, index) => (
        <Skeleton 
          key={index} 
          className="w-10 rounded-t-lg relative z-10"
          style={{ 
            height: `${Math.random() * 50 + 30}%`,
            animationDelay: `${index * 80}ms`
          }} 
        />
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div 
          key={index}
          className="flex items-center gap-4 p-4 rounded-xl bg-muted/20 border border-border/30 relative overflow-hidden"
        >
          {/* Shimmer */}
          <div 
            className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-foreground/5 to-transparent"
            style={{ animationDelay: `${index * 100}ms` }}
          />
          
          <Skeleton className="w-11 h-11 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 rounded-md" />
            <Skeleton className="h-3 w-1/2 rounded-md" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div 
            key={index} 
            className="space-y-2"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20 rounded-md" />
        <Skeleton className="h-28 w-full rounded-lg" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
    </div>
  );
}

export function PageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-52 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>
      
      {/* Stats */}
      <CardSkeleton count={4} />
      
      {/* Content Card */}
      <Card className="p-6 glass-card border-border/50 relative overflow-hidden">
        {/* Shimmer */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite] bg-gradient-to-r from-transparent via-foreground/5 to-transparent" />
        
        <Skeleton className="h-6 w-36 mb-5 rounded-md" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton 
              key={index} 
              className="h-14 w-full rounded-lg"
              style={{ animationDelay: `${index * 80}ms` }}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

// Stats Card Skeleton - matches StatsCard component structure
export function StatsCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <Card 
          key={index} 
          className="glass-card border-border/50 p-4 relative overflow-hidden group"
        >
          <div 
            className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-foreground/5 to-transparent"
            style={{ animationDelay: `${index * 100}ms` }}
          />
          
          <div className="flex items-start justify-between">
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
          <div className="mt-3 space-y-1">
            <Skeleton className="h-7 w-12 rounded-md" />
            <Skeleton className="h-3 w-20 rounded-sm" />
          </div>
        </Card>
      ))}
    </div>
  );
}

// Mobile Card Skeleton
export function MobileCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <Card 
          key={index}
          className="glass-card border-border/50 p-4 relative overflow-hidden"
        >
          <div 
            className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-foreground/5 to-transparent"
            style={{ animationDelay: `${index * 100}ms` }}
          />
          
          <div className="flex items-start justify-between mb-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-3 w-32 rounded-sm" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-3 w-full rounded-sm" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
