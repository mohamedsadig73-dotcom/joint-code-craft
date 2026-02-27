import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { BarChart3, CalendarIcon, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ReportsHeaderProps {
  selectedYear: number;
  onYearChange: (year: string) => void;
  availableYears: number[];
  dateFrom: Date;
  dateTo: Date;
  onDateFromChange: (date: Date) => void;
  onDateToChange: (date: Date) => void;
  onRefresh: () => void;
  loading: boolean;
  totalDeclarations: number;
}

export const ReportsHeader = memo(function ReportsHeader({
  selectedYear, onYearChange, availableYears,
  dateFrom, dateTo, onDateFromChange, onDateToChange,
  onRefresh, loading, totalDeclarations,
}: ReportsHeaderProps) {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';

  return (
    <div className="space-y-4 mb-6">
      {/* Title Row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <BarChart3 className="w-6 h-6 text-primary" aria-hidden="true" />
            </div>
            <h1 className="text-xl md:text-3xl font-bold">{t('reportsTitle')}</h1>
          </div>
          <p className="text-muted-foreground text-sm">{t('reportsSubtitle')}</p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedYear.toString()} onValueChange={onYearChange}>
            <SelectTrigger className="w-[120px]" aria-label={isAr ? 'اختر السنة' : 'Select year'}>
              <CalendarIcon className="me-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal text-xs")}>
                <CalendarIcon className="me-1 h-3 w-3" />
                {format(dateFrom, "dd/MM")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={(d) => d && onDateFromChange(d)} initialFocus className="pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground self-center text-xs">—</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal text-xs")}>
                <CalendarIcon className="me-1 h-3 w-3" />
                {format(dateTo, "dd/MM")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={(d) => d && onDateToChange(d)} initialFocus className="pointer-events-auto" />
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading} aria-label={t('refresh')}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Year indicator */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-sm font-medium">
          <CalendarIcon className="w-3.5 h-3.5 me-1.5" />
          {isAr ? `بيانات ${selectedYear}` : `Data for ${selectedYear}`}
        </Badge>
        <Badge variant="secondary" className="text-sm">
          {totalDeclarations} {isAr ? 'إقرار' : 'declarations'}
        </Badge>
      </div>
    </div>
  );
});
