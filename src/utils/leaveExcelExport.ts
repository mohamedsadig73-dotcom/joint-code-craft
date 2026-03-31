import ExcelJS from 'exceljs';

interface LeaveRequest {
  id: string;
  employee_name: string;
  employee_id: string;
  department: string;
  job_title: string;
  hire_date: string;
  original_balance: number;
  current_remaining_balance: number;
  start_date_gregorian: string;
  end_date_gregorian: string;
  days_requested: number;
  expected_return_date: string;
  reason: string | null;
  deputy_name: string | null;
  deputy_department: string | null;
  deputy_contact: string | null;
  previously_used_days: number;
  expected_remaining_balance: number;
  months_of_service: number;
  request_status: string;
  manager_approved: boolean | null;
  hr_approved: boolean | null;
  created_at: string;
}

const getStatusLabel = (status: string, isArabic: boolean): string => {
  const labels: Record<string, { ar: string; en: string }> = {
    pending: { ar: 'قيد الانتظار', en: 'Pending' },
    approved: { ar: 'مقبول', en: 'Approved' },
    rejected_less_than_6_months: { ar: 'مرفوض - لم يتم 6 أشهر', en: 'Rejected - Less than 6 months' },
    rejected_insufficient_balance: { ar: 'مرفوض - نقص رصيد', en: 'Rejected - Insufficient balance' },
  };
  return labels[status]?.[isArabic ? 'ar' : 'en'] || status;
};

