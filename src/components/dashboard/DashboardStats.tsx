import { memo } from 'react';
import { FileText, Clock, CheckCircle, Send, RotateCcw, Archive, FileEdit, Calendar } from 'lucide-react';
import { StatsCard } from '@/components/ui/StatsCard';
import { CardSkeleton } from '@/components/ui/TableSkeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { DeclarationStats } from '@/types/declarations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface DashboardStatsProps {
  stats: DeclarationStats;
  loading: boolean;
  selectedYear: number | 'all';
  onYearChange: (year: number | 'all') => void;
  availableYears: (number | 'all')[];
}

export const DashboardStats = memo(function DashboardStats({ 
  stats, 
  loading, 
  selectedYear, 
  onYearChange, 
  availableYears 
}: DashboardStatsProps) {
  const { t, language } = useLanguage();

  const yearLabel = selectedYear === 'all' 
    ? t('allYears')
    : selectedYear.toString();

  if (loading) {
    return <CardSkeleton count={7} />;
  }

  return (
    <div className="space-y-4">
      {/* Year Filter Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm px-3 py-1.5 bg-primary/5 border-primary/20">
            <Calendar className="w-4 h-4 me-2" />
            {t('statistics')}: {yearLabel}
          </Badge>
        </div>
        
        <Select 
          value={selectedYear.toString()} 
          onValueChange={(value) => onYearChange(value === 'all' ? 'all' : parseInt(value))}
        >
          <SelectTrigger className="w-[160px]" aria-label={t('selectYear')}>
            <Calendar className="w-4 h-4 me-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map((year) => (
              <SelectItem key={year.toString()} value={year.toString()}>
                {year === 'all' ? t('allYears') : year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4 animate-fade-in">
        <StatsCard
          label={t('totalDeclarations')}
          value={stats.total}
          icon={FileText}
          color="text-primary"
          bgColor="bg-primary/10"
        />
        <StatsCard
          label={t('draft')}
          value={stats.draft}
          icon={FileEdit}
          color="text-muted-foreground"
          bgColor="bg-muted/10"
        />
        <StatsCard
          label={t('pendingSignature')}
          value={stats.pending_warehouse_signature}
          icon={Clock}
          color="text-yellow-600 dark:text-yellow-400"
          bgColor="bg-yellow-500/10"
        />
        <StatsCard
          label={t('signed')}
          value={stats.warehouse_signed}
          icon={CheckCircle}
          color="text-blue-600 dark:text-blue-400"
          bgColor="bg-blue-500/10"
        />
        <StatsCard
          label={t('sentToOffice')}
          value={stats.sent_to_admin_office}
          icon={Send}
          color="text-purple-600 dark:text-purple-400"
          bgColor="bg-purple-500/10"
        />
        <StatsCard
          label={t('returnedForModification')}
          value={stats.returned_to_warehouse}
          icon={RotateCcw}
          color="text-orange-600 dark:text-orange-400"
          bgColor="bg-orange-500/10"
        />
        <StatsCard
          label={t('archived')}
          value={stats.archived}
          icon={Archive}
          color="text-green-600 dark:text-green-400"
          bgColor="bg-green-500/10"
        />
      </div>
    </div>
  );
});