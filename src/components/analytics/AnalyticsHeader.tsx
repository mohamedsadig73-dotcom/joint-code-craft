import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, Calendar, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface AnalyticsHeaderProps {
  timeRange: string;
  onTimeRangeChange: (value: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

export function AnalyticsHeader({ timeRange, onTimeRangeChange, onRefresh, loading }: AnalyticsHeaderProps) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-primary/10">
            <Activity className="w-6 h-6 text-primary" aria-hidden="true" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold gradient-text">
            {t('analyticsTitle')}
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">
          {t('analyticsSubtitle')}
        </p>
      </div>
      <div className="flex gap-3">
        <Select value={timeRange} onValueChange={onTimeRangeChange}>
          <SelectTrigger className="w-[140px]" aria-label={t('selectTimeRange')}>
            <Calendar className="w-4 h-4 me-2" aria-hidden="true" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1month">{t('oneMonth')}</SelectItem>
            <SelectItem value="3months">{t('threeMonths')}</SelectItem>
            <SelectItem value="6months">{t('sixMonths')}</SelectItem>
            <SelectItem value="1year">{t('oneYear')}</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={onRefresh} aria-label={t('refreshData')}>
          <RefreshCw className={`w-4 h-4 me-2 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          {t('refreshData')}
        </Button>
      </div>
    </div>
  );
}
