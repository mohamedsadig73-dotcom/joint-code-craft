import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ItemMaster } from '@/hooks/useItemsMaster';

interface Props {
  items: ItemMaster[];
  value: string | null;
  onSelect: (item: ItemMaster) => void;
  onCreateNew?: (partNo: string) => void;
  disabled?: boolean;
}

export function ItemPickerCombobox({ items, value, onSelect, onCreateNew, disabled }: Props) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = useMemo(() => items.find((i) => i.id === value), [items, value]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items.slice(0, 50);
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) =>
        i.part_no.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q)
    ).slice(0, 100);
  }, [items, query]);

  const exactMatchExists = useMemo(
    () => items.some((i) => i.part_no.trim().toLowerCase() === query.trim().toLowerCase()),
    [items, query]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal h-10"
        >
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{selected.part_no}</span>
              <span className="truncate text-muted-foreground">{selected.description}</span>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Search className="w-4 h-4" />
              {t('searchOrPickItem')}
            </span>
          )}
          <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t('searchPartNoOrDesc')}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              <div className="py-3 text-sm text-muted-foreground">{t('noItemsFound')}</div>
            </CommandEmpty>
            <CommandGroup>
              {filtered.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  onSelect={() => {
                    onSelect(item);
                    setOpen(false);
                    setQuery('');
                  }}
                  className="flex items-center gap-2"
                >
                  <Check className={cn('h-4 w-4', value === item.id ? 'opacity-100' : 'opacity-0')} />
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded shrink-0">{item.part_no}</span>
                  <span className="truncate text-sm">{item.description}</span>
                  {!item.is_active && (
                    <span className="ms-auto text-[10px] text-muted-foreground">{t('inactive')}</span>
                  )}
                </CommandItem>
              ))}
              {onCreateNew && query.trim() && !exactMatchExists && (
                <CommandItem
                  value={`__create_${query}`}
                  onSelect={() => {
                    onCreateNew(query.trim());
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 text-primary border-t"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">{t('createItem')}: </span>
                  <span className="font-mono text-xs">"{query.trim()}"</span>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}