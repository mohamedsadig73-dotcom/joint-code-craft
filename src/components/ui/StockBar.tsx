import { cn } from '@/lib/utils';

interface StockBarProps {
  qty: number;
  min?: number;
  max?: number;
  className?: string;
}

/**
 * Horizontal stock-level indicator inspired by WMS Pro.
 * Red when zero, yellow when ≤ min, green otherwise.
 */
export function StockBar({ qty, min = 0, max = 0, className }: StockBarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((qty / max) * 100))) : qty > 0 ? 100 : 0;
  const color =
    qty === 0 ? 'hsl(var(--wms-red))'
    : min > 0 && qty <= min ? 'hsl(var(--wms-yellow))'
    : 'hsl(var(--wms-green))';
  return (
    <div className={cn('h-1 w-full rounded-full overflow-hidden bg-[hsl(var(--wms-bg4))]', className)}>
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}