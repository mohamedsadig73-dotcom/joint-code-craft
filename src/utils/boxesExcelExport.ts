import ExcelJS from 'exceljs';
import type { BoxReceipt } from '@/hooks/useBoxReceipts';
import type { BoxSummaryRow } from '@/hooks/useBoxSummary';

const DEST_LABELS: Record<string, { ar: string; en: string; color: string }> = {
  morocco: { ar: 'المغرب', en: 'Morocco', color: 'FFFCE4D6' },
  uzbekistan: { ar: 'أوزبكستان', en: 'Uzbekistan', color: 'FFE2EFDA' },
  unspecified: { ar: 'غير محدد', en: 'Unspecified', color: 'FFF2F2F2' },
};

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  received: { ar: 'مستلم', en: 'Received' },
  sorted: { ar: 'مفروز', en: 'Sorted' },
  packed: { ar: 'معبأ', en: 'Packed' },
  shipped: { ar: 'مشحون', en: 'Shipped' },
};

function formatDate(d: string): string {
  if (!d) return '';
  const date = new Date(d);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

export async function exportBoxesToExcel(
  receipts: BoxReceipt[],
  summary: BoxSummaryRow[],
  language: 'ar' | 'en' = 'ar'
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'DTS-Store';
  wb.created = new Date();

  // ===== Sheet 1: Receipts =====
  const ws1 = wb.addWorksheet(language === 'ar' ? 'سجل الاستلام' : 'Receipts', {
    views: [{ rightToLeft: language === 'ar' }],
  });

  const headers = language === 'ar'
    ? ['#', 'المورد', 'رقم القطعة', 'الوصف', 'الكمية', 'الوحدة', 'الوجهة', 'المكان', 'رقم الصندوق', 'التاريخ', 'الحالة', 'ملاحظات']
    : ['#', 'Supplier', 'Part No', 'Description', 'QTY', 'Unit', 'Destination', 'Place', 'Box No', 'Date', 'Status', 'Notes'];

  ws1.addRow(headers);
  const headerRow = ws1.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B3A6B' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 28;

  receipts.forEach((r, i) => {
    const row = ws1.addRow([
      i + 1,
      r.supplier,
      r.part_no,
      r.description,
      r.qty,
      r.unit,
      DEST_LABELS[r.destination]?.[language] ?? r.destination,
      r.place ?? '',
      r.box_no,
      formatDate(r.receipt_date),
      STATUS_LABELS[r.status]?.[language] ?? r.status,
      r.notes ?? '',
    ]);
    const fill = DEST_LABELS[r.destination]?.color;
    if (fill) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
      });
    }
    row.alignment = { vertical: 'middle' };
  });

  ws1.columns = [
    { width: 6 }, { width: 22 }, { width: 18 }, { width: 36 }, { width: 10 },
    { width: 8 }, { width: 14 }, { width: 22 }, { width: 12 }, { width: 14 },
    { width: 12 }, { width: 22 },
  ];

  // ===== Sheet 2: Summary =====
  const ws2 = wb.addWorksheet(language === 'ar' ? 'ملخص الصناديق' : 'Box Summary', {
    views: [{ rightToLeft: language === 'ar' }],
  });

  const sumHeaders = language === 'ar'
    ? ['رقم الصندوق', 'الموردون', 'الوجهة', 'عدد الأصناف', 'إجمالي الكمية', 'التاريخ']
    : ['Box No', 'Suppliers', 'Destination', 'Items', 'Total QTY', 'Date'];

  ws2.addRow(sumHeaders);
  const sh = ws2.getRow(1);
  sh.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  sh.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B3A6B' } };
  sh.alignment = { horizontal: 'center', vertical: 'middle' };
  sh.height = 28;

  summary.forEach((s) => {
    const row = ws2.addRow([
      s.box_no,
      s.suppliers,
      DEST_LABELS[s.destination]?.[language] ?? s.destination,
      s.items_count,
      s.total_qty,
      formatDate(s.first_date),
    ]);
    const fill = DEST_LABELS[s.destination]?.color;
    if (fill) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
      });
    }
  });

  ws2.columns = [
    { width: 14 }, { width: 36 }, { width: 14 }, { width: 14 }, { width: 16 }, { width: 14 },
  ];

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const today = new Date().toISOString().slice(0, 10);
  const filename = `boxes_${today}.xlsx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function parseReceiptsFromExcel(file: File): Promise<Array<Record<string, unknown>>> {
  const wb = new ExcelJS.Workbook();
  const buf = await file.arrayBuffer();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const rows: Array<Record<string, unknown>> = [];
  const headers: string[] = [];
  ws.getRow(1).eachCell((cell, col) => {
    headers[col - 1] = String(cell.value ?? '').trim().toLowerCase();
  });

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (row.cellCount === 0) continue;
    const obj: Record<string, unknown> = {};
    row.eachCell((cell, col) => {
      const key = headers[col - 1];
      if (key) obj[key] = cell.value;
    });
    if (Object.keys(obj).length > 0) rows.push(obj);
  }
  return rows;
}