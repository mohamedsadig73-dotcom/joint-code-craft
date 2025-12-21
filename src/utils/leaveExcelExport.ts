import * as XLSX from 'xlsx';

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

export const exportLeaveRequestsToExcel = (
  requests: LeaveRequest[],
  language: string = 'ar',
  fileName: string = 'leave_requests'
) => {
  const isArabic = language === 'ar';

  // Prepare data with bilingual headers
  const exportData = requests.map((req, index) => ({
    '#': index + 1,
    [isArabic ? 'اسم الموظف / Employee Name' : 'Employee Name / اسم الموظف']: req.employee_name,
    [isArabic ? 'الرقم الوظيفي / Employee ID' : 'Employee ID / الرقم الوظيفي']: req.employee_id,
    [isArabic ? 'الإدارة / Department' : 'Department / الإدارة']: req.department,
    [isArabic ? 'المسمى الوظيفي / Job Title' : 'Job Title / المسمى الوظيفي']: req.job_title,
    [isArabic ? 'تاريخ التعيين / Hire Date' : 'Hire Date / تاريخ التعيين']: req.hire_date,
    [isArabic ? 'أشهر الخدمة / Months of Service' : 'Months of Service / أشهر الخدمة']: req.months_of_service,
    [isArabic ? 'الرصيد الأصلي / Original Balance' : 'Original Balance / الرصيد الأصلي']: req.original_balance,
    [isArabic ? 'المستهلك سابقاً / Previously Used' : 'Previously Used / المستهلك سابقاً']: req.previously_used_days,
    [isArabic ? 'تاريخ البداية / Start Date' : 'Start Date / تاريخ البداية']: req.start_date_gregorian,
    [isArabic ? 'تاريخ النهاية / End Date' : 'End Date / تاريخ النهاية']: req.end_date_gregorian,
    [isArabic ? 'الأيام المطلوبة / Days Requested' : 'Days Requested / الأيام المطلوبة']: req.days_requested,
    [isArabic ? 'الرصيد المتبقي المتوقع / Expected Remaining' : 'Expected Remaining / الرصيد المتبقي المتوقع']: req.expected_remaining_balance,
    [isArabic ? 'الحالة / Status' : 'Status / الحالة']: getStatusLabel(req.request_status, isArabic),
    [isArabic ? 'سبب الإجازة / Reason' : 'Reason / سبب الإجازة']: req.reason || '-',
    [isArabic ? 'اسم النائب / Deputy Name' : 'Deputy Name / اسم النائب']: req.deputy_name || '-',
    [isArabic ? 'رقم التواصل / Deputy Contact' : 'Deputy Contact / رقم التواصل']: req.deputy_contact || '-',
    [isArabic ? 'تاريخ الطلب / Request Date' : 'Request Date / تاريخ الطلب']: req.created_at.split('T')[0],
  }));

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Set column widths for better readability
  ws['!cols'] = [
    { wch: 5 },   // #
    { wch: 25 },  // Employee Name
    { wch: 15 },  // Employee ID
    { wch: 18 },  // Department
    { wch: 18 },  // Job Title
    { wch: 15 },  // Hire Date
    { wch: 12 },  // Months of Service
    { wch: 15 },  // Original Balance
    { wch: 15 },  // Previously Used
    { wch: 15 },  // Start Date
    { wch: 15 },  // End Date
    { wch: 15 },  // Days Requested
    { wch: 18 },  // Expected Remaining
    { wch: 25 },  // Status
    { wch: 25 },  // Reason
    { wch: 20 },  // Deputy Name
    { wch: 18 },  // Deputy Contact
    { wch: 15 },  // Request Date
  ];

  // Create a calculation sheet
  const calcData = requests.map((req, index) => ({
    [isArabic ? 'اسم الموظف' : 'Employee Name']: req.employee_name,
    [isArabic ? 'تاريخ التعيين' : 'Hire Date']: req.hire_date,
    [isArabic ? 'الرصيد الأصلي' : 'Original Balance']: req.original_balance,
    [isArabic ? 'المستهلك سابقاً' : 'Previously Used']: req.previously_used_days,
    [isArabic ? 'الأيام المطلوبة' : 'Days Requested']: req.days_requested,
    [isArabic ? 'الرصيد المتبقي المتوقع' : 'Expected Remaining']: req.expected_remaining_balance,
    [isArabic ? 'أشهر الخدمة' : 'Months of Service']: req.months_of_service,
    [isArabic ? 'الحالة' : 'Status']: getStatusLabel(req.request_status, isArabic),
  }));

  const wsCalc = XLSX.utils.json_to_sheet(calcData);
  wsCalc['!cols'] = [
    { wch: 25 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 18 },
    { wch: 12 },
    { wch: 25 },
  ];

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, isArabic ? 'طلبات الإجازة' : 'Leave Requests');
  XLSX.utils.book_append_sheet(wb, wsCalc, isArabic ? 'ملخص الحساب' : 'Calculation Summary');

  // Add metadata
  wb.Props = {
    Title: isArabic ? 'تقرير طلبات الإجازة السنوية' : 'Annual Leave Requests Report',
    Subject: 'Leave Requests Report',
    Author: 'HR System',
    CreatedDate: new Date(),
  };

  // Generate file name with timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  const fullFileName = `${fileName}_${timestamp}.xlsx`;

  // Write file
  XLSX.writeFile(wb, fullFileName, {
    bookType: 'xlsx',
    type: 'binary',
  });

  return fullFileName;
};

