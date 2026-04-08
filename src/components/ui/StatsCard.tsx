import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  bgColor?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatsCard({
  label,
  value,
  icon: Icon,
  color = 'text-primary',
  bgColor = 'bg-primary/10',
  size = 'md',
  className,
  trend,
}: StatsCardProps) {
  const sizeClasses = {
    sm: { padding: 'p-3 sm:p-4', icon: 'w-4 h-4', iconWrapper: 'w-9 h-9', value: 'text-lg sm:text-xl', label: 'text-[10px] sm:text-xs leading-tight' },
    md: { padding: 'p-4 sm:p-5', icon: 'w-4 h-4 sm:w-5 sm:h-5', iconWrapper: 'w-10 h-10', value: 'text-xl sm:text-2xl', label: 'text-[10px] sm:text-xs leading-tight' },
    lg: { padding: 'p-5 sm:p-6', icon: 'w-5 h-5 sm:w-6 sm:h-6', iconWrapper: 'w-12 h-12', value: 'text-2xl sm:text-3xl', label: 'text-xs sm:text-sm' },
  };

  const sizes = sizeClasses[size];

  return (
    <div className={cn(
      'rounded-xl border border-border/40 bg-card',
      'transition-colors duration-200 hover:bg-muted/20',
      sizes.padding, 
      className
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          'rounded-xl flex items-center justify-center shrink-0', 
          bgColor, 
          sizes.iconWrapper
        )}>
          <Icon className={cn(sizes.icon, color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn('font-bold tabular-nums tracking-tight leading-none', sizes.value)}>{value}</div>
          <div className={cn('text-muted-foreground truncate mt-1', sizes.label)} title={label}>{label}</div>
        </div>
        {trend && (
          <div className={cn(
            'text-xs font-semibold px-2 py-1 rounded-full',
            trend.isPositive ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
          )}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </div>
        )}
      </div>
    </div>
  );
}
