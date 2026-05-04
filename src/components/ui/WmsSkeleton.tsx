import { TableRow, TableCell } from '@/components/ui/table';
import { cn } from '@/lib/utils';

/**
 * WmsSkeleton — unified loading placeholders matching WMS Pro tokens.
 * Use these instead of bare <Skeleton /> or ad-hoc <div className="bg-muted animate-pulse"/>.
 */

const PULSE = 'animate-pulse rounded bg-[hsl(var(--wms-bg4))]';

export function WmsSkeletonLine({
  width = 'w-full',
  height = 'h-4',
  className,
}: {
  width?: string;
  height?: string;
  className?: string;
}) {
  return <div className={cn(PULSE, width, height, className)} />;
}

/* ------ Card list (mobile / dashboard widgets) ------ */
export function WmsSkeletonCardList({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-[hsl(var(--wms-border))] bg-[hsl(var(--wms-bg2))] p-4 space-y-2"
        >
          <div className="flex items-center justify-between">
            <WmsSkeletonLine width="w-32" height="h-4" />
            <WmsSkeletonLine width="w-16" height="h-5" />
          </div>
          <WmsSkeletonLine width="w-2/3" height="h-3" />
          <WmsSkeletonLine width="w-1/2" height="h-3" />
        </div>
      ))}
    </div>
  );
}

/* ------ Stat tiles (dashboard KPIs) ------ */
export function WmsSkeletonStats({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-4 gap-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-[hsl(var(--wms-border))] bg-[hsl(var(--wms-bg2))] p-4 space-y-2"
        >
          <WmsSkeletonLine width="w-20" height="h-3" />
          <WmsSkeletonLine width="w-16" height="h-7" />
        </div>
      ))}
    </div>
  );
}

/* ------ Table rows (drop into <TableBody>) ------ */
export function WmsSkeletonTableRows({
  rows = 5,
  columns = 6,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <TableRow key={r} className="border-[hsl(var(--wms-border))] hover:bg-transparent">
          {Array.from({ length: columns }).map((_, c) => (
            <TableCell key={c} className="py-3">
              <WmsSkeletonLine
                height="h-3.5"
                width={c === 0 ? 'w-8' : c === 1 ? 'w-32' : c === columns - 1 ? 'w-20 ms-auto' : 'w-24'}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/* ------ Form fields skeleton (inside dialogs) ------ */
export function WmsSkeletonForm({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <WmsSkeletonLine width="w-24" height="h-3" />
          <WmsSkeletonLine width="w-full" height="h-9" />
        </div>
      ))}
    </div>
  );
}

export default WmsSkeletonLine;
