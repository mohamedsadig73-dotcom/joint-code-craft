import * as XLSX from 'xlsx';

interface LeaveTracking {
  id: string;
  employee_name: string;
  employee_id: string;
  job_title: string;
  department: string;
  contract_type: 'employee' | 'worker';
  hire_date: string;
  last_leave_start: string | null;
  last_leave_end: string | null;
  current_leave_start: string | null;
  current_leave_end: string | null;
  expected_return_date: string | null;
  actual_return_date: string | null;
  entitled_days: number;
  used_days: number;
  remaining_balance: number;
  next_leave_due: string | null;
  travel_date: string | null;
  travel_destination: string | null;
  notes: string | null;
}

const getContractTypeLabel = (type: string, isArabic: boolean): string => {
  const labels: Record<string, { ar: string; en: string }> = {
    employee: { ar: 'موظف', en: 'Employee' },
    worker: { ar: 'عامل', en: 'Worker' },
  };
  return labels[type]?.[isArabic ? 'ar' : 'en'] || type;
};

const getStatusLabel = (record: LeaveTracking, isArabic: boolean): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (record.current_leave_start && record.current_leave_end) {
    const leaveStart = new Date(record.current_leave_start);
    const leaveEnd = new Date(record.current_leave_end);
    
    if (today >= leaveStart && today <= leaveEnd) {
      if (record.expected_return_date && !record.actual_return_date) {
        const expectedReturn = new Date(record.expected_return_date);
        if (today > expectedReturn) {
          return isArabic ? 'متأخر عن العودة' : 'Overdue Return';
        }
      }
      return isArabic ? 'في إجازة' : 'On Leave';
    }
  }
  
  return isArabic ? 'على رأس العمل' : 'At Work';
};

