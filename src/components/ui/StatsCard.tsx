import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
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
    sm: { padding: 'p-2.5 sm:p-4', icon: 'w-4 h-4', iconWrapper: 'p-1.5 sm:p-2', value: 'text-lg sm:text-2xl', label: 'text-[10px] sm:text-xs leading-tight' },
    md: { padding: 'p-3 sm:p-5', icon: 'w-4 h-4 sm:w-5 sm:h-5', iconWrapper: 'p-2 sm:p-2.5', value: 'text-xl sm:text-3xl', label: 'text-[10px] sm:text-sm leading-tight' },
    lg: { padding: 'p-4 sm:p-6', icon: 'w-5 h-5 sm:w-6 sm:h-6', iconWrapper: 'p-2.5 sm:p-3', value: 'text-2xl sm:text-4xl', label: 'text-xs sm:text-sm' },
  };

  const sizes = sizeClasses[size];

  return (
    <Card className={cn(
      'glass-card border-border/50 group hover:border-secondary/30 transition-all duration-300',
      sizes.padding, 
      className
    )}>
      <div className="flex items-center gap-2 sm:gap-4">
        <div className={cn(
          'rounded-lg sm:rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg flex-shrink-0', 
          bgColor, 
          sizes.iconWrapper
        )}>
          <Icon className={cn(sizes.icon, color, 'transition-transform duration-300')} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn('font-bold tabular-nums tracking-tight leading-none', sizes.value)}>{value}</div>
          <div className={cn('text-muted-foreground truncate mt-0.5', sizes.label)} title={label}>{label}</div>
        </div>
        {trend && (
          <div className={cn(
            'text-xs font-semibold px-2 py-1 rounded-full',
            trend.isPositive ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'
          )}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </div>
        )}
      </div>
    </Card>
  );
}
