import { Skeleton } from '@/components/ui/skeleton';
import { TableRow, TableCell } from '@/components/ui/table';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 6 }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex} className="animate-pulse">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton 
                className="h-4 w-full" 
                style={{ 
                  animationDelay: `${(rowIndex * columns + colIndex) * 50}ms`,
                  width: colIndex === 0 ? '80%' : colIndex === columns - 1 ? '60%' : '70%'
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
}

export function CardSkeleton({ count = 4 }: CardSkeletonProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div 
          key={index} 
          className="p-4 rounded-lg border border-border/50 bg-card animate-pulse"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="h-[280px] flex items-end justify-around gap-2 p-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <Skeleton 
          key={index} 
          className="w-8 rounded-t-lg"
          style={{ 
            height: `${Math.random() * 60 + 40}%`,
            animationDelay: `${index * 100}ms`
          }} 
        />
      ))}
    </div>
  );
}
