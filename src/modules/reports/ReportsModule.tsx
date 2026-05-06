/**
 * ReportsModule — unified entry for the Reports domain (S5/P3).
 * ReportsHub already merges ReportsAnalytics + WmsReports via a `?type=`
 * dropdown; re-export it as the canonical entry point.
 */
import ReportsHub from '@/pages/ReportsHub';

export default function ReportsModule() {
  return <ReportsHub />;
}