import ExcelJS from 'exceljs';

export interface ExcelColumn { header: string; key: string; width?: number; }

export async function exportWmsExcel(
  filename: string,
  sheetName: string,
  columns: ExcelColumn[],
  rows: Record<string, unknown>[],
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'WMS';
  const ws = wb.addWorksheet(sheetName, { views: [{ rightToLeft: false }] });
  ws.columns = columns.map(c => ({ header: c.header, key: c.key, width: c.width ?? 18 }));

  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFD700' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1F2C' } };
  header.alignment = { horizontal: 'center', vertical: 'middle' };
  header.height = 22;

  rows.forEach(r => ws.addRow(r));
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      };
    });
  });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** Build a printable A4 HTML document from rows. Used with wmsPrintHTML. */
export function buildReportHTML(opts: {
  title: string;
  subtitle?: string;
  brand: string;
  printedAtLabel: string;
  language: 'ar' | 'en';
  columns: ExcelColumn[];
  rows: Record<string, unknown>[];
}): string {
  const dir = opts.language === 'ar' ? 'rtl' : 'ltr';
  const fontStack = opts.language === 'ar'
    ? `'Segoe UI Arabic','Segoe UI',Tahoma,Arial,sans-serif`
    : `'Inter','Segoe UI',system-ui,sans-serif`;
  const printedAt = new Date().toLocaleString('en-GB');
  const escHtml = (v: unknown) => v == null ? '' : String(v).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

  const ths = opts.columns.map(c => `<th>${escHtml(c.header)}</th>`).join('');
  const trs = opts.rows.map(r => `<tr>${opts.columns.map(c => `<td>${escHtml(r[c.key])}</td>`).join('')}</tr>`).join('');

  return `<!doctype html>
<html lang="${opts.language}" dir="${dir}">
<head><meta charset="utf-8"/><title>${escHtml(opts.title)}</title>
<style>
  body{font-family:${fontStack};margin:0;padding:14mm;color:#111;font-size:10pt}
  .brand{display:flex;justify-content:space-between;align-items:end;
    border-bottom:2px solid #1A1F2C;padding-bottom:3mm;margin-bottom:5mm}
  .b-name{font-weight:700;font-size:13pt;color:#1A1F2C}
  h1{margin:0 0 1mm;font-size:16pt;color:#1A1F2C}
  .sub{color:#666;font-size:9pt}
  table{width:100%;border-collapse:collapse;font-size:9pt}
  thead th{background:#1A1F2C;color:#FFD700;text-align:start;padding:2.5mm;
    font-size:8.5pt;text-transform:uppercase;letter-spacing:.4px}
  tbody td{padding:2mm;border-bottom:1px solid #ddd}
  tbody tr:nth-child(even) td{background:#fafafa}
  .footer{margin-top:6mm;font-size:8pt;color:#888;text-align:center}
  @page{size:A4 landscape;margin:0}
</style></head>
<body>
  <div class="brand">
    <div><h1>${escHtml(opts.title)}</h1>${opts.subtitle ? `<div class="sub">${escHtml(opts.subtitle)}</div>` : ''}</div>
    <div class="b-name">${escHtml(opts.brand)}</div>
  </div>
  <table><thead><tr>${ths}</tr></thead><tbody>${trs || `<tr><td colspan="${opts.columns.length}" style="text-align:center;color:#999;padding:8mm">—</td></tr>`}</tbody></table>
  <div class="footer">${escHtml(opts.printedAtLabel)}: ${escHtml(printedAt)}</div>
</body></html>`;
}