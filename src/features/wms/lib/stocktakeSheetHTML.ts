import { esc } from './print';

export interface StocktakeSheetHeader {
  title: string;
  count_no: string;
  count_date: string;
  warehouse: string;
  status: string;
  notes?: string | null;
}

export interface StocktakeSheetLine {
  line_no: number;
  part_no: string;
  description: string;
  unit?: string;
  expected_qty: number;
  counted_qty: number | null;
  remarks?: string | null;
}

export interface StocktakeSheetLabels {
  brand: string;
  doc_no: string; date: string; warehouse: string; status: string; notes: string;
  line: string; part_no: string; description: string; unit: string;
  expected: string; counted: string; variance: string; remarks: string;
  signature_counted: string; signature_verified: string;
  totals_lines: string; totals_variance: string;
  printed_at: string;
}

export function buildStocktakeSheetHTML(
  h: StocktakeSheetHeader,
  lines: StocktakeSheetLine[],
  labels: StocktakeSheetLabels,
  language: 'ar' | 'en',
): string {
  const dir = language === 'ar' ? 'rtl' : 'ltr';
  const fontStack = language === 'ar'
    ? `'Segoe UI Arabic','Segoe UI',Tahoma,Arial,sans-serif`
    : `'Inter','Segoe UI',system-ui,sans-serif`;
  const printedAt = new Date().toLocaleString('en-GB');
  const fmtDate = (s: string) => { try { return new Date(s).toLocaleDateString('en-GB'); } catch { return s; } };

  const totalVariance = lines.reduce((s, l) => s + ((l.counted_qty ?? 0) - l.expected_qty), 0);

  const rows = lines.map((l) => {
    const variance = (l.counted_qty ?? 0) - l.expected_qty;
    const cls = variance === 0 ? '' : variance > 0 ? 'pos' : 'neg';
    return `<tr>
      <td class="num">${esc(l.line_no)}</td>
      <td class="mono">${esc(l.part_no)}</td>
      <td>${esc(l.description)}</td>
      <td class="num">${esc(l.unit ?? '—')}</td>
      <td class="num">${esc(l.expected_qty)}</td>
      <td class="num">${l.counted_qty == null ? '____' : esc(l.counted_qty)}</td>
      <td class="num ${cls}">${l.counted_qty == null ? '' : esc(variance)}</td>
      <td>${esc(l.remarks ?? '')}</td>
    </tr>`;
  }).join('');

  return `<!doctype html>
<html lang="${language}" dir="${dir}">
<head>
<meta charset="utf-8" />
<title>${esc(h.title)} — ${esc(h.count_no)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:${fontStack};color:#111;margin:0;padding:14mm;font-size:10pt}
  .brand{display:flex;justify-content:space-between;align-items:flex-end;
    border-bottom:2px solid #1A1F2C;padding-bottom:3mm;margin-bottom:5mm}
  .b-name{font-weight:700;font-size:13pt;color:#1A1F2C}
  h1{margin:0 0 1mm;font-size:16pt;color:#1A1F2C}
  .doc-no{font-family:ui-monospace,Menlo,monospace;font-size:11pt;color:#0d4ed8}
  .meta{display:grid;grid-template-columns:repeat(4,1fr);gap:2mm 4mm;margin-bottom:4mm}
  .meta .k{color:#666;font-size:8pt;text-transform:uppercase;letter-spacing:.5px}
  .meta .v{font-weight:600;color:#111;margin-top:.5mm;font-size:10pt}
  table{width:100%;border-collapse:collapse;font-size:9pt;margin-bottom:4mm}
  thead th{background:#1A1F2C;color:#FFD700;text-align:start;padding:2.5mm;
    font-size:8.5pt;text-transform:uppercase;letter-spacing:.4px}
  tbody td{padding:2mm;border-bottom:1px solid #ddd;vertical-align:middle}
  tbody tr:nth-child(even) td{background:#fafafa}
  .num{text-align:center;font-family:ui-monospace,Menlo,monospace}
  .mono{font-family:ui-monospace,Menlo,monospace;color:#0d4ed8}
  .pos{color:#15803d;font-weight:600}
  .neg{color:#b91c1c;font-weight:600}
  .totals{display:flex;justify-content:space-between;gap:6mm;
    background:#f5f5f5;border:1px solid #ddd;padding:3mm;border-radius:2mm;margin-bottom:5mm}
  .totals span{font-size:9pt;color:#333}
  .totals b{font-family:ui-monospace,Menlo,monospace;color:#1A1F2C}
  .notes-block{border:1px solid #ccc;border-radius:2mm;padding:3mm;font-size:9pt;color:#333;min-height:12mm;margin-bottom:6mm}
  .sig{display:grid;grid-template-columns:1fr 1fr;gap:10mm;margin-top:10mm}
  .sig .box{border-top:1px solid #333;padding-top:2mm;text-align:center;font-size:9pt;color:#555}
  .footer{margin-top:6mm;font-size:8pt;color:#888;text-align:center}
  @page{size:A4;margin:0}
</style>
</head>
<body>
  <div class="brand">
    <div><h1>${esc(h.title)}</h1><div class="doc-no">${esc(labels.doc_no)}: ${esc(h.count_no)}</div></div>
    <div class="b-name">${esc(labels.brand)}</div>
  </div>
  <div class="meta">
    <div><div class="k">${esc(labels.date)}</div><div class="v">${esc(fmtDate(h.count_date))}</div></div>
    <div><div class="k">${esc(labels.warehouse)}</div><div class="v">${esc(h.warehouse)}</div></div>
    <div><div class="k">${esc(labels.status)}</div><div class="v">${esc(h.status)}</div></div>
    <div><div class="k">${esc(labels.totals_lines)}</div><div class="v">${esc(lines.length)}</div></div>
  </div>
  <table>
    <thead><tr>
      <th style="width:6%">${esc(labels.line)}</th>
      <th style="width:14%">${esc(labels.part_no)}</th>
      <th>${esc(labels.description)}</th>
      <th style="width:8%">${esc(labels.unit)}</th>
      <th style="width:10%">${esc(labels.expected)}</th>
      <th style="width:10%">${esc(labels.counted)}</th>
      <th style="width:10%">${esc(labels.variance)}</th>
      <th style="width:18%">${esc(labels.remarks)}</th>
    </tr></thead>
    <tbody>${rows || `<tr><td colspan="8" style="text-align:center;color:#999;padding:8mm">—</td></tr>`}</tbody>
  </table>
  <div class="totals">
    <span>${esc(labels.totals_lines)}: <b>${esc(lines.length)}</b></span>
    <span>${esc(labels.totals_variance)}: <b class="${totalVariance === 0 ? '' : totalVariance > 0 ? 'pos' : 'neg'}">${esc(totalVariance)}</b></span>
  </div>
  ${h.notes ? `<div class="notes-block"><strong>${esc(labels.notes)}:</strong> ${esc(h.notes)}</div>` : ''}
  <div class="sig">
    <div class="box">${esc(labels.signature_counted)}</div>
    <div class="box">${esc(labels.signature_verified)}</div>
  </div>
  <div class="footer">${esc(labels.printed_at)}: ${esc(printedAt)}</div>
</body></html>`;
}