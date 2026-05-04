import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { BarChart3, FileText, Warehouse } from 'lucide-react';
import ReportsAnalytics from './ReportsAnalytics';
import WmsReports from './WmsReports';

/**
 * P4 — Unified Reports Hub.
 * Single page; user picks the report family from a dropdown:
 *   - declarations  → ReportsAnalytics (overview / trends / performance / export)
 *   - warehouse     → WmsReports       (stock / low / custody / movements)
 * URL-synced via ?type= for deep-linking and legacy redirects.
 * No business logic changes — both pages are rendered embedded.
 */
type ReportType = 'declarations' | 'warehouse';
const VALID: ReportType[] = ['declarations', 'warehouse'];

export default function ReportsHub() {
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();

  const initial = (params.get('type') as ReportType) || 'declarations';
  const [type, setType] = useState<ReportType>(VALID.includes(initial) ? initial : 'declarations');

  useEffect(() => {
    const current = params.get('type');
    if (current !== type) {
      const next = new URLSearchParams(params);
      next.set('type', type);
      setParams(next, { replace: true });
    }
  }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 pb-24 md:pb-8">
      <PageHeader
        icon={BarChart3}
        title={t('reportsTitle') || 'التقارير والتحليلات'}
        subtitle={t('reportsAnalyticsDesc') || ''}
        actions={
          <Select value={type} onValueChange={(v) => setType(v as ReportType)}>
            <SelectTrigger className="w-full sm:w-64 h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="declarations">
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {t('reportsAnalytics') || 'تقارير الإقرارات'}
                </span>
              </SelectItem>
              <SelectItem value="warehouse">
                <span className="flex items-center gap-2">
                  <Warehouse className="w-4 h-4" />
                  {t('wmsReports') || 'تقارير المخزن'}
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="mt-4">
        {type === 'declarations' ? <ReportsAnalytics embedded /> : <WmsReports embedded />}
      </div>
    </main>
  );
}