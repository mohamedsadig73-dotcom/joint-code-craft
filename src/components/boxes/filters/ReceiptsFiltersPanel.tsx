import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { SlidersHorizontal, ChevronDown, X, Check, Calendar as CalIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { BOX_DESTINATIONS, BOX_STATUSES, PACKING_TYPES } from '@/utils/boxNumberValidation';
import type { ReceiptsFiltersState } from '@/hooks/useReceiptsFilters';
import { FilterPresetsMenu } from './FilterPresetsMenu';
import type { FilterPreset } from '@/hooks/useReceiptsFilters';

interface Props {
  filters: ReceiptsFiltersState;
  setField: <K extends keyof ReceiptsFiltersState>(key: K, value: ReceiptsFiltersState[K]) => void;
  resetAll: () => void;
  setDateRange: (preset: 'today' | '7d' | 'month' | 'year') => void;
  suppliers: string[];
  invoiceNumbers: string[];
  boxNumbers: string[];
  activeCount: number;
  presets: FilterPreset[];
  savePreset: (name: string) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
}

export function ReceiptsFiltersPanel({
  filters, setField, resetAll, setDateRange,
  suppliers, invoiceNumbers, boxNumbers, activeCount,
  presets, savePreset, loadPreset, deletePreset,
}: Props) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-1.5">
          <SlidersHorizontal className="w-4 h-4" />
          <span>{t('filters')}</span>
          {activeCount > 0 && (
            <span className="ms-1 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold tabular-nums">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-start flex items-center justify-between">
            <span>{t('filters')}</span>
            {activeCount > 0 && (
              <Button variant="ghost" size="sm" onClick={resetAll} className="h-7 text-xs">
                <X className="w-3 h-3 me-1" />
                {t('clearAll')}
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-3 pb-6">
          {/* Presets */}
          <FilterPresetsMenu
            presets={presets}
            onSave={savePreset}
            onLoad={(id) => { loadPreset(id); setOpen(false); }}
            onDelete={deletePreset}
            canSave={activeCount > 0}
          />

          {/* Section 1: Shipment classification */}
          <FilterSection title={t('shipmentClassification')} defaultOpen>
            <div>
              <Label className="text-xs">{t('destination')}</Label>
              <Select value={filters.destination} onValueChange={(v) => setField('destination', v as ReceiptsFiltersState['destination'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all')}</SelectItem>
                  {BOX_DESTINATIONS.map((d) => <SelectItem key={d} value={d}>{t(`dest_${d}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{t('status')}</Label>
              <Select value={filters.status} onValueChange={(v) => setField('status', v as ReceiptsFiltersState['status'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all')}</SelectItem>
                  {BOX_STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`boxStatus_${s}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{t('packingType')}</Label>
              <Select value={filters.packing} onValueChange={(v) => setField('packing', v as ReceiptsFiltersState['packing'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all')}</SelectItem>
                  {PACKING_TYPES.map((p) => <SelectItem key={p} value={p}>{t(p)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </FilterSection>

          {/* Section 2: Company & Invoice */}
          <FilterSection title={t('companyAndInvoice')} defaultOpen>
            <ComboField
              label={t('supplier')}
              value={filters.supplier}
              options={suppliers}
              onChange={(v) => setField('supplier', v)}
              placeholder={t('all')}
            />
            <ComboField
              label={t('invoiceNumber')}
              value={filters.invoiceNumber}
              options={invoiceNumbers}
              onChange={(v) => setField('invoiceNumber', v)}
              placeholder={t('all')}
            />
            <ComboField
              label={t('boxNo')}
              value={filters.boxNo}
              options={boxNumbers}
              onChange={(v) => setField('boxNo', v)}
              placeholder={t('all')}
            />
          </FilterSection>

          {/* Section 3: Date & Quantity */}
          <FilterSection title={t('dateAndQuantity')}>
            <div className="flex gap-1 flex-wrap">
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setDateRange('today')}>{t('today')}</Button>
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setDateRange('7d')}>{t('last7Days')}</Button>
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setDateRange('month')}>{t('thisMonth')}</Button>
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setDateRange('year')}>{t('thisYear')}</Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">{t('dateFrom')}</Label>
                <Input type="date" value={filters.dateFrom} onChange={(e) => setField('dateFrom', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">{t('dateTo')}</Label>
                <Input type="date" value={filters.dateTo} onChange={(e) => setField('dateTo', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">{t('qtyMin')}</Label>
                <Input type="number" min="0" value={filters.qtyMin} onChange={(e) => setField('qtyMin', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">{t('qtyMax')}</Label>
                <Input type="number" min="0" value={filters.qtyMax} onChange={(e) => setField('qtyMax', e.target.value)} />
              </div>
            </div>
          </FilterSection>

          {/* Section 4: Other */}
          <FilterSection title={t('other')}>
            <div>
              <Label className="text-xs">{t('image')}</Label>
              <ToggleGroup
                type="single"
                value={filters.hasImage}
                onValueChange={(v) => v && setField('hasImage', v as ReceiptsFiltersState['hasImage'])}
                className="justify-start"
              >
                <ToggleGroupItem value="all" className="h-9 text-xs">{t('all')}</ToggleGroupItem>
                <ToggleGroupItem value="with" className="h-9 text-xs">{t('withImage')}</ToggleGroupItem>
                <ToggleGroupItem value="without" className="h-9 text-xs">{t('withoutImage')}</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </FilterSection>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={resetAll}>{t('reset')}</Button>
            <Button className="flex-1" onClick={() => setOpen(false)}>{t('apply')}</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FilterSection({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="rounded-md border border-border/60">
      <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium hover:bg-accent/40 rounded-md">
        <span>{title}</span>
        <ChevronDown className="w-4 h-4 transition-transform data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3 pt-1 space-y-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function ComboField({ label, value, options, onChange, placeholder }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void; placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
            <span className={value ? '' : 'text-muted-foreground'}>{value || placeholder}</span>
            <ChevronDown className="w-4 h-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
          <Command>
            <CommandInput placeholder={placeholder} />
            <CommandList>
              <CommandEmpty>—</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="__all__"
                  onSelect={() => { onChange(''); setOpen(false); }}
                >
                  <Check className={`w-4 h-4 me-2 ${value === '' ? 'opacity-100' : 'opacity-0'}`} />
                  {placeholder}
                </CommandItem>
                {options.map((opt) => (
                  <CommandItem
                    key={opt}
                    value={opt}
                    onSelect={() => { onChange(opt); setOpen(false); }}
                  >
                    <Check className={`w-4 h-4 me-2 ${value === opt ? 'opacity-100' : 'opacity-0'}`} />
                    <span className="truncate">{opt}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}