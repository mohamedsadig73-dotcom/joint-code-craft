import { exportDeclarationsToPDF } from './pdfExport';
import { exportDeclarationsToExcel } from './excelExport';

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

export const exportMaintenanceToPDF = (
  data: MaintenanceReportData[],
  year: number,
  title: string = 'تقرير الصيانة الدورية'
) => {
  // حساب الإحصائيات
  const totalTasks = data.length;
  const completedTasks = data.filter(d => d.status === 'done').length;
  const pendingTasks = data.filter(d => d.status === 'pending').length;
  const overdueTasks = data.filter(d => d.status === 'overdue').length;
  const totalCost = data
    .filter(d => d.actual_cost !== null)
    .reduce((sum, d) => sum + (d.actual_cost || 0), 0);
  
  const completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : '0';

  // تحويل البيانات للتصدير
  const exportData = data.map((item) => ({
    id: item.id,
    type: item.item_name,
    sender: `${MONTHS[item.month - 1]} ${item.year}`,
    status: STATUS_MAP[item.status] || item.status,
    created_at: item.executed_date 
      ? new Date(item.executed_date).toLocaleDateString('ar-SA')
      : new Date(item.scheduled_date).toLocaleDateString('ar-SA'),
  }));

  const doc = exportDeclarationsToPDF(exportData, title);
  
  // إضافة صفحة إحصائيات
  doc.addPage();
  doc.setFontSize(16);
  doc.text('إحصائيات الأداء', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
  
  doc.setFontSize(12);
  let yPos = 40;
  const stats = [
    `إجمالي المهام: ${totalTasks}`,
    `المهام المكتملة: ${completedTasks}`,
    `المهام المعلقة: ${pendingTasks}`,
    `المهام المتأخرة: ${overdueTasks}`,
    `نسبة الإنجاز: ${completionRate}%`,
    `إجمالي التكاليف الفعلية: ${totalCost.toFixed(2)} ريال`,
  ];
  
  stats.forEach(stat => {
    doc.text(stat, 20, yPos);
    yPos += 10;
  });

  doc.save(`maintenance_report_${year}.pdf`);
};

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
    created_at: item.executed_date 
      ? new Date(item.executed_date).toLocaleDateString('ar-SA')
      : new Date(item.scheduled_date).toLocaleDateString('ar-SA'),
  }));

  return exportDeclarationsToExcel(exportData, `${fileName}_${year}`);
};
