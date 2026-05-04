import { ReactNode } from 'react';
import { LucideIcon, Inbox, Search, Trash2, Users, Wrench, FileText, Box, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * WmsEmptyState — unified empty/null state in WMS Pro style.
 * Flat, minimal, uses --wms-* tokens. Slimmer than legacy EmptyState
 * (no decorative pulsing rings) — fits inside cards, tabs, table cells.
 */
export type WmsEmptyVariant =
  | 'default' | 'search' | 'trash' | 'users'
  | 'maintenance' | 'declarations' | 'inventory' | 'warning';

const VARIANT_ICONS: Record<WmsEmptyVariant, LucideIcon> = {
  default: Inbox,
  search: Search,
  trash: Trash2,
  users: Users,
  maintenance: Wrench,
  declarations: FileText,
  inventory: Box,
  warning: AlertTriangle,
};

const VARIANT_TONE: Record<WmsEmptyVariant, string> = {
  default: 'text-[hsl(var(--wms-text3))]',
  search: 'text-[hsl(var(--wms-blue))]',
  trash: 'text-[hsl(var(--wms-text3))]',
  users: 'text-[hsl(var(--wms-blue))]',
  maintenance: 'text-[hsl(var(--wms-amber))]',
  declarations: 'text-[hsl(var(--wms-accent))]',
  inventory: 'text-[hsl(var(--wms-accent))]',
  warning: 'text-[hsl(var(--wms-amber))]',
};

export interface WmsEmptyStateProps {
  variant?: WmsEmptyVariant;
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Render extra slot below action (link, secondary button…) */
  extra?: ReactNode;
  /** Compact padding, for use inside small containers */
  compact?: boolean;
  className?: string;
}

export function WmsEmptyState({
  variant = 'default',
  icon,
  title,
  description,
  actionLabel,
  onAction,
  extra,
  compact = false,
  className,
}: WmsEmptyStateProps) {
  const Icon = icon || VARIANT_ICONS[variant];
  const tone = VARIANT_TONE[variant];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-6 px-3' : 'py-12 px-4',
        className,
      )}
    >
      <div
        className={cn(
          'rounded-full grid place-items-center mb-3',
          'bg-[hsl(var(--wms-bg3))] border border-[hsl(var(--wms-border))]',
          compact ? 'h-10 w-10' : 'h-14 w-14',
        )}
      >
        <Icon className={cn(compact ? 'h-5 w-5' : 'h-7 w-7', tone)} />
      </div>

      <h3 className={cn(
        'font-semibold text-[hsl(var(--wms-text))]',
        compact ? 'text-sm' : 'text-base',
      )}>
        {title}
      </h3>

      {description && (
        <p className={cn(
          'text-[hsl(var(--wms-text3))] max-w-md mt-1',
          compact ? 'text-xs' : 'text-sm',
        )}>
          {description}
        </p>
      )}

      {actionLabel && onAction && (
        <Button
          type="button"
          onClick={onAction}
          size={compact ? 'sm' : 'default'}
          className="mt-4"
        >
          {actionLabel}
        </Button>
      )}

      {extra && <div className="mt-3">{extra}</div>}
    </div>
  );
}

export default WmsEmptyState;