export const exportLeaveTrackingToExcel = (
  records: LeaveTracking[],
  language: string = 'ar',
  fileName: string = 'leave_tracking'
) => {
  const isArabic = language === 'ar';

  const exportData = records.map((rec, index) => ({
    '#': index + 1,
    [isArabic ? 'اسم الموظف' : 'Employee Name']: rec.employee_name,
    [isArabic ? 'الرقم الوظيفي' : 'Employee ID']: rec.employee_id,
    [isArabic ? 'المسمى الوظيفي' : 'Job Title']: rec.job_title,
    [isArabic ? 'الإدارة' : 'Department']: rec.department,
    [isArabic ? 'نوع العقد' : 'Contract Type']: getContractTypeLabel(rec.contract_type, isArabic),
    [isArabic ? 'تاريخ التعيين' : 'Hire Date']: rec.hire_date,
    [isArabic ? 'آخر إجازة' : 'Last Leave']: rec.last_leave_end || '-',
    [isArabic ? 'الإجازة القادمة' : 'Next Leave Due']: rec.next_leave_due || '-',
    [isArabic ? 'الرصيد المستحق' : 'Entitled Days']: rec.entitled_days,
    [isArabic ? 'الأيام المستخدمة' : 'Used Days']: rec.used_days,
    [isArabic ? 'الرصيد المتبقي' : 'Remaining Balance']: rec.remaining_balance,
    [isArabic ? 'تاريخ السفر' : 'Travel Date']: rec.travel_date || '-',
    [isArabic ? 'وجهة السفر' : 'Destination']: rec.travel_destination || '-',
    [isArabic ? 'تاريخ العودة المتوقع' : 'Expected Return']: rec.expected_return_date || '-',
    [isArabic ? 'تاريخ العودة الفعلي' : 'Actual Return']: rec.actual_return_date || '-',
    [isArabic ? 'الحالة' : 'Status']: getStatusLabel(rec, isArabic),
    [isArabic ? 'ملاحظات' : 'Notes']: rec.notes || '-',
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);

  ws['!cols'] = [
    { wch: 5 },   // #
    { wch: 25 },  // Employee Name
    { wch: 15 },  // Employee ID
    { wch: 20 },  // Job Title
    { wch: 18 },  // Department
    { wch: 12 },  // Contract Type
    { wch: 12 },  // Hire Date
    { wch: 12 },  // Last Leave
    { wch: 12 },  // Next Leave Due
    { wch: 10 },  // Entitled Days
    { wch: 10 },  // Used Days
    { wch: 12 },  // Remaining Balance
    { wch: 12 },  // Travel Date
    { wch: 15 },  // Destination
    { wch: 12 },  // Expected Return
    { wch: 12 },  // Actual Return
    { wch: 15 },  // Status
    { wch: 25 },  // Notes
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, isArabic ? 'متابعة الإجازات' : 'Leave Tracking');

  wb.Props = {
    Title: isArabic ? 'تقرير متابعة الإجازات السنوية' : 'Annual Leave Tracking Report',
    Subject: 'Leave Tracking Report',
    Author: 'HR System',
    CreatedDate: new Date(),
  };

  const timestamp = new Date().toISOString().split('T')[0];
  const fullFileName = `${fileName}_${timestamp}.xlsx`;

  XLSX.writeFile(wb, fullFileName, {
    bookType: 'xlsx',
    type: 'binary',
  });

  return fullFileName;
};

export const exportUpcomingLeavesReport = (
  records: LeaveTracking[],
  language: string = 'ar',
  fileName: string = 'upcoming_leaves'
) => {
  const isArabic = language === 'ar';

  const exportData = records.map((rec, index) => ({
    '#': index + 1,
    [isArabic ? 'اسم الموظف' : 'Employee Name']: rec.employee_name,
    [isArabic ? 'الرقم الوظيفي' : 'Employee ID']: rec.employee_id,
    [isArabic ? 'الإدارة' : 'Department']: rec.department,
    [isArabic ? 'نوع العقد' : 'Contract Type']: getContractTypeLabel(rec.contract_type, isArabic),
    [isArabic ? 'تاريخ الإجازة القادمة' : 'Next Leave Due']: rec.next_leave_due || '-',
    [isArabic ? 'الرصيد المتبقي' : 'Remaining Balance']: rec.remaining_balance,
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);

  ws['!cols'] = [
    { wch: 5 },
    { wch: 25 },
    { wch: 15 },
    { wch: 18 },
    { wch: 12 },
    { wch: 15 },
    { wch: 12 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, isArabic ? 'الإجازات القادمة' : 'Upcoming Leaves');

  const timestamp = new Date().toISOString().split('T')[0];
  const fullFileName = `${fileName}_${timestamp}.xlsx`;

  XLSX.writeFile(wb, fullFileName, {
    bookType: 'xlsx',
    type: 'binary',
  });

  return fullFileName;
};

export const exportOverdueReturnsReport = (
  records: LeaveTracking[],
  language: string = 'ar',
  fileName: string = 'overdue_returns'
) => {
  const isArabic = language === 'ar';

  const exportData = records.map((rec, index) => ({
    '#': index + 1,
    [isArabic ? 'اسم الموظف' : 'Employee Name']: rec.employee_name,
    [isArabic ? 'الرقم الوظيفي' : 'Employee ID']: rec.employee_id,
    [isArabic ? 'الإدارة' : 'Department']: rec.department,
    [isArabic ? 'تاريخ السفر' : 'Travel Date']: rec.travel_date || '-',
    [isArabic ? 'تاريخ العودة المتوقع' : 'Expected Return']: rec.expected_return_date || '-',
    [isArabic ? 'وجهة السفر' : 'Destination']: rec.travel_destination || '-',
    [isArabic ? 'رقم التواصل' : 'Contact']: '-',
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);

  ws['!cols'] = [
    { wch: 5 },
    { wch: 25 },
    { wch: 15 },
    { wch: 18 },
    { wch: 12 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, isArabic ? 'المتأخرين عن العودة' : 'Overdue Returns');

  const timestamp = new Date().toISOString().split('T')[0];
  const fullFileName = `${fileName}_${timestamp}.xlsx`;

  XLSX.writeFile(wb, fullFileName, {
    bookType: 'xlsx',
    type: 'binary',
  });

  return fullFileName;
};