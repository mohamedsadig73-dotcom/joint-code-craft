import ExcelJS from 'exceljs';

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
        if (today > expectedReturn) return isArabic ? 'متأخر عن العودة' : 'Overdue Return';
      }
      return isArabic ? 'في إجازة' : 'On Leave';
    }
  }
  return isArabic ? 'على رأس العمل' : 'At Work';
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

const styleHeaderRow = (ws: ExcelJS.Worksheet) => {
  ws.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
};

export const exportLeaveTrackingToExcel = async (
  records: LeaveTracking[],
  language: string = 'ar',
  fileName: string = 'leave_tracking'
) => {
  const isArabic = language === 'ar';
  const wb = new ExcelJS.Workbook();
  wb.creator = 'HR System';
  wb.created = new Date();

  const ws = wb.addWorksheet(isArabic ? 'متابعة الإجازات' : 'Leave Tracking');
  ws.columns = [
    { header: '#', key: 'num', width: 5 },
    { header: isArabic ? 'اسم الموظف' : 'Employee Name', key: 'name', width: 25 },
    { header: isArabic ? 'الرقم الوظيفي' : 'Employee ID', key: 'empId', width: 15 },
    { header: isArabic ? 'المسمى الوظيفي' : 'Job Title', key: 'title', width: 20 },
    { header: isArabic ? 'الإدارة' : 'Department', key: 'dept', width: 18 },
    { header: isArabic ? 'نوع العقد' : 'Contract Type', key: 'contract', width: 12 },
    { header: isArabic ? 'تاريخ التعيين' : 'Hire Date', key: 'hire', width: 12 },
    { header: isArabic ? 'آخر إجازة' : 'Last Leave', key: 'lastLeave', width: 12 },
    { header: isArabic ? 'الإجازة القادمة' : 'Next Leave Due', key: 'nextLeave', width: 12 },
    { header: isArabic ? 'الرصيد المستحق' : 'Entitled Days', key: 'entitled', width: 10 },
    { header: isArabic ? 'الأيام المستخدمة' : 'Used Days', key: 'used', width: 10 },
    { header: isArabic ? 'الرصيد المتبقي' : 'Remaining Balance', key: 'remaining', width: 12 },
    { header: isArabic ? 'تاريخ السفر' : 'Travel Date', key: 'travel', width: 12 },
    { header: isArabic ? 'وجهة السفر' : 'Destination', key: 'dest', width: 15 },
    { header: isArabic ? 'تاريخ العودة المتوقع' : 'Expected Return', key: 'expReturn', width: 12 },
    { header: isArabic ? 'تاريخ العودة الفعلي' : 'Actual Return', key: 'actReturn', width: 12 },
    { header: isArabic ? 'الحالة' : 'Status', key: 'status', width: 15 },
    { header: isArabic ? 'ملاحظات' : 'Notes', key: 'notes', width: 25 },
  ];
  styleHeaderRow(ws);

  records.forEach((rec, i) => {
    ws.addRow({
      num: i + 1, name: rec.employee_name, empId: rec.employee_id, title: rec.job_title,
      dept: rec.department, contract: getContractTypeLabel(rec.contract_type, isArabic),
      hire: rec.hire_date, lastLeave: rec.last_leave_end || '-', nextLeave: rec.next_leave_due || '-',
      entitled: rec.entitled_days, used: rec.used_days, remaining: rec.remaining_balance,
      travel: rec.travel_date || '-', dest: rec.travel_destination || '-',
      expReturn: rec.expected_return_date || '-', actReturn: rec.actual_return_date || '-',
      status: getStatusLabel(rec, isArabic), notes: rec.notes || '-',
    });
  });

  const timestamp = new Date().toISOString().split('T')[0];
  const fullFileName = `${fileName}_${timestamp}.xlsx`;
  await downloadBuffer(wb, fullFileName);
  return fullFileName;
};

export const exportUpcomingLeavesReport = async (
  records: LeaveTracking[],
  language: string = 'ar',
  fileName: string = 'upcoming_leaves'
) => {
  const isArabic = language === 'ar';
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(isArabic ? 'الإجازات القادمة' : 'Upcoming Leaves');
  ws.columns = [
    { header: '#', key: 'num', width: 5 },
    { header: isArabic ? 'اسم الموظف' : 'Employee Name', key: 'name', width: 25 },
    { header: isArabic ? 'الرقم الوظيفي' : 'Employee ID', key: 'empId', width: 15 },
    { header: isArabic ? 'الإدارة' : 'Department', key: 'dept', width: 18 },
    { header: isArabic ? 'نوع العقد' : 'Contract Type', key: 'contract', width: 12 },
    { header: isArabic ? 'تاريخ الإجازة القادمة' : 'Next Leave Due', key: 'nextLeave', width: 15 },
    { header: isArabic ? 'الرصيد المتبقي' : 'Remaining Balance', key: 'remaining', width: 12 },
  ];
  styleHeaderRow(ws);

  records.forEach((rec, i) => {
    ws.addRow({
      num: i + 1, name: rec.employee_name, empId: rec.employee_id, dept: rec.department,
      contract: getContractTypeLabel(rec.contract_type, isArabic),
      nextLeave: rec.next_leave_due || '-', remaining: rec.remaining_balance,
    });
  });

  const timestamp = new Date().toISOString().split('T')[0];
  const fullFileName = `${fileName}_${timestamp}.xlsx`;
  await downloadBuffer(wb, fullFileName);
  return fullFileName;
};

export const exportOverdueReturnsReport = async (
  records: LeaveTracking[],
  language: string = 'ar',
  fileName: string = 'overdue_returns'
) => {
  const isArabic = language === 'ar';
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(isArabic ? 'المتأخرين عن العودة' : 'Overdue Returns');
  ws.columns = [
    { header: '#', key: 'num', width: 5 },
    { header: isArabic ? 'اسم الموظف' : 'Employee Name', key: 'name', width: 25 },
    { header: isArabic ? 'الرقم الوظيفي' : 'Employee ID', key: 'empId', width: 15 },
    { header: isArabic ? 'الإدارة' : 'Department', key: 'dept', width: 18 },
    { header: isArabic ? 'تاريخ السفر' : 'Travel Date', key: 'travel', width: 12 },
    { header: isArabic ? 'تاريخ العودة المتوقع' : 'Expected Return', key: 'expReturn', width: 15 },
    { header: isArabic ? 'وجهة السفر' : 'Destination', key: 'dest', width: 15 },
    { header: isArabic ? 'رقم التواصل' : 'Contact', key: 'contact', width: 15 },
  ];
  styleHeaderRow(ws);

  records.forEach((rec, i) => {
    ws.addRow({
      num: i + 1, name: rec.employee_name, empId: rec.employee_id, dept: rec.department,
      travel: rec.travel_date || '-', expReturn: rec.expected_return_date || '-',
      dest: rec.travel_destination || '-', contact: '-',
    });
  });

  const timestamp = new Date().toISOString().split('T')[0];
  const fullFileName = `${fileName}_${timestamp}.xlsx`;
  await downloadBuffer(wb, fullFileName);
  return fullFileName;
};
