import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StaggerContainer, StaggerItem } from '@/components/PageTransition';
import { FileText, Target, Clock, Zap, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { AnalyticsData } from '@/hooks/useAnalyticsData';

interface AnalyticsKPICardsProps {
  data: AnalyticsData;
}

function GrowthIndicator({ value }: { value: number }) {
  if (value > 0) {
    return (
      <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
        <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
        <span>+{value.toFixed(1)}%</span>
      </span>
    );
  }
  if (value < 0) {
    return (
      <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
        <ArrowDownRight className="w-4 h-4" aria-hidden="true" />
        <span>{value.toFixed(1)}%</span>
      </span>
    );
  }
  return (
    <span className="text-muted-foreground flex items-center gap-1">
      <Minus className="w-4 h-4" aria-hidden="true" />
      <span>0%</span>
    </span>
  );
}

export function AnalyticsKPICards({ data }: AnalyticsKPICardsProps) {
  const { t } = useLanguage();

  return (
    <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <StaggerItem>
        <Card className="glass-card border-border/50 p-5 hover-lift" role="region" aria-label={t('totalDeclarationsCard')}>
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <FileText className="w-5 h-5 text-primary" aria-hidden="true" />
            </div>
            <Badge variant="outline" className="text-xs">
              <GrowthIndicator value={data.monthlyGrowth} />
            </Badge>
          </div>
          <div className="text-3xl font-bold mb-1">{data.totalDeclarations}</div>
          <div className="text-sm text-muted-foreground">{t('totalDeclarationsCard')}</div>
        </Card>
      </StaggerItem>

      <StaggerItem>
        <Card className="glass-card border-border/50 p-5 hover-lift" role="region" aria-label={t('completionRateCard')}>
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-green-500/10">
              <Target className="w-5 h-5 text-green-600 dark:text-green-400" aria-hidden="true" />
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">{data.completionRate}%</div>
          <div className="text-sm text-muted-foreground">{t('completionRateCard')}</div>
        </Card>
      </StaggerItem>

      <StaggerItem>
        <Card className="glass-card border-border/50 p-5 hover-lift" role="region" aria-label={t('avgProcessingDaysCard')}>
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">{data.avgProcessingDays}</div>
          <div className="text-sm text-muted-foreground">{t('avgProcessingDaysCard')}</div>
        </Card>
      </StaggerItem>

      <StaggerItem>
        <Card className="glass-card border-border/50 p-5 hover-lift" role="region" aria-label={t('inProcessingCard')}>
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10">
              <Zap className="w-5 h-5 text-orange-600 dark:text-orange-400" aria-hidden="true" />
            </div>
            {data.overdueCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {data.overdueCount} {t('delayed')}
              </Badge>
            )}
          </div>
          <div className="text-3xl font-bold mb-1">{data.pendingCount}</div>
          <div className="text-sm text-muted-foreground">{t('inProcessingCard')}</div>
        </Card>
      </StaggerItem>
    </StaggerContainer>
  );
}
