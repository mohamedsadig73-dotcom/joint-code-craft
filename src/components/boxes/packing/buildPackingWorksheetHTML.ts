import type { BoxReceipt } from '@/hooks/useBoxReceipts';

export interface PackingWorksheetLabels {
  title: string;
  date: string;
  totalItems: string;
  responsible: string;
  signature: string;
  page: string;
  of: string;
  num: string;
  partNo: string;
  description: string;
  qty: string;
  unit: string;
  supplier: string;
  destination: string;
  boxNo: string;
  notes: string;
  dest_morocco: string;
  dest_uzbekistan: string;
  dest_unspecified: string;
}

export interface PackingWorksheetOptions {
  isAr: boolean;
  groupByDestination: boolean;
  labels: PackingWorksheetLabels;
}

const esc = (v: string | number | null | undefined) => {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};

const todayDDMMYYYY = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

function renderTable(rows: BoxReceipt[], startIdx: number, opts: PackingWorksheetOptions): string {
  const { labels, isAr } = opts;
  const destLabel = (d: string) => labels[`dest_${d}` as keyof PackingWorksheetLabels] as string;
  const body = rows.map((r, i) => {
    const n = startIdx + i + 1;
    return `
      <tr>
        <td class="num">${n}</td>
        <td class="mono">${esc(r.part_no)}</td>
        <td class="desc">${esc(r.description)}</td>
        <td class="num">${r.qty.toLocaleString('en-US')}</td>
        <td class="num">${esc(r.unit)}</td>
        <td class="supplier">${esc(r.supplier)}</td>
        <td class="dest">${esc(destLabel(r.destination))}</td>
        <td class="box-cell"></td>
      </tr>`;
  }).join('');

  return `
    <table class="sheet">
      <thead>
        <tr>
          <th style="width:28px">${esc(labels.num)}</th>
          <th style="width:90px">${esc(labels.partNo)}</th>
          <th>${esc(labels.description)}</th>
          <th style="width:42px">${esc(labels.qty)}</th>
          <th style="width:40px">${esc(labels.unit)}</th>
          <th style="width:140px">${esc(labels.supplier)}</th>
          <th style="width:70px">${esc(labels.destination)}</th>
          <th style="width:90px" class="box-head">${esc(labels.boxNo)}</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>`;
}

export function buildPackingWorksheetHTML(
  receipts: BoxReceipt[],
  opts: PackingWorksheetOptions,
): string {
  const { isAr, labels, groupByDestination } = opts;
  const dir = isAr ? 'rtl' : 'ltr';
  const lang = isAr ? 'ar' : 'en';
  const fontFamily = isAr
    ? `'Segoe UI Arabic','Segoe UI',Tahoma,sans-serif`
    : `'Inter','Segoe UI',Tahoma,sans-serif`;

  const dateStr = todayDDMMYYYY();
  const total = receipts.length;

  // Group rows by destination (Morocco first), then by supplier within destination
  let sections = '';
  if (groupByDestination) {
    const order = ['morocco', 'uzbekistan', 'unspecified'] as const;
    const grouped = new Map<string, BoxReceipt[]>();
    receipts.forEach((r) => {
      const arr = grouped.get(r.destination) ?? [];
      arr.push(r);
      grouped.set(r.destination, arr);
    });
    let runningIdx = 0;
    for (const dest of order) {
      const list = grouped.get(dest);
      if (!list || list.length === 0) continue;
      list.sort((a, b) => a.supplier.localeCompare(b.supplier) || a.part_no.localeCompare(b.part_no));
      const destLabel = labels[`dest_${dest}` as keyof PackingWorksheetLabels] as string;
      sections += `
        <div class="dest-block">
          <div class="dest-bar">
            <span class="dest-name">${esc(destLabel)}</span>
            <span class="dest-count">${list.length.toLocaleString('en-US')}</span>
          </div>
          ${renderTable(list, runningIdx, opts)}
        </div>`;
      runningIdx += list.length;
    }
  } else {
    const sorted = [...receipts].sort(
      (a, b) => a.supplier.localeCompare(b.supplier) || a.part_no.localeCompare(b.part_no),
    );
    sections = renderTable(sorted, 0, opts);
  }

  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8" />
<title>${esc(labels.title)} — ${dateStr}</title>
<style>
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; }
  html, body { margin:0; padding:0; font-family: ${fontFamily}; color:#0f172a; background:#fff; }
  body { font-size: 11px; }
  .header { display:flex; align-items:flex-end; justify-content:space-between; border-bottom:2px solid #0f172a; padding-bottom:6px; margin-bottom:8px; }
  .header h1 { font-size:16px; margin:0 0 2px 0; }
  .header .meta { font-size:10px; color:#475569; }
  .meta-grid { display:flex; gap:18px; font-size:10px; margin-bottom:8px; color:#1e293b; }
  .meta-grid b { color:#0f172a; }
  .sign-row { display:flex; gap:24px; margin-bottom:10px; font-size:10px; }
  .sign-row .field { flex:1; border-bottom:1px dashed #94a3b8; padding:2px 4px; min-height:22px; }
  .sign-row label { display:block; font-size:9px; color:#64748b; margin-bottom:2px; }
  .dest-block { margin-bottom:10px; page-break-inside: avoid; }
  .dest-bar { display:flex; align-items:center; justify-content:space-between; background:#0f172a; color:#fff; padding:3px 8px; font-size:11px; font-weight:bold; border-radius:3px 3px 0 0; }
  .dest-count { background:#fff; color:#0f172a; padding:0 6px; border-radius:8px; font-size:10px; }
  table.sheet { width:100%; border-collapse: collapse; table-layout: fixed; }
  table.sheet th, table.sheet td { border:1px solid #94a3b8; padding:3px 4px; vertical-align: middle; }
  table.sheet th { background:#e2e8f0; font-size:10px; text-align:center; }
  table.sheet td.num { text-align:center; font-variant-numeric: tabular-nums; font-weight:600; }
  table.sheet td.mono { font-family: 'Consolas','Courier New',monospace; font-size:10px; font-weight:bold; word-break: break-all; }
  table.sheet td.desc { font-size:10.5px; }
  table.sheet td.supplier { font-size:9.5px; color:#334155; }
  table.sheet td.dest { text-align:center; font-size:9.5px; }
  table.sheet th.box-head { background:#fef3c7; color:#92400e; }
  table.sheet td.box-cell { background:#fffbeb; height:22px; }
  tbody tr { page-break-inside: avoid; }
  thead { display: table-header-group; }
  .footer { margin-top:10px; display:flex; gap:24px; font-size:10px; }
  .footer .field { flex:1; border-top:1px solid #0f172a; padding-top:4px; text-align:center; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${esc(labels.title)}</h1>
      <div class="meta">${esc(labels.date)}: <b>${dateStr}</b> &nbsp;•&nbsp; ${esc(labels.totalItems)}: <b>${total.toLocaleString('en-US')}</b></div>
    </div>
  </div>
  <div class="sign-row">
    <div>
      <label>${esc(labels.responsible)}</label>
      <div class="field">&nbsp;</div>
    </div>
    <div>
      <label>${esc(labels.signature)}</label>
      <div class="field">&nbsp;</div>
    </div>
    <div>
      <label>${esc(labels.date)}</label>
      <div class="field">&nbsp;</div>
    </div>
  </div>
  ${sections}
</body>
</html>`;
}