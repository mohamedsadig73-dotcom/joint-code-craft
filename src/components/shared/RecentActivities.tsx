import { memo } from 'react';
import { Activity, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDateTime } from '@/utils/dateUtils';
import { auditActionLabels } from '@/constants/statusLabels';

interface ActivityItem {
  id: string;
  action: string;
  table_name?: string;
  record_id?: string | null;
  created_at: string;
  message?: string;
  profiles?: {
    username: string;
  } | null;
}

interface RecentActivitiesProps {
  activities: ActivityItem[];
  loading?: boolean;
  maxHeight?: string;
  showHeader?: boolean;
  variant?: 'default' | 'compact';
}

export const RecentActivities = memo(function RecentActivities({
  activities,
  loading = false,
  maxHeight = '400px',
  showHeader = true,
  variant = 'default',
}: RecentActivitiesProps) {
  const { t, language } = useLanguage();

  const LoadingSkeleton = () => (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="h-16 bg-muted/50 rounded animate-pulse" />
      ))}
    </div>
  );

  const content = (
    <>
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div className={`space-y-3 overflow-y-auto`} style={{ maxHeight }}>
          {activities.map((activity) => (
            <div 
              key={activity.id} 
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="p-2 rounded-full bg-primary/10 mt-0.5">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {activity.profiles?.username || t('userLabel')}
                  <span className="text-muted-foreground mx-2">•</span>
                  <span className="text-muted-foreground">
                    {activity.message || auditActionLabels[activity.action] || activity.action}
                    {activity.table_name && activity.record_id && (
                      <span className="text-muted-foreground/70 text-xs ms-1">
                        ({activity.table_name} #{activity.record_id.slice(0, 8)})
                      </span>
                    )}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDateTime(activity.created_at)}
                </p>
              </div>
            </div>
          ))}
          {activities.length === 0 && (
            <p className="text-muted-foreground text-center py-4">
              {language === 'ar' ? 'لا توجد نشاطات حديثة' : 'No recent activities'}
            </p>
          )}
        </div>
      )}
    </>
  );

  if (!showHeader) {
    return content;
  }

  return (
    <Card className="glass-card border-border/50 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-secondary/10">
          <Activity className="w-5 h-5 text-secondary" />
        </div>
        <h3 className="text-lg font-semibold">{t('recentActivities')}</h3>
      </div>
      {content}
    </Card>
  );
});
