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
}

export function StatsCard({
  label,
  value,
  icon: Icon,
  color = 'text-primary',
  bgColor = 'bg-primary/10',
  size = 'md',
  className,
}: StatsCardProps) {
  const sizeClasses = {
    sm: { padding: 'p-3', icon: 'w-4 h-4', iconWrapper: 'p-1.5', value: 'text-xl', label: 'text-xs' },
    md: { padding: 'p-4', icon: 'w-5 h-5', iconWrapper: 'p-2', value: 'text-2xl', label: 'text-xs' },
    lg: { padding: 'p-6', icon: 'w-6 h-6', iconWrapper: 'p-3', value: 'text-3xl', label: 'text-sm' },
  };

  const sizes = sizeClasses[size];

  return (
    <Card className={cn('glass-card border-border/50', sizes.padding, className)}>
      <div className="flex items-center gap-3">
        <div className={cn('rounded-lg', bgColor, sizes.iconWrapper)}>
          <Icon className={cn(sizes.icon, color)} />
        </div>
        <div>
          <div className={cn('font-bold', sizes.value)}>{value}</div>
          <div className={cn('text-muted-foreground', sizes.label)}>{label}</div>
        </div>
      </div>
    </Card>
  );
}
