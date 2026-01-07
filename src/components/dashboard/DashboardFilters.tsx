import { Search, Filter, CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toGregorianDateLong } from '@/utils/dateUtils';
import { statusLabels } from '@/constants/statusLabels';
import { useLanguage } from '@/contexts/LanguageContext';
import { Profile } from '@/types/declarations';
import { useMemo } from 'react';

interface DashboardFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  senderFilter: string;
  onSenderFilterChange: (value: string) => void;
  dateFrom: Date | undefined;
  onDateFromChange: (date: Date | undefined) => void;
  dateTo: Date | undefined;
  onDateToChange: (date: Date | undefined) => void;
  profiles: Profile[];
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  filteredCount: number;
  totalCount: number;
}

export function DashboardFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  senderFilter,
  onSenderFilterChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  profiles,
  hasActiveFilters,
  onClearFilters,
  filteredCount,
  totalCount,
}: DashboardFiltersProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  return (
    <Card className="glass-card border-border/50 p-4 sticky top-20 z-40 backdrop-blur-md" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder={`${t('search')}...`}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="ps-10"
            aria-label={t('search')}
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-full md:w-48" aria-label={t('status')}>
            <Filter className="w-4 h-4 me-2" aria-hidden="true" />
            <SelectValue placeholder={t('status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allStatuses')}</SelectItem>
            {Object.entries(statusLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sender Filter */}
        <Select value={senderFilter} onValueChange={onSenderFilterChange}>
          <SelectTrigger className="w-full md:w-48" aria-label={t('sender')}>
            <SelectValue placeholder={t('allSendersFilter')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allSendersFilter')}</SelectItem>
            {profiles.map((profile) => (
              <SelectItem key={profile.id} value={profile.id}>
                {profile.username}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Filters */}
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className={cn("w-full md:w-[150px] justify-start", !dateFrom && "text-muted-foreground")}
              aria-label={t('from')}
            >
              <CalendarIcon className="me-2 h-4 w-4" aria-hidden="true" />
              {dateFrom ? toGregorianDateLong(dateFrom) : t('from')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateFrom} onSelect={onDateFromChange} initialFocus className="pointer-events-auto" />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className={cn("w-full md:w-[150px] justify-start", !dateTo && "text-muted-foreground")}
              aria-label={t('to')}
            >
              <CalendarIcon className="me-2 h-4 w-4" aria-hidden="true" />
              {dateTo ? toGregorianDateLong(dateTo) : t('to')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={onDateToChange} initialFocus className="pointer-events-auto" />
          </PopoverContent>
        </Popover>

        {hasActiveFilters && (
          <Button variant="ghost" onClick={onClearFilters} className="gap-2" aria-label={t('clearFilters')}>
            <X className="w-4 h-4" aria-hidden="true" />
            {t('clearFilters')}
          </Button>
        )}
      </div>

      {/* Results count */}
      <div className="mt-3 text-sm text-muted-foreground">
        {t('showing')} {filteredCount} {t('of')} {totalCount} {t('results')}
      </div>
    </Card>
  );
}