const saveAndDownload = async (wb: ExcelJS.Workbook, fullFileName: string) => {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fullFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportLeaveRequestsToExcel = async (
  requests: LeaveRequest[],
  language: string = 'ar',
  fileName: string = 'leave_requests'
) => {
  const isArabic = language === 'ar';
  const wb = new ExcelJS.Workbook();
  wb.creator = 'HR System';
  wb.created = new Date();

  // Main sheet
  const ws = wb.addWorksheet(isArabic ? 'طلبات الإجازة' : 'Leave Requests');
  const headers = [
    { header: '#', key: 'num', width: 5 },
    { header: isArabic ? 'اسم الموظف' : 'Employee Name', key: 'name', width: 25 },
    { header: isArabic ? 'الرقم الوظيفي' : 'Employee ID', key: 'empId', width: 15 },
    { header: isArabic ? 'الإدارة' : 'Department', key: 'dept', width: 18 },
    { header: isArabic ? 'المسمى الوظيفي' : 'Job Title', key: 'title', width: 18 },
    { header: isArabic ? 'تاريخ التعيين' : 'Hire Date', key: 'hire', width: 15 },
    { header: isArabic ? 'أشهر الخدمة' : 'Months of Service', key: 'months', width: 12 },
    { header: isArabic ? 'الرصيد الأصلي' : 'Original Balance', key: 'origBal', width: 15 },
    { header: isArabic ? 'المستهلك سابقاً' : 'Previously Used', key: 'prevUsed', width: 15 },
    { header: isArabic ? 'تاريخ البداية' : 'Start Date', key: 'start', width: 15 },
    { header: isArabic ? 'تاريخ النهاية' : 'End Date', key: 'end', width: 15 },
    { header: isArabic ? 'الأيام المطلوبة' : 'Days Requested', key: 'days', width: 15 },
    { header: isArabic ? 'الرصيد المتبقي المتوقع' : 'Expected Remaining', key: 'expRem', width: 18 },
    { header: isArabic ? 'الحالة' : 'Status', key: 'status', width: 25 },
    { header: isArabic ? 'سبب الإجازة' : 'Reason', key: 'reason', width: 25 },
    { header: isArabic ? 'اسم النائب' : 'Deputy Name', key: 'deputy', width: 20 },
    { header: isArabic ? 'رقم التواصل' : 'Deputy Contact', key: 'contact', width: 18 },
    { header: isArabic ? 'تاريخ الطلب' : 'Request Date', key: 'reqDate', width: 15 },
  ];
  ws.columns = headers;

  ws.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  requests.forEach((req, i) => {
    ws.addRow({
      num: i + 1, name: req.employee_name, empId: req.employee_id, dept: req.department,
      title: req.job_title, hire: req.hire_date, months: req.months_of_service,
      origBal: req.original_balance, prevUsed: req.previously_used_days,
      start: req.start_date_gregorian, end: req.end_date_gregorian, days: req.days_requested,
      expRem: req.expected_remaining_balance, status: getStatusLabel(req.request_status, isArabic),
      reason: req.reason || '-', deputy: req.deputy_name || '-', contact: req.deputy_contact || '-',
      reqDate: req.created_at.split('T')[0],
    });
  });

  // Calculation summary sheet
  const wsCalc = wb.addWorksheet(isArabic ? 'ملخص الحساب' : 'Calculation Summary');
  wsCalc.columns = [
    { header: isArabic ? 'اسم الموظف' : 'Employee Name', key: 'name', width: 25 },
    { header: isArabic ? 'تاريخ التعيين' : 'Hire Date', key: 'hire', width: 15 },
    { header: isArabic ? 'الرصيد الأصلي' : 'Original Balance', key: 'origBal', width: 15 },
    { header: isArabic ? 'المستهلك سابقاً' : 'Previously Used', key: 'prevUsed', width: 15 },
    { header: isArabic ? 'الأيام المطلوبة' : 'Days Requested', key: 'days', width: 15 },
    { header: isArabic ? 'الرصيد المتبقي المتوقع' : 'Expected Remaining', key: 'expRem', width: 18 },
    { header: isArabic ? 'أشهر الخدمة' : 'Months of Service', key: 'months', width: 12 },
    { header: isArabic ? 'الحالة' : 'Status', key: 'status', width: 25 },
  ];

  wsCalc.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  requests.forEach(req => {
    wsCalc.addRow({
      name: req.employee_name, hire: req.hire_date, origBal: req.original_balance,
      prevUsed: req.previously_used_days, days: req.days_requested,
      expRem: req.expected_remaining_balance, months: req.months_of_service,
      status: getStatusLabel(req.request_status, isArabic),
    });
  });

  const timestamp = new Date().toISOString().split('T')[0];
  const fullFileName = `${fileName}_${timestamp}.xlsx`;
  await saveAndDownload(wb, fullFileName);
  return fullFileName;
};

export const exportLeaveFormTemplate = async (language: string = 'ar') => {
  const isArabic = language === 'ar';
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(isArabic ? 'نموذج طلب إجازة' : 'Leave Request Form');

  ws.getColumn(1).width = 50;
  ws.getColumn(2).width = 25;
  ws.getColumn(3).width = 20;
  ws.getColumn(4).width = 25;

  const formData: (string | number)[][] = [
    ['', isArabic ? 'نموذج طلب الإجازة السنوية' : 'Annual Leave Request Form'],
    ['', 'Annual Leave Request Form'],
    [''],
    [isArabic ? 'أولاً: بيانات الموظف' : 'Employee Information', ''],
    [isArabic ? 'الاسم الكامل / Full Name' : 'Full Name / الاسم الكامل', ''],
    [isArabic ? 'الرقم الوظيفي / Employee ID' : 'Employee ID / الرقم الوظيفي', ''],
    [isArabic ? 'الإدارة / Department' : 'Department / الإدارة', ''],
    [isArabic ? 'المسمى الوظيفي / Job Title' : 'Job Title / المسمى الوظيفي', ''],
    [isArabic ? 'تاريخ التعيين / Hire Date' : 'Hire Date / تاريخ التعيين', ''],
    [isArabic ? 'رصيد الإجازة الأصلي / Original Balance' : 'Original Balance / رصيد الإجازة الأصلي', '21'],
    [isArabic ? 'الرصيد المتبقي الحالي / Current Balance' : 'Current Balance / الرصيد المتبقي الحالي', ''],
    [''],
    [isArabic ? 'ثانياً: تفاصيل الطلب' : 'Request Details', ''],
    [isArabic ? 'تاريخ بداية الإجازة (ميلادي)' : 'Start Date (Gregorian)', ''],
    [isArabic ? 'تاريخ بداية الإجازة (هجري)' : 'Start Date (Hijri)', ''],
    [isArabic ? 'تاريخ نهاية الإجازة (ميلادي)' : 'End Date (Gregorian)', ''],
    [isArabic ? 'تاريخ نهاية الإجازة (هجري)' : 'End Date (Hijri)', ''],
    [isArabic ? 'عدد الأيام المطلوبة' : 'Days Requested', ''],
    [isArabic ? 'تاريخ العودة المتوقع' : 'Expected Return Date', ''],
    [''],
    [isArabic ? 'ثالثاً: سبب الاستحقاق (اختياري)' : 'Reason (Optional)', ''],
    [''],
    [''],
    [isArabic ? 'رابعاً: البديل/النائب' : 'Substitute/Deputy', ''],
    [isArabic ? 'اسم النائب / Deputy Name' : 'Deputy Name', ''],
    [isArabic ? 'إدارة النائب / Deputy Department' : 'Deputy Department', ''],
    [isArabic ? 'رقم التواصل / Contact Number' : 'Contact Number', ''],
    [''],
    [isArabic ? 'خامساً: الموافقات' : 'Approvals', '', '', ''],
    [isArabic ? 'الجهة' : 'Party', isArabic ? 'التوقيع' : 'Signature', isArabic ? 'التاريخ' : 'Date', isArabic ? 'الملاحظات' : 'Notes'],
    [isArabic ? 'توقيع الموظف' : 'Employee', '', '', ''],
    [isArabic ? 'مدير الإدارة' : 'Department Manager', '', '', ''],
    [isArabic ? 'الموارد البشرية' : 'HR', '', '', ''],
    [''],
    [isArabic ? '⚠️ تنبيه هام:' : '⚠️ Important Notice:'],
    [isArabic
      ? 'لا تُمنح الإجازة السنوية إلا بعد اجتياز 6 أشهر من تاريخ التعيين، ويُشترط ألا يقل الرصيد المتبقي عن 5 أيام بعد خصم المدة المطلوبة.'
      : 'Annual leave is granted only after completing 6 months of employment, and the remaining balance must not be less than 5 days after deducting the requested period.'],
  ];

  formData.forEach(row => ws.addRow(row));

  // Merge title cells
  ws.mergeCells('A1:D1');
  ws.mergeCells('A2:D2');

  const timestamp = new Date().toISOString().split('T')[0];
  const fullFileName = `leave_request_form_${timestamp}.xlsx`;
  await downloadBuffer(wb, fullFileName);
  return fullFileName;
};

const downloadBuffer = async (wb: ExcelJS.Workbook, fullFileName: string) => {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fullFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
