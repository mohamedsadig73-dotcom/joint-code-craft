import { memo } from 'react';
import { FileText, Clock, CheckCircle, Send, RotateCcw, Archive, FileEdit } from 'lucide-react';
import { StatsCard } from '@/components/ui/StatsCard';
import { CardSkeleton } from '@/components/ui/TableSkeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { DeclarationStats } from '@/types/declarations';

interface DashboardStatsProps {
  stats: DeclarationStats;
  loading: boolean;
}

export const DashboardStats = memo(function DashboardStats({ stats, loading }: DashboardStatsProps) {
  const { t } = useLanguage();

  if (loading) {
    return <CardSkeleton count={7} />;
  }

  return (
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
  );
});
