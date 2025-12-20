import { motion } from 'framer-motion';
import { FileText, AlertCircle, CheckCircle, Archive } from 'lucide-react';
import { StatsCard } from '@/components/ui/StatsCard';
import { CardSkeleton } from '@/components/ui/TableSkeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { DeclarationStats } from '@/types/declarations';

interface DashboardStatsProps {
  stats: DeclarationStats;
  loading: boolean;
}

export function DashboardStats({ stats, loading }: DashboardStatsProps) {
  const { t } = useLanguage();

  if (loading) {
    return <CardSkeleton count={4} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
    >
      <StatsCard
        label={t('totalDeclarations')}
        value={stats.total}
        icon={FileText}
        color="text-primary"
        bgColor="bg-primary/10"
      />
      <StatsCard
        label={t('pendingWarehouseSignature')}
        value={stats.pending_warehouse_signature}
        icon={AlertCircle}
        color="text-yellow-600 dark:text-yellow-400"
        bgColor="bg-yellow-500/10"
      />
      <StatsCard
        label={t('warehouseSigned')}
        value={stats.warehouse_signed}
        icon={CheckCircle}
        color="text-blue-600 dark:text-blue-400"
        bgColor="bg-blue-500/10"
      />
      <StatsCard
        label={t('archived')}
        value={stats.archived}
        icon={Archive}
        color="text-green-600 dark:text-green-400"
        bgColor="bg-green-500/10"
      />
    </motion.div>
  );
}
