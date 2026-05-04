import { ReactNode, useState } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter,
} from '@/components/ui/sheet';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

/**
 * Reusable filter bar with:
 *  - Search input (debounced caller-side)
 *  - Optional inline filter chips (desktop)
 *  - "More filters" sheet for advanced filters (mobile-first)
 *  - Clear-all + active filters count
 *
 * Caller controls all state — purely presentational.
 */
export interface UnifiedFilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  /** Inline content shown beside the search input on desktop (e.g. select chips). */
  inlineFilters?: ReactNode;
  /** Advanced filters rendered inside the sheet. */
  advancedFilters?: ReactNode;
  /** Number of active filters (excluding search). Drives the badge. */
  activeCount?: number;
  onClearAll?: () => void;
  className?: string;
}

export function UnifiedFilterBar({
  search,
  onSearchChange,
  searchPlaceholder,
  inlineFilters,
  advancedFilters,
  activeCount = 0,
  onClearAll,
  className,
}: UnifiedFilterBarProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <div className={cn('flex flex-col sm:flex-row gap-2 items-stretch sm:items-center', className)}>
      {/* Search */}
      <div className="relative flex-1 min-w-0">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder || t('search') || 'بحث...'}
          className="ps-9 pe-9 h-10"
        />
        {search && (
          <button
            type="button"
            aria-label={t('clear') || 'مسح'}
            onClick={() => onSearchChange('')}
            className="absolute end-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Inline filters (desktop only) */}
      {inlineFilters && (
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {inlineFilters}
        </div>
      )}

      {/* Advanced filters trigger */}
      {advancedFilters && (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 shrink-0 h-10">
              <SlidersHorizontal className="w-4 h-4" />
              <span>{t('filters') || 'فلاتر'}</span>
              {activeCount > 0 && (
                <Badge variant="secondary" className="ms-1 h-5 px-1.5 text-[10px]">
                  {activeCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
            <SheetHeader>
              <SheetTitle>{t('filters') || 'فلاتر'}</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {advancedFilters}
            </div>
            <SheetFooter className="flex-row gap-2">
              {onClearAll && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => { onClearAll(); }}
                  disabled={activeCount === 0 && !search}
                >
                  {t('clearAll') || 'مسح الكل'}
                </Button>
              )}
              <Button type="button" className="flex-1" onClick={() => setOpen(false)}>
                {t('apply') || 'تطبيق'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}

      {/* Quick clear (when active and no sheet) */}
      {!advancedFilters && (activeCount > 0 || search) && onClearAll && (
        <Button variant="ghost" size="sm" onClick={onClearAll} className="shrink-0 gap-1 h-10">
          <X className="w-3.5 h-3.5" />
          {t('clear') || 'مسح'}
        </Button>
      )}
    </div>
  );
}