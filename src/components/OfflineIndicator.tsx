import { memo } from 'react';
import { useOfflineMode } from '@/hooks/useOfflineMode';
import { useLanguage } from '@/contexts/LanguageContext';
import { WifiOff, CloudOff, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  className?: string;
  showPending?: boolean;
}

export const OfflineIndicator = memo(function OfflineIndicator({ className, showPending = true }: OfflineIndicatorProps) {
  const { isOnline, pendingOperations, isSyncing } = useOfflineMode();
  const { t } = useLanguage();

  if (isOnline && pendingOperations === 0) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm animate-fade-in',
        !isOnline 
          ? 'bg-destructive/20 text-destructive border border-destructive/30'
          : 'bg-warning/20 text-warning border border-warning/30',
        className
      )}
    >
      {!isOnline ? (
        <>
          <WifiOff className="w-4 h-4" />
          <span className="hidden sm:inline">{t('offline') || 'غير متصل'}</span>
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="hidden sm:inline">{t('syncing') || 'جاري المزامنة...'}</span>
        </>
      ) : showPending && pendingOperations > 0 ? (
        <>
          <CloudOff className="w-4 h-4" />
          <span className="hidden sm:inline">
            {pendingOperations} {t('pendingSync') || 'عملية معلقة'}
          </span>
          <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
            {pendingOperations}
          </Badge>
        </>
      ) : null}
    </div>
  );
});

// Floating offline banner for mobile
export const OfflineBanner = memo(function OfflineBanner() {
  const { isOnline, pendingOperations } = useOfflineMode();
  const { t } = useLanguage();

  if (isOnline && pendingOperations === 0) return null;

  return (
    <div
      className={cn(
        'fixed top-16 inset-x-4 z-50 p-3 rounded-lg shadow-lg flex items-center justify-center gap-2 animate-slide-up',
        !isOnline
          ? 'bg-destructive text-destructive-foreground'
          : 'bg-warning text-warning-foreground'
      )}
    >
      {!isOnline ? (
        <>
          <WifiOff className="w-5 h-5" />
          <span>{t('offlineMessage') || 'أنت غير متصل بالإنترنت. التغييرات ستُحفظ محلياً.'}</span>
        </>
      ) : (
        <>
          <CloudOff className="w-5 h-5" />
          <span>
            {pendingOperations} {t('operationsPending') || 'عملية في انتظار المزامنة'}
          </span>
        </>
      )}
    </div>
  );
});