// Export a blank form template
export const exportLeaveFormTemplate = (language: string = 'ar') => {
  const isArabic = language === 'ar';

  // Create form template
  const formData = [
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
    [isArabic ? 'تاريخ بداية الإجازة (ميلادي) / Start Date (Gregorian)' : 'Start Date (Gregorian) / تاريخ بداية الإجازة (ميلادي)', ''],
    [isArabic ? 'تاريخ بداية الإجازة (هجري) / Start Date (Hijri)' : 'Start Date (Hijri) / تاريخ بداية الإجازة (هجري)', ''],
    [isArabic ? 'تاريخ نهاية الإجازة (ميلادي) / End Date (Gregorian)' : 'End Date (Gregorian) / تاريخ نهاية الإجازة (ميلادي)', ''],
    [isArabic ? 'تاريخ نهاية الإجازة (هجري) / End Date (Hijri)' : 'End Date (Hijri) / تاريخ نهاية الإجازة (هجري)', ''],
    [isArabic ? 'عدد الأيام المطلوبة / Days Requested' : 'Days Requested / عدد الأيام المطلوبة', ''],
    [isArabic ? 'تاريخ العودة المتوقع / Expected Return Date' : 'Expected Return Date / تاريخ العودة المتوقع', ''],
    [''],
    [isArabic ? 'ثالثاً: سبب الاستحقاق (اختياري)' : 'Reason (Optional)', ''],
    [''],
    [''],
    [isArabic ? 'رابعاً: البديل/النائب' : 'Substitute/Deputy', ''],
    [isArabic ? 'اسم النائب / Deputy Name' : 'Deputy Name / اسم النائب', ''],
    [isArabic ? 'إدارة النائب / Deputy Department' : 'Deputy Department / إدارة النائب', ''],
    [isArabic ? 'رقم التواصل / Contact Number' : 'Contact Number / رقم التواصل', ''],
    [''],
    [isArabic ? 'خامساً: الموافقات' : 'Approvals', '', '', ''],
    [isArabic ? 'الجهة' : 'Party', isArabic ? 'التوقيع' : 'Signature', isArabic ? 'التاريخ' : 'Date', isArabic ? 'الملاحظات' : 'Notes'],
    [isArabic ? 'توقيع الموظف / Employee' : 'Employee / توقيع الموظف', '', '', ''],
    [isArabic ? 'مدير الإدارة / Department Manager' : 'Department Manager / مدير الإدارة', '', '', ''],
    [isArabic ? 'الموارد البشرية / HR' : 'HR / الموارد البشرية', '', '', ''],
    [''],
    [isArabic ? '⚠️ تنبيه هام:' : '⚠️ Important Notice:'],
    [isArabic 
      ? 'لا تُمنح الإجازة السنوية إلا بعد اجتياز 6 أشهر من تاريخ التعيين، ويُشترط ألا يقل الرصيد المتبقي عن 5 أيام بعد خصم المدة المطلوبة.'
      : 'Annual leave is granted only after completing 6 months of employment, and the remaining balance must not be less than 5 days after deducting the requested period.'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(formData);

  // Set column widths
  ws['!cols'] = [
    { wch: 50 },
    { wch: 25 },
    { wch: 20 },
    { wch: 25 },
  ];

  // Merge cells for title
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, isArabic ? 'نموذج طلب إجازة' : 'Leave Request Form');

  const timestamp = new Date().toISOString().split('T')[0];
  const fullFileName = `leave_request_form_${timestamp}.xlsx`;

  XLSX.writeFile(wb, fullFileName, {
    bookType: 'xlsx',
    type: 'binary',
  });

  return fullFileName;
};
