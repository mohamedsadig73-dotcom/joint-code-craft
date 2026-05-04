import { ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

/**
 * UnifiedFilterBar — standardized filter row in WMS Pro style.
 *
 *   ┌────────────────────────────────────────────────────────────────┐
 *   │ [🔍 search...........]  [select1] [select2]  [↻ reset] [actions]│
 *   └────────────────────────────────────────────────────────────────┘
 *
 *   - search input with leading icon + clearable
 *   - flexible filter slots (any controlled <Select>, <DatePicker>, …)
 *   - active-filter pill summary
 *   - optional right-aligned actions (e.g. "+ Add", "Export")
 *
 * The bar manages NO state; pass controlled props from the parent page.
 */
export interface UnifiedFilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  /** Filter controls (Select, DatePicker, etc.) rendered inline. */
  filters?: ReactNode;
  /** Right-aligned action buttons (Add, Export, …). */
  actions?: ReactNode;
  /** Active filter chips shown below the bar (label/onRemove pairs). */
  activeChips?: Array<{ key: string; label: string; onRemove?: () => void }>;
  /** Reset everything (search + all filters). */
  onReset?: () => void;
  className?: string;
}

export function UnifiedFilterBar({
  search,
  onSearchChange,
  searchPlaceholder,
  filters,
  actions,
  activeChips,
  onReset,
  className,
}: UnifiedFilterBarProps) {
  const { t } = useLanguage();
  const hasActive = (activeChips && activeChips.length > 0) || !!search;

  return (
    <div className={cn('w-full', className)}>
      <div className="flex flex-col gap-3 rounded-lg border border-[hsl(var(--wms-border))] bg-[hsl(var(--wms-bg2))] p-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--wms-text3))]" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder || t('search') || 'بحث...'}
            className="ps-9 pe-9 h-9 bg-[hsl(var(--wms-bg3))] border-[hsl(var(--wms-border))] text-[hsl(var(--wms-text))] placeholder:text-[hsl(var(--wms-text3))]"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label={t('clear') || 'مسح'}
              className="absolute end-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full grid place-items-center text-[hsl(var(--wms-text3))] hover:bg-[hsl(var(--wms-bg4))] hover:text-[hsl(var(--wms-text))]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter slots */}
        {filters && (
          <div className="flex flex-wrap items-center gap-2">{filters}</div>
        )}

        {/* Reset */}
        {onReset && hasActive && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-9 text-[hsl(var(--wms-text3))] hover:text-[hsl(var(--wms-text))]"
          >
            <X className="me-1 h-3.5 w-3.5" />
            {t('reset') || 'تصفير'}
          </Button>
        )}

        {/* Right actions */}
        {actions && (
          <div className="flex items-center gap-2 sm:ms-auto">{actions}</div>
        )}
      </div>

      {/* Active chips */}
      {activeChips && activeChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2 px-1">
          {activeChips.map((chip) => (
            <Badge
              key={chip.key}
              variant="outline"
              className="gap-1 bg-[hsl(var(--wms-accent-soft))] border-[hsl(var(--wms-accent)_/_0.25)] text-[hsl(var(--wms-accent))] py-0.5"
            >
              {chip.label}
              {chip.onRemove && (
                <button
                  type="button"
                  onClick={chip.onRemove}
                  className="ms-0.5 rounded-full p-0.5 hover:bg-[hsl(var(--wms-accent)_/_0.2)]"
                  aria-label={`Remove ${chip.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default UnifiedFilterBar;
