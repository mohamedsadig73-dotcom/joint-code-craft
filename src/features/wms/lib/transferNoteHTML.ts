import { esc } from './print';

export interface TransferNoteHeader {
  title: string;
  txn_no: string;
  txn_date: string;
  reference?: string | null;
  status?: string | null;
  notes?: string | null;
  from_warehouse?: string | null;
  to_warehouse?: string | null;
  delivered_by?: string | null;
  received_by?: string | null;
}

export interface TransferNoteLine {
  line_no: number;
  part_no?: string;
  description?: string;
  qty: number;
  unit?: string;
  notes?: string | null;
}

export interface TransferNoteLabels {
  brand: string; doc_no: string; date: string; reference: string;
  status: string; from: string; to: string; notes: string;
  line: string; part_no: string; description: string; qty: string; unit: string;
  signature_sender: string; signature_receiver: string;
  printed_at: string;
  delivered_by_label?: string;
  received_by_label?: string;
  date_label?: string;
}

/**
 * Dedicated dual-signature transfer note (A4).
 * Two boxed signature panels: source warehouse keeper + destination warehouse keeper.
 */
export function buildTransferNoteHTML(
  h: TransferNoteHeader, lines: TransferNoteLine[],
  labels: TransferNoteLabels, language: 'ar' | 'en',
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

  const sigBox = (title: string, who: string | null | undefined) => `
    <div class="sig-box">
      <div class="sig-title">${esc(title)}</div>
      <div class="sig-row"><span class="sig-k">${esc(labels.delivered_by_label ?? labels.received_by_label ?? '')}</span><span class="sig-v">${esc(who ?? '')}</span></div>
      <div class="sig-row"><span class="sig-k">${esc(labels.date_label ?? labels.date)}</span><span class="sig-v">${esc(fmtDate(h.txn_date))}</span></div>
      <div class="sig-line"></div>
    </div>`;

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
  .wh-strip{display:grid;grid-template-columns:1fr auto 1fr;gap:6mm;align-items:center;
    background:#fafafa;border:1px solid #1A1F2C;border-radius:4px;padding:4mm;margin-bottom:6mm}
  .wh-cell{font-size:11pt;color:#1A1F2C}
  .wh-cell .k{font-size:9pt;color:#666;text-transform:uppercase;letter-spacing:.5px;margin-bottom:1mm}
  .wh-cell .v{font-weight:700;font-size:13pt}
  .wh-arrow{font-size:18pt;color:#FFD700;font-weight:700}
  table{width:100%;border-collapse:collapse;margin-bottom:6mm;font-size:10pt}
  thead th{background:#1A1F2C;color:#FFD700;text-align:start;padding:3mm 2mm;font-size:9pt;text-transform:uppercase;letter-spacing:.5px}
  tbody td{padding:2.5mm;border-bottom:1px solid #ddd;vertical-align:top}
  .num{text-align:center;font-family:ui-monospace,Menlo,monospace}
  .mono{font-family:ui-monospace,Menlo,monospace;color:#0d4ed8}
  .notes-block{border:1px solid #ccc;border-radius:3px;padding:3mm;margin:4mm 0;font-size:10pt;color:#333;min-height:14mm}
  .sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:8mm;margin-top:14mm}
  .sig-box{border:1px solid #1A1F2C;border-radius:4px;padding:4mm;min-height:38mm;display:flex;flex-direction:column;gap:2mm}
  .sig-title{font-weight:700;color:#1A1F2C;font-size:11pt;border-bottom:1px solid #ddd;padding-bottom:2mm;margin-bottom:2mm}
  .sig-row{display:flex;justify-content:space-between;font-size:9.5pt;color:#333}
  .sig-k{color:#666}
  .sig-v{font-weight:600}
  .sig-line{margin-top:auto;border-top:1px dashed #999;padding-top:1mm;text-align:center;font-size:8pt;color:#888}
  .sig-line::before{content:"—"}
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
    <div><div class="k">${esc(labels.reference)}</div><div class="v">${esc(h.reference ?? '—')}</div></div>
    <div><div class="k">${esc(labels.status)}</div><div class="v">${esc(h.status ?? '—')}</div></div>
  </div>
  <div class="wh-strip">
    <div class="wh-cell">
      <div class="k">${esc(labels.from)}</div>
      <div class="v">${esc(h.from_warehouse ?? '—')}</div>
    </div>
    <div class="wh-arrow">${dir === 'rtl' ? '←' : '→'}</div>
    <div class="wh-cell">
      <div class="k">${esc(labels.to)}</div>
      <div class="v">${esc(h.to_warehouse ?? '—')}</div>
    </div>
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
  <div class="sig-grid">
    ${sigBox(labels.signature_sender, h.delivered_by)}
    ${sigBox(labels.signature_receiver, h.received_by)}
  </div>
  <div class="footer">${esc(labels.printed_at)}: ${esc(printedAt)}</div>
</body></html>`;
}