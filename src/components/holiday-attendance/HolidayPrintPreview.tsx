import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowRight, Printer } from 'lucide-react';
import { formatDate } from '@/utils/dateUtils';

interface HolidayPrintPreviewProps {
  sheet: {
    warehouse_name: string;
    warehouse_number: string;
    holiday_name: string;
    period_start: string;
    period_end: string;
    month_year: string;
  };
  workRecords: Array<{
    serial_number: number;
    work_type: string;
    work_date: string;
    employee_names: string;
    notes?: string;
  }>;
  employees: Array<{
    employee_number: string;
    employee_name: string;
    job_title: string;
    total_days: number;
  }>;
  onClose: () => void;
}

export function HolidayPrintPreview({ sheet, workRecords, employees, onClose }: HolidayPrintPreviewProps) {
  const { t } = useLanguage();
  const originalTitleRef = useRef(document.title);

  useEffect(() => {
    return () => {
      document.title = originalTitleRef.current;
    };
  }, []);

  const buildPrintHTML = () => {
    const workRows = workRecords.map(record => `
      <tr>
        <td>${record.serial_number}</td>
        <td>${record.work_type}</td>
        <td>${record.notes || '-'}</td>
        <td>${record.work_date}</td>
        <td style="white-space:pre-wrap">${record.employee_names}</td>
      </tr>
    `).join('');

    const empRows = employees.filter(emp => emp.total_days > 0).map(emp => `
      <tr>
        <td style="font-family:monospace">${emp.employee_number}</td>
        <td style="font-weight:bold;color:#1d4ed8">${emp.employee_name}</td>
        <td>${emp.job_title}</td>
        <td>${emp.total_days} يوم</td>
      </tr>
    `).join('');

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar"><head><meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Cairo','Arial',sans-serif; padding:15mm; color:#000; direction:rtl; }
  @page { size:A4; margin:10mm 15mm; }
  h1 { font-size:16px; color:#1d4ed8; margin-bottom:8px; text-align:center; }
  h2 { font-size:14px; color:#2563eb; text-align:center; line-height:1.6; margin-bottom:4px; }
  .subtitle { font-size:12px; color:#2563eb; font-weight:bold; text-align:center; margin-bottom:16px; }
  table { width:100%; border-collapse:collapse; margin-bottom:24px; font-size:12px; }
  th, td { border:1px solid #9ca3af; padding:6px 8px; text-align:center; }
  th { background:#eff6ff; font-weight:bold; }
  .print-date { text-align:center; font-size:10px; color:#6b7280; margin-top:20px; }
</style></head><body>
  <h1>${sheet.warehouse_name} بالمنطقة اللوجستية رقم (${sheet.warehouse_number})</h1>
  <h2>كشف دوام الموظفين والعمال خلال العطلة الرسمية بمناسبة ${sheet.holiday_name} من ${formatDate(sheet.period_start)} إلى ${formatDate(sheet.period_end)}</h2>
  ${sheet.month_year ? `<div class="subtitle">${sheet.month_year}</div>` : ''}
  <table><thead><tr>
    <th>المسلسل</th><th>نوع العمل</th><th>وصف العمل</th><th>تاريخ العمل</th><th>اسم الموظف المتواجد اثناء العمل</th>
  </tr></thead><tbody>${workRows}</tbody></table>
  <table><thead><tr>
    <th>الرقم الوظيفي</th><th>اسم الموظف</th><th>الوظيفة</th><th>اجمالي أيام العمل</th>
  </tr></thead><tbody>${empRows}</tbody></table>
  <div class="print-date">تم الطباعة بتاريخ: ${new Date().toLocaleDateString('en-GB')}</div>
</body></html>`;
  };

  const handlePrint = async () => {
    const originalTitle = document.title;
    const fileName = `كشف دوام الموظفين والعمال خلال العطلة الرسمية بمناسبة ${sheet.holiday_name} من ${formatDate(sheet.period_start)} إلى ${formatDate(sheet.period_end)}`;
    document.title = fileName;

    const html = buildPrintHTML();

    // Use Electron's native print if available
    if (window.electronAPI?.printHTML) {
      try {
        await window.electronAPI.printHTML(html);
      } catch (e) {
        console.log('Electron print cancelled or failed:', e);
      } finally {
        document.title = originalTitle;
      }
      return;
    }

    // Fallback: browser print
    window.print();
    document.title = originalTitle;
  };

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* Controls - hidden in print */}
      <div className="print:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b p-4 flex items-center justify-between">
        <Button variant="ghost" onClick={onClose} className="gap-2">
          <ArrowRight className="w-4 h-4" />
          {t('back')}
        </Button>
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="w-4 h-4" />
          {t('print')}
        </Button>
      </div>

      {/* Print content */}
      <div className="max-w-[210mm] mx-auto p-8 pt-20 print:pt-8 print:p-[15mm] font-['Arial',sans-serif] text-black">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-lg font-bold text-blue-700 mb-2">
            {sheet.warehouse_name} بالمنطقة اللوجستية رقم ({sheet.warehouse_number})
          </h1>
          <h2 className="text-base font-bold text-blue-600 leading-relaxed">
            كشف دوام الموظفين والعمال خلال العطلة الرسمية بمناسبة {sheet.holiday_name} من {formatDate(sheet.period_start)} إلى {formatDate(sheet.period_end)}
          </h2>
          {sheet.month_year && (
            <p className="text-sm font-bold text-blue-600 mt-1">{sheet.month_year}</p>
          )}
        </div>

        {/* Work Records Table */}
        <table className="w-full border-collapse border border-gray-400 mb-8 text-sm">
          <thead>
            <tr className="bg-blue-50">
              <th className="border border-gray-400 p-2 text-center font-bold">المسلسل</th>
              <th className="border border-gray-400 p-2 text-center font-bold">نوع العمل</th>
              <th className="border border-gray-400 p-2 text-center font-bold">وصف العمل</th>
              <th className="border border-gray-400 p-2 text-center font-bold">تاريخ العمل</th>
              <th className="border border-gray-400 p-2 text-center font-bold">اسم الموظف المتواجد اثناء العمل</th>
            </tr>
          </thead>
          <tbody>
            {workRecords.map(record => (
              <tr key={record.serial_number}>
                <td className="border border-gray-400 p-2 text-center">{record.serial_number}</td>
                <td className="border border-gray-400 p-2 text-center">{record.work_type}</td>
                <td className="border border-gray-400 p-2 text-center">{record.notes || '-'}</td>
                <td className="border border-gray-400 p-2 text-center">{record.work_date}</td>
                <td className="border border-gray-400 p-2 whitespace-pre-wrap">{record.employee_names}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Employees Summary Table */}
        <table className="w-full border-collapse border border-gray-400 text-sm">
          <thead>
            <tr className="bg-blue-50">
              <th className="border border-gray-400 p-2 text-center font-bold">الرقم الوظيفي</th>
              <th className="border border-gray-400 p-2 text-center font-bold">اسم الموظف</th>
              <th className="border border-gray-400 p-2 text-center font-bold">الوظيفة</th>
              <th className="border border-gray-400 p-2 text-center font-bold">اجمالي أيام العمل</th>
            </tr>
          </thead>
          <tbody>
            {employees.filter(emp => emp.total_days > 0).map(emp => (
              <tr key={emp.employee_number}>
                <td className="border border-gray-400 p-2 text-center font-mono">{emp.employee_number}</td>
                <td className="border border-gray-400 p-2 text-center font-bold text-blue-700">{emp.employee_name}</td>
                <td className="border border-gray-400 p-2 text-center">{emp.job_title}</td>
                <td className="border border-gray-400 p-2 text-center">{emp.total_days} يوم</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { size: A4; margin: 15mm; margin-top: 10mm; margin-bottom: 10mm; }
          title { display: none; }
        }
      `}</style>
    </div>
  );
}
