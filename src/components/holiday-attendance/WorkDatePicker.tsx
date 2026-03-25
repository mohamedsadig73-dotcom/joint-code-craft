import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkDatePickerProps {
  value: string;
  onChange: (value: string) => void;
}

function formatDD(d: Date): string {
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function parseWorkDate(val: string): { start?: Date; end?: Date; isRange: boolean } {
  if (!val) return { isRange: false };

  // Range: "17-23/03/2026"
  const rangeMatch = val.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})\s*[/]\s*(\d{1,2})\s*[/]\s*(\d{4})/);
  if (rangeMatch) {
    const [, startDay, endDay, month, year] = rangeMatch;
    return {
      start: new Date(parseInt(year), parseInt(month) - 1, parseInt(startDay)),
      end: new Date(parseInt(year), parseInt(month) - 1, parseInt(endDay)),
      isRange: true,
    };
  }

  // Single: "17/03/2026"
  const singleMatch = val.match(/(\d{1,2})\s*[/]\s*(\d{1,2})\s*[/]\s*(\d{4})/);
  if (singleMatch) {
    const [, day, month, year] = singleMatch;
    return {
      start: new Date(parseInt(year), parseInt(month) - 1, parseInt(day)),
      isRange: false,
    };
  }

  return { isRange: false };
}

export function WorkDatePicker({ value, onChange }: WorkDatePickerProps) {
  const parsed = parseWorkDate(value);
  const [isRange, setIsRange] = useState(parsed.isRange);
  const [startDate, setStartDate] = useState<Date | undefined>(parsed.start);
  const [endDate, setEndDate] = useState<Date | undefined>(parsed.end);
  const [open, setOpen] = useState(false);

  const handleSingleSelect = (date: Date | undefined) => {
    setStartDate(date);
    setEndDate(undefined);
    if (date) {
      onChange(formatDD(date));
      setOpen(false);
    }
  };

  const handleRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (!range) return;
    setStartDate(range.from);
    setEndDate(range.to);
    if (range.from && range.to) {
      const startDay = range.from.getDate().toString().padStart(2, '0');
      const endDay = range.to.getDate().toString().padStart(2, '0');
      const month = (range.from.getMonth() + 1).toString().padStart(2, '0');
      const year = range.from.getFullYear();
      onChange(`${startDay}-${endDay}/${month}/${year}`);
      setOpen(false);
    } else if (range.from) {
      onChange(formatDD(range.from));
    }
  };

  const toggleMode = (rangeMode: boolean) => {
    setIsRange(rangeMode);
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const displayValue = value || 'اختر التاريخ';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-44 justify-start text-start font-normal',
            !value && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="w-4 h-4 me-2 shrink-0" />
          <span className="truncate text-sm">{displayValue}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex items-center gap-2 p-3 border-b">
          <Switch
            id="range-mode"
            checked={isRange}
            onCheckedChange={toggleMode}
          />
          <Label htmlFor="range-mode" className="text-sm cursor-pointer">
            {isRange ? 'نطاق تواريخ (من - إلى)' : 'تاريخ واحد'}
          </Label>
        </div>
        {isRange ? (
          <Calendar
            mode="range"
            selected={startDate && endDate ? { from: startDate, to: endDate } : startDate ? { from: startDate, to: undefined } : undefined}
            onSelect={handleRangeSelect as any}
            numberOfMonths={1}
            className={cn('p-3 pointer-events-auto')}
          />
        ) : (
          <Calendar
            mode="single"
            selected={startDate}
            onSelect={handleSingleSelect}
            className={cn('p-3 pointer-events-auto')}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
