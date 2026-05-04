import { ReactNode } from 'react';
import { X, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

/**
 * WmsBulkActionsBar — sticky bar appearing when items are selected.
 * Shows selection count + bulk action buttons. Auto-hides when count=0.
 *
 *   ┌─────────────────────────────────────────────────────┐
 *   │ ☑ 5 محدد   [حذف] [تصدير] [أرشفة]            [✕]    │
 *   └─────────────────────────────────────────────────────┘
 */
export interface WmsBulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  /** Action buttons (Delete, Export, …) */
  actions: ReactNode;
  /** Optional total count to show "5 of 100" */
  totalCount?: number;
  /** Position: sticky-top (in-card) or fixed-bottom (page-level). */
  position?: 'sticky-top' | 'fixed-bottom';
  className?: string;
}

export function WmsBulkActionsBar({
  selectedCount,
  onClear,
  actions,
  totalCount,
  position = 'sticky-top',
  className,
}: WmsBulkActionsBarProps) {
  const { t } = useLanguage();
  if (selectedCount <= 0) return null;

  const positionClass =
    position === 'fixed-bottom'
      ? 'fixed bottom-4 inset-x-4 sm:inset-x-auto sm:start-1/2 sm:-translate-x-1/2 sm:max-w-2xl z-50 shadow-2xl'
      : 'sticky top-0 z-20';

  return (
    <div
      className={cn(
        positionClass,
        'flex items-center gap-3 rounded-lg border border-[hsl(var(--wms-accent)_/_0.4)]',
        'bg-[hsl(var(--wms-accent-soft))] backdrop-blur px-3 py-2 text-sm',
        'animate-in fade-in slide-in-from-top-2 duration-200',
        className,
      )}
      role="toolbar"
      aria-label={t('selection-toolbar') || 'شريط الإجراءات الجماعية'}
    >
      <CheckSquare className="h-4 w-4 text-[hsl(var(--wms-accent))] shrink-0" />
      <span className="font-semibold text-[hsl(var(--wms-accent))] shrink-0">
        {selectedCount}
        {totalCount != null && (
          <span className="text-[hsl(var(--wms-text3))] font-normal"> / {totalCount}</span>
        )}
      </span>
      <span className="text-[hsl(var(--wms-text2))] hidden sm:inline">
        {t('items-selected') || 'عنصر محدد'}
      </span>

      <div className="flex items-center gap-1.5 ms-auto">{actions}</div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onClear}
        className="h-7 w-7 shrink-0 text-[hsl(var(--wms-text3))] hover:text-[hsl(var(--wms-text))]"
        aria-label={t('clear-selection') || 'إلغاء التحديد'}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default WmsBulkActionsBar;
