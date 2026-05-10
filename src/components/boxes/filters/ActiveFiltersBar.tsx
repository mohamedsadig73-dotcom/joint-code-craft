import { X, Filter as FilterIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ReceiptsFiltersState } from '@/hooks/useReceiptsFilters';

interface Chip {
  key: keyof ReceiptsFiltersState;
  label: string;
  value: string;
}

interface Props {
  chips: Chip[];
  onRemove: (key: keyof ReceiptsFiltersState) => void;
  onClearAll: () => void;
}

export function ActiveFiltersBar({ chips, onRemove, onClearAll }: Props) {
  const { t } = useLanguage();
  if (chips.length === 0) return null;

  const display = (chip: Chip): string => {
    const v = chip.value;
    if (chip.key === 'destination') return t(`dest_${v}`);
    if (chip.key === 'status') return t(`boxStatus_${v}`);
    if (chip.key === 'packing') return t(v);
    if (chip.key === 'hasImage') return v === 'with' ? t('withImage') : t('withoutImage');
    return v;
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 py-1">
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <FilterIcon className="w-3 h-3" />
        {t('activeFilters')}:
      </span>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onRemove(chip.key)}
          className="group inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] text-foreground hover:bg-primary/20 transition-colors"
        >
          <span className="text-muted-foreground">{t(chip.label)}:</span>
          <span className="font-medium truncate max-w-[200px]">{display(chip)}</span>
          <X className="w-3 h-3 opacity-60 group-hover:opacity-100" />
        </button>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
      >
        <X className="w-3 h-3 me-1" />
        {t('clearAll')}
      </Button>
    </div>
  );
}