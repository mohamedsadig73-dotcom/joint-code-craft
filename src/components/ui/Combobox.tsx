import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useLanguage } from '@/contexts/LanguageContext';

export interface ComboboxOption {
  value: string;
  label: string;
  hint?: string;
  group?: string;
}

interface Props {
  options: ComboboxOption[];
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  allowClear?: boolean;
  className?: string;
}

/** Normalize Arabic text (remove diacritics, alef variants) for search. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u064B-\u0652]/g, '') // tashkeel
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generic searchable Combobox with Arabic-aware normalization.
 * Replaces plain Select for any list >5 items.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  disabled,
  allowClear = true,
  className,
}: Props) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return options.slice(0, 300);
    const q = normalize(query);
    return options
      .filter((o) => {
        const l = normalize(o.label);
        const h = o.hint ? normalize(o.hint) : '';
        return l.includes(q) || h.includes(q);
      })
      .slice(0, 300);
  }, [options, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between font-normal h-10', className)}
        >
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              {selected.hint && (
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                  {selected.hint}
                </span>
              )}
              <span className="truncate">{selected.label}</span>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Search className="w-4 h-4" />
              {placeholder ?? t('selectOne')}
            </span>
          )}
          <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder ?? t('search')}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>{emptyText ?? t('noResults')}</CommandEmpty>
            <CommandGroup>
              {allowClear && value && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  className="text-muted-foreground italic"
                >
                  {t('clearSelection')}
                </CommandItem>
              )}
              {filtered.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.value}
                  onSelect={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className="gap-2"
                >
                  <Check
                    className={cn(
                      'h-4 w-4',
                      value === o.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {o.hint && (
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                      {o.hint}
                    </span>
                  )}
                  <span className="truncate">{o.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export { normalize as normalizeArabic };