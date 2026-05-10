import { esc } from './print';

export interface TxnDocHeader {
  title: string;
  txn_no: string;
  txn_date: string;
  party_name?: string | null;
  reference?: string | null;
  status?: string | null;
  notes?: string | null;
  from_warehouse?: string | null;
  to_warehouse?: string | null;
  recipient_name?: string | null;
  recipient_title?: string | null;
  recipient_empno?: string | null;
  receipt_time?: string | null;
  is_delegated?: boolean;
}

export interface TxnDocLine {
  line_no: number;
  part_no?: string;
  description?: string;
  qty: number;
  unit?: string;
  notes?: string | null;
}

export interface TxnDocLabels {
  brand: string; doc_no: string; date: string; party: string;
  reference: string; status: string; from: string; to: string; notes: string;
  line: string; part_no: string; description: string; qty: string; unit: string;
  signature: string; printed_at: string;
  recipient_info?: string;
  recipient_name?: string;
  recipient_title?: string;
  recipient_empno?: string;
  receipt_time?: string;
  delegation?: string;
}

export function buildTxnDocHTML(
  h: TxnDocHeader, lines: TxnDocLine[], labels: TxnDocLabels, language: 'ar' | 'en',
): string {
  const dir = language === 'ar' ? 'rtl' : 'ltr';
  const fontStack = language === 'ar'
    ? `'Segoe UI Arabic','Segoe UI',Tahoma,Arial,sans-serif`
    : `'Inter','Segoe UI',system-ui,sans-serif`;
  const printedAt = new Date().toLocaleString('en-GB');
  const fmtDate = (s: string) => { try { return new Date(s).toLocaleDateString('en-GB'); } catch { return s; } };

  const rows = lines.map((l) => `
    <tr>
      <td class="num">${esc(l.line_no)}</td>
      <td class="mono">${esc(l.part_no ?? '—')}</td>
      <td>${esc(l.description ?? '—')}</td>
      <td class="num">${esc(l.qty)}</td>
      <td>${esc(l.unit ?? '—')}</td>
      <td>${esc(l.notes ?? '')}</td>
    </tr>`).join('');

  return `<!doctype html>
<html lang="${language}" dir="${dir}">
<head>
<meta charset="utf-8" />
<title>${esc(h.title)} — ${esc(h.txn_no)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:${fontStack};color:#111;margin:0;padding:18mm 14mm;font-size:12pt}
  h1{font-size:20pt;margin:0 0 4mm;color:#1A1F2C}
  .brand{display:flex;justify-content:space-between;align-items:center;
    border-bottom:2px solid #1A1F2C;padding-bottom:4mm;margin-bottom:6mm}
  .brand .b-name{font-weight:700;font-size:14pt;color:#1A1F2C}
  .brand .b-doc{font-family:ui-monospace,Menlo,monospace;font-size:11pt;color:#555}
  .meta{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm 6mm;margin-bottom:6mm;font-size:10pt}
  .meta .k{color:#666;font-size:9pt;text-transform:uppercase;letter-spacing:.5px}
  .meta .v{font-weight:600;color:#111;margin-top:1mm}
  table{width:100%;border-collapse:collapse;margin-bottom:6mm;font-size:10pt}
  thead th{background:#1A1F2C;color:#FFD700;text-align:start;padding:3mm 2mm;font-size:9pt;text-transform:uppercase;letter-spacing:.5px}
  tbody td{padding:2.5mm;border-bottom:1px solid #ddd;vertical-align:top}
  .num{text-align:center;font-family:ui-monospace,Menlo,monospace}
  .mono{font-family:ui-monospace,Menlo,monospace;color:#0d4ed8}
  .notes-block{border:1px solid #ccc;border-radius:3px;padding:3mm;margin-top:4mm;font-size:10pt;color:#333;min-height:14mm}
  .sig{display:grid;grid-template-columns:1fr 1fr;gap:10mm;margin-top:14mm}
  .sig .box{border-top:1px solid #333;padding-top:2mm;text-align:center;font-size:9pt;color:#555}
  .footer{margin-top:8mm;font-size:8pt;color:#888;text-align:center}
  @page{size:A4;margin:0}
</style>
</head>
<body>
  <div class="brand">
    <div class="b-name">${esc(labels.brand)}</div>
    <div class="b-doc">${esc(labels.doc_no)}: ${esc(h.txn_no)}</div>
  </div>
  <h1>${esc(h.title)}</h1>
  <div class="meta">
    <div><div class="k">${esc(labels.date)}</div><div class="v">${esc(fmtDate(h.txn_date))}</div></div>
    <div><div class="k">${esc(labels.party)}</div><div class="v">${esc(h.party_name ?? '—')}</div></div>
    <div><div class="k">${esc(labels.reference)}</div><div class="v">${esc(h.reference ?? '—')}</div></div>
    <div><div class="k">${esc(labels.status)}</div><div class="v">${esc(h.status ?? '—')}</div></div>
    <div><div class="k">${esc(labels.from)}</div><div class="v">${esc(h.from_warehouse ?? '—')}</div></div>
    <div><div class="k">${esc(labels.to)}</div><div class="v">${esc(h.to_warehouse ?? '—')}</div></div>
  </div>
  <table>
    <thead><tr>
      <th style="width:8%">${esc(labels.line)}</th>
      <th style="width:18%">${esc(labels.part_no)}</th>
      <th>${esc(labels.description)}</th>
      <th style="width:10%">${esc(labels.qty)}</th>
      <th style="width:10%">${esc(labels.unit)}</th>
      <th style="width:22%">${esc(labels.notes)}</th>
    </tr></thead>
    <tbody>${rows || `<tr><td colspan="6" style="text-align:center;color:#999;padding:8mm">—</td></tr>`}</tbody>
  </table>
  ${h.notes ? `<div class="notes-block"><strong>${esc(labels.notes)}:</strong> ${esc(h.notes)}</div>` : ''}
  ${(h.recipient_name || h.recipient_title || h.recipient_empno || h.receipt_time || h.is_delegated) ? `
  <div class="notes-block">
    <strong>${esc(labels.recipient_info ?? 'Recipient')}:</strong>
    <div class="meta" style="margin-top:3mm">
      <div><div class="k">${esc(labels.recipient_name ?? 'Name')}</div><div class="v">${esc(h.recipient_name ?? '—')}</div></div>
      <div><div class="k">${esc(labels.recipient_title ?? 'Title')}</div><div class="v">${esc(h.recipient_title ?? '—')}</div></div>
      <div><div class="k">${esc(labels.recipient_empno ?? 'Emp #')}</div><div class="v">${esc(h.recipient_empno ?? '—')}</div></div>
      <div><div class="k">${esc(labels.receipt_time ?? 'Time')}</div><div class="v">${esc(h.receipt_time ?? '—')}</div></div>
      ${h.is_delegated ? `<div><div class="k">${esc(labels.delegation ?? 'Delegation')}</div><div class="v">✓</div></div>` : ''}
    </div>
  </div>` : ''}
  <div class="sig">
    <div class="box">${esc(labels.signature)} 1</div>
    <div class="box">${esc(labels.signature)} 2</div>
  </div>
  <div class="footer">${esc(labels.printed_at)}: ${esc(printedAt)}</div>
</body></html>`;
}