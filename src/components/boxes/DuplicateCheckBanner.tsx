import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBoxReceipts } from '@/hooks/useBoxReceipts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { findDuplicateGroups, countMergedRecords } from '@/utils/boxDuplicateAnalysis';

/**
 * Compact banner shown at the top of /boxes that surfaces:
 *  - How many records have been merged historically
 *  - Whether any active duplicate (part_no, box, destination) groups remain
 * Provides a deep link to the Data Admin page for resolution.
 */
export function DuplicateCheckBanner() {
  const { t } = useLanguage();
  const { receipts, loading } = useBoxReceipts();

  const { duplicateCount, mergedCount } = useMemo(() => {
    const groups = findDuplicateGroups(receipts);
    return {
      duplicateCount: groups.length,
      mergedCount: countMergedRecords(receipts),
    };
  }, [receipts]);

  if (loading) return null;

  const ok = duplicateCount === 0;
  return (
    <Card
      className={`p-3 border ${
        ok ? 'border-success/40 bg-success/5' : 'border-warning/50 bg-warning/10'
      }`}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          {ok ? (
            <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
          )}
          <div className="min-w-0">
            <div className="text-sm font-semibold">
              {ok ? t('consistencyOk') : t('inconsistenciesFound')}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {ok
                ? t('noDuplicatesFound')
                : t('duplicatesFound').replace('{count}', String(duplicateCount))}
              {mergedCount > 0 && (
                <> · {t('mergedRecordsCount').replace('{count}', String(mergedCount))}</>
              )}
            </div>
          </div>
        </div>
        <Button asChild variant={ok ? 'outline' : 'default'} size="sm" className="gap-1.5">
          <Link to="/boxes/data-admin">
            {t('review')}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}