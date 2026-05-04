import { cn } from '@/lib/utils';

/**
 * WMS Pro section divider — small uppercase label with bottom border.
 * Use inside StandardModal to group related fields.
 */
export function SectionDivider({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'text-[11px] font-semibold tracking-[1px] uppercase pt-3 pb-2 mb-3 border-b',
        'text-[hsl(var(--wms-text3))] border-[hsl(var(--wms-border))]',
        className,
      )}
    >
      {children}
    </div>
  );
}