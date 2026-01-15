import { exportDeclarationsToExcel } from './excelExport';
import { formatDate } from './dateUtils';

export interface MaintenanceReportData {
  id: string;
  item_name: string;
  month: number;
  year: number;
  status: string;
  scheduled_date: string;
  executed_date: string | null;
  actual_cost: number | null;
  notes: string | null;
}

const STATUS_MAP: Record<string, string> = {
  pending: 'مطلوب',
  done: 'تم',
  not_required: 'غير مطلوب',
  overdue: 'متأخر',
};

const MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export const exportMaintenanceToExcel = (
  data: MaintenanceReportData[],
  year: number,
  fileName: string = 'maintenance_report'
) => {
  const exportData = data.map((item) => ({
    id: item.id,
    type: item.item_name,
    sender: `${MONTHS[item.month - 1]} ${item.year}`,
    status: STATUS_MAP[item.status] || item.status,
    created_at: formatDate(item.executed_date || item.scheduled_date),
  }));

  return exportDeclarationsToExcel(exportData, `${fileName}_${year}`);
};
