import ExcelJS from 'exceljs';

function formatDate(d: string | null | undefined): string {
  if (!d) return '';
  const date = new Date(d);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

const NAVY = 'FF1A1F2C';
const GOLD = 'FFFFD700';
const SOFT_GRAY = 'FFF7F7F7';

async function downloadWb(wb: ExcelJS.Workbook, fileName: string) {
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function styleHeader(ws: ExcelJS.Worksheet, rowNum: number) {
  const row = ws.getRow(rowNum);
  row.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  row.alignment = { horizontal: 'center', vertical: 'middle' };
  row.height = 28;
}

/* ===== 1. Stock Report (Item × Warehouse pivot) ===== */
export interface StockRow {
  part_no: string;
  description: string;
  unit: string;
  warehouse_code: string;
  warehouse_name: string;
  location_code: string | null;
  qty: number;
  min_qty: number | null;
}

export async function exportStockReport(rows: StockRow[], language: 'ar' | 'en' = 'ar') {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'DTS-Store WMS';
  wb.created = new Date();
  const ws = wb.addWorksheet(language === 'ar' ? 'تقرير المخزون' : 'Stock Report', {
    views: [{ rightToLeft: language === 'ar' }],
  });

  const headers = language === 'ar'
    ? ['#', 'رقم القطعة', 'الوصف', 'الوحدة', 'كود المخزن', 'المخزن', 'الموقع', 'الكمية', 'الحد الأدنى', 'الحالة']
    : ['#', 'Part No', 'Description', 'Unit', 'WH Code', 'Warehouse', 'Location', 'Qty', 'Min', 'Status'];
  ws.addRow(headers);
  styleHeader(ws, 1);

  rows.forEach((r, i) => {
    const low = r.min_qty != null && r.min_qty > 0 && r.qty < r.min_qty;
    const row = ws.addRow([
      i + 1, r.part_no, r.description, r.unit,
      r.warehouse_code, r.warehouse_name, r.location_code ?? '',
      r.qty, r.min_qty ?? '',
      low ? (language === 'ar' ? 'نقص' : 'Low') : (language === 'ar' ? 'سليم' : 'OK'),
    ]);
    if (low) {
      row.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } }; });
    } else if (i % 2 === 1) {
      row.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SOFT_GRAY } }; });
    }
  });

  ws.columns = [
    { width: 6 }, { width: 18 }, { width: 36 }, { width: 8 },
    { width: 12 }, { width: 22 }, { width: 16 }, { width: 12 }, { width: 10 }, { width: 10 },
  ];

  await downloadWb(wb, `stock-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/* ===== 2. Custody Report (per Employee/Party) ===== */
export interface CustodyRow {
  party_type: string;
  party_name: string;
  party_ref: string | null;
  part_no: string;
  description: string;
  qty: number;
  last_movement_at: string | null;
}

export async function exportCustodyReport(rows: CustodyRow[], language: 'ar' | 'en' = 'ar') {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(language === 'ar' ? 'تقرير العُهد' : 'Custody Report', {
    views: [{ rightToLeft: language === 'ar' }],
  });
  const headers = language === 'ar'
    ? ['#', 'نوع الجهة', 'اسم الجهة', 'المرجع', 'رقم القطعة', 'الوصف', 'الكمية', 'آخر حركة']
    : ['#', 'Party Type', 'Party Name', 'Ref', 'Part No', 'Description', 'Qty', 'Last Movement'];
  ws.addRow(headers);
  styleHeader(ws, 1);

  rows.forEach((r, i) => {
    const row = ws.addRow([
      i + 1, r.party_type, r.party_name, r.party_ref ?? '',
      r.part_no, r.description, r.qty, formatDate(r.last_movement_at),
    ]);
    if (i % 2 === 1) row.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SOFT_GRAY } }; });
  });

  ws.columns = [
    { width: 6 }, { width: 14 }, { width: 26 }, { width: 14 },
    { width: 18 }, { width: 36 }, { width: 10 }, { width: 14 },
  ];

  await downloadWb(wb, `custody-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/* ===== 3. Movements Report ===== */
export interface MovementRow {
  txn_no: string;
  txn_type: string;
  txn_date: string;
  status: string;
  declaration_id: string | null;
  from_warehouse: string;
  to_warehouse: string;
  party_name: string;
  notes: string;
}

export async function exportMovementsReport(rows: MovementRow[], language: 'ar' | 'en' = 'ar') {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(language === 'ar' ? 'الحركات' : 'Movements', {
    views: [{ rightToLeft: language === 'ar' }],
  });
  const TYPE_AR: Record<string, string> = { in: 'دخول', out: 'خروج', transfer: 'نقل', return: 'إرجاع' };
  const headers = language === 'ar'
    ? ['#', 'الرقم', 'النوع', 'التاريخ', 'الحالة', 'رقم الإقرار', 'من مخزن', 'إلى مخزن', 'الجهة', 'ملاحظات']
    : ['#', 'No.', 'Type', 'Date', 'Status', 'Declaration', 'From', 'To', 'Party', 'Notes'];
  ws.addRow(headers);
  styleHeader(ws, 1);

  rows.forEach((r, i) => {
    const row = ws.addRow([
      i + 1, r.txn_no,
      language === 'ar' ? (TYPE_AR[r.txn_type] ?? r.txn_type) : r.txn_type.toUpperCase(),
      formatDate(r.txn_date), r.status, r.declaration_id ?? '',
      r.from_warehouse, r.to_warehouse, r.party_name, r.notes,
    ]);
    if (i % 2 === 1) row.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SOFT_GRAY } }; });
  });

  ws.columns = [
    { width: 6 }, { width: 18 }, { width: 10 }, { width: 12 }, { width: 12 },
    { width: 18 }, { width: 20 }, { width: 20 }, { width: 22 }, { width: 30 },
  ];

  await downloadWb(wb, `movements-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/* ===== 4. Low Stock Report ===== */
export interface LowStockRow {
  part_no: string;
  description: string;
  total_qty: number;
  min_qty: number;
}

export async function exportLowStockReport(rows: LowStockRow[], language: 'ar' | 'en' = 'ar') {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(language === 'ar' ? 'نقص المخزون' : 'Low Stock', {
    views: [{ rightToLeft: language === 'ar' }],
  });
  const headers = language === 'ar'
    ? ['#', 'رقم القطعة', 'الوصف', 'الكمية الحالية', 'الحد الأدنى', 'النقص']
    : ['#', 'Part No', 'Description', 'Current Qty', 'Min Qty', 'Shortage'];
  ws.addRow(headers);
  styleHeader(ws, 1);

  rows.forEach((r, i) => {
    const row = ws.addRow([
      i + 1, r.part_no, r.description, r.total_qty, r.min_qty, r.min_qty - r.total_qty,
    ]);
    row.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } }; });
  });

  ws.columns = [
    { width: 6 }, { width: 18 }, { width: 36 }, { width: 14 }, { width: 12 }, { width: 12 },
  ];

  await downloadWb(wb, `low-stock-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
}