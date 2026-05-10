import { supabase } from '@/integrations/supabase/client';
import type { BoxReceipt } from '@/hooks/useBoxReceipts';

export interface InvoiceGroup {
  supplier: string;
  invoiceNumber: string | null; // null = "no invoice number"
  receipts: BoxReceipt[];
}

export interface InvoicePrintOptions {
  isAr: boolean;
  includeImages: boolean;
  showCoverPerSupplier: boolean; // when true and >1 invoice for a supplier, render cover page
  labels: {
    title: string;
    invoiceNo: string;
    date: string;
    supplier: string;
    destination: string;
    packing: string;
    image: string;
    partNo: string;
    description: string;
    qty: string;
    unit: string;
    boxNo: string;
    status: string;
    notes: string;
    totalItems: string;
    totalQty: string;
    distinctBoxes: string;
    receiverSig: string;
    supplierSig: string;
    warehouseSeal: string;
    page: string;
    of: string;
    coverTitle: string;
    invoicesCount: string;
    noInvoiceNumber: string;
    dest_morocco: string;
    dest_uzbekistan: string;
    dest_unspecified: string;
    pack_boxed: string;
    pack_loose: string;
    pack_mixed: string;
    status_received: string;
    status_sorted: string;
    status_packed: string;
    status_shipped: string;
    status_dispatched: string;
  };
}

function escapeHtml(s: string | number | null | undefined): string {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fmtDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/** Group receipts by (supplier, invoice_number). */
export function groupBySupplierInvoice(receipts: BoxReceipt[]): InvoiceGroup[] {
  const map = new Map<string, InvoiceGroup>();
  for (const r of receipts) {
    const inv = r.invoice_number?.trim() || null;
    const key = `${r.supplier}::${inv ?? '__NONE__'}`;
    let group = map.get(key);
    if (!group) {
      group = { supplier: r.supplier, invoiceNumber: inv, receipts: [] };
      map.set(key, group);
    }
    group.receipts.push(r);
  }
  // Sort by supplier then invoice number
  return Array.from(map.values()).sort((a, b) => {
    const s = a.supplier.localeCompare(b.supplier, 'ar');
    if (s !== 0) return s;
    return (a.invoiceNumber || '').localeCompare(b.invoiceNumber || '');
  });
}

function destLabel(d: BoxReceipt['destination'], lbls: InvoicePrintOptions['labels']): string {
  if (d === 'morocco') return lbls.dest_morocco;
  if (d === 'uzbekistan') return lbls.dest_uzbekistan;
  return lbls.dest_unspecified;
}
function statusLabel(s: BoxReceipt['status'], lbls: InvoicePrintOptions['labels']): string {
  return (lbls as unknown as Record<string, string>)[`status_${s}`] || s;
}

function renderInvoicePage(g: InvoiceGroup, opts: InvoicePrintOptions, pageIndex: number, totalPages: number): string {
  const { labels: L, isAr, includeImages } = opts;
  const totalQty = g.receipts.reduce((s, r) => s + (r.qty || 0), 0);
  const distinctBoxes = new Set(g.receipts.filter((r) => r.box_no).map((r) => r.box_no)).size;
  const packTypes = new Set(g.receipts.map((r) => r.packing_type));
  const packingDisplay = packTypes.size > 1 ? L.pack_mixed : (packTypes.has('boxed') ? L.pack_boxed : L.pack_loose);
  const destSet = new Set(g.receipts.map((r) => r.destination));
  const destDisplay = destSet.size > 1 ? '—' : destLabel(g.receipts[0].destination, L);
  const printDate = fmtDate(new Date().toISOString());

  const rows = g.receipts.map((r, i) => {
    const imgUrl = includeImages && r.image_path
      ? supabase.storage.from('box-images').getPublicUrl(r.image_path).data.publicUrl
      : null;
    return `<tr>
      <td class="num">${i + 1}</td>
      ${includeImages ? `<td class="img-cell">${imgUrl ? `<img src="${escapeHtml(imgUrl)}" loading="eager" alt="" />` : `<div class="no-img">—</div>`}</td>` : ''}
      <td class="mono">${escapeHtml(r.part_no)}</td>
      <td class="desc">${escapeHtml(r.description)}</td>
      <td class="num bold">${(r.qty || 0).toLocaleString('en-US')}</td>
      <td class="num small">${escapeHtml(r.unit)}</td>
      <td class="${r.box_no ? 'box-no' : 'muted'}">${escapeHtml(r.box_no || '—')}</td>
      <td class="num small">${fmtDate(r.receipt_date)}</td>
      <td class="small">${statusLabel(r.status, L)}</td>
    </tr>`;
  }).join('');

  return `<section class="invoice-page">
    <header class="inv-header">
      <div class="inv-title">
        <div class="brand">${escapeHtml(L.title)}</div>
        <div class="inv-no">${escapeHtml(L.invoiceNo)}: <strong>${escapeHtml(g.invoiceNumber || L.noInvoiceNumber)}</strong></div>
      </div>
      <div class="inv-meta">
        <div><span class="lbl">${escapeHtml(L.date)}:</span> ${printDate}</div>
        <div class="page-no">${escapeHtml(L.page)} ${pageIndex} ${escapeHtml(L.of)} ${totalPages}</div>
      </div>
    </header>

    <div class="party-box">
      <div><span class="lbl">${escapeHtml(L.supplier)}:</span> <strong>${escapeHtml(g.supplier)}</strong></div>
      <div class="party-row">
        <span><span class="lbl">${escapeHtml(L.destination)}:</span> ${escapeHtml(destDisplay)}</span>
        <span><span class="lbl">${escapeHtml(L.packing)}:</span> ${escapeHtml(packingDisplay)}</span>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:24px">#</th>
          ${includeImages ? `<th style="width:46px">${escapeHtml(L.image)}</th>` : ''}
          <th style="width:90px">${escapeHtml(L.partNo)}</th>
          <th>${escapeHtml(L.description)}</th>
          <th style="width:50px">${escapeHtml(L.qty)}</th>
          <th style="width:42px">${escapeHtml(L.unit)}</th>
          <th style="width:60px">${escapeHtml(L.boxNo)}</th>
          <th style="width:62px">${escapeHtml(L.date)}</th>
          <th style="width:70px">${escapeHtml(L.status)}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals">
      <div class="stat"><div class="v">${g.receipts.length.toLocaleString('en-US')}</div><div class="l">${escapeHtml(L.totalItems)}</div></div>
      <div class="stat"><div class="v">${totalQty.toLocaleString('en-US')}</div><div class="l">${escapeHtml(L.totalQty)}</div></div>
      <div class="stat"><div class="v">${distinctBoxes.toLocaleString('en-US')}</div><div class="l">${escapeHtml(L.distinctBoxes)}</div></div>
    </div>

    <div class="signatures">
      <div class="sig-box"><div class="sig-line"></div><div class="sig-label">${escapeHtml(L.receiverSig)}</div></div>
      <div class="sig-box"><div class="sig-line"></div><div class="sig-label">${escapeHtml(L.supplierSig)}</div></div>
      <div class="sig-box"><div class="sig-line"></div><div class="sig-label">${escapeHtml(L.warehouseSeal)}</div></div>
    </div>
  </section>`;
}

function renderCoverPage(supplier: string, groups: InvoiceGroup[], opts: InvoicePrintOptions): string {
  const { labels: L } = opts;
  const totalReceipts = groups.reduce((s, g) => s + g.receipts.length, 0);
  const totalQty = groups.reduce((s, g) => s + g.receipts.reduce((q, r) => q + (r.qty || 0), 0), 0);
  const printDate = fmtDate(new Date().toISOString());

  const list = groups.map((g, i) => {
    const qty = g.receipts.reduce((s, r) => s + (r.qty || 0), 0);
    return `<tr>
      <td class="num">${i + 1}</td>
      <td><strong>${escapeHtml(g.invoiceNumber || L.noInvoiceNumber)}</strong></td>
      <td class="num">${g.receipts.length}</td>
      <td class="num">${qty.toLocaleString('en-US')}</td>
    </tr>`;
  }).join('');

  return `<section class="invoice-page cover-page">
    <header class="inv-header">
      <div class="inv-title">
        <div class="brand">${escapeHtml(L.title)}</div>
        <div class="inv-no">${escapeHtml(L.coverTitle)}</div>
      </div>
      <div class="inv-meta">
        <div><span class="lbl">${escapeHtml(L.date)}:</span> ${printDate}</div>
      </div>
    </header>

    <div class="cover-supplier">
      <div class="lbl">${escapeHtml(L.supplier)}</div>
      <h2>${escapeHtml(supplier)}</h2>
    </div>

    <div class="totals cover-totals">
      <div class="stat"><div class="v">${groups.length.toLocaleString('en-US')}</div><div class="l">${escapeHtml(L.invoicesCount)}</div></div>
      <div class="stat"><div class="v">${totalReceipts.toLocaleString('en-US')}</div><div class="l">${escapeHtml(L.totalItems)}</div></div>
      <div class="stat"><div class="v">${totalQty.toLocaleString('en-US')}</div><div class="l">${escapeHtml(L.totalQty)}</div></div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:24px">#</th>
          <th>${escapeHtml(L.invoiceNo)}</th>
          <th style="width:80px">${escapeHtml(L.totalItems)}</th>
          <th style="width:80px">${escapeHtml(L.totalQty)}</th>
        </tr>
      </thead>
      <tbody>${list}</tbody>
    </table>
  </section>`;
}

/**
 * Build a complete printable HTML document with one page per invoice.
 * Optionally inserts a cover page per supplier when they have >1 invoice.
 */
export function buildSupplierInvoicesHTML(groups: InvoiceGroup[], opts: InvoicePrintOptions): string {
  const { isAr, labels: L, showCoverPerSupplier } = opts;

  // Group by supplier for cover-page logic
  const bySupplier = new Map<string, InvoiceGroup[]>();
  for (const g of groups) {
    const arr = bySupplier.get(g.supplier) || [];
    arr.push(g);
    bySupplier.set(g.supplier, arr);
  }

  const totalPages = Array.from(bySupplier.entries()).reduce((sum, [, gs]) => {
    return sum + gs.length + (showCoverPerSupplier && gs.length > 1 ? 1 : 0);
  }, 0);

  let pageIdx = 0;
  const sections: string[] = [];
  for (const [supplier, gs] of bySupplier) {
    if (showCoverPerSupplier && gs.length > 1) {
      pageIdx++;
      sections.push(renderCoverPage(supplier, gs, opts));
    }
    for (const g of gs) {
      pageIdx++;
      sections.push(renderInvoicePage(g, opts, pageIdx, totalPages));
    }
  }

  return `<!DOCTYPE html>
<html dir="${isAr ? 'rtl' : 'ltr'}" lang="${isAr ? 'ar' : 'en'}">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(L.title)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'IBM Plex Sans Arabic', 'Segoe UI Arabic', 'Segoe UI', Arial, sans-serif;
    direction: ${isAr ? 'rtl' : 'ltr'};
    color: #1a1a2e; background: #fff;
    font-size: 9.5pt; line-height: 1.45;
  }
  @page { size: A4 portrait; margin: 10mm; }
  @media print {
    .invoice-page { page-break-after: always; }
    .invoice-page:last-child { page-break-after: auto; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
  }
  .invoice-page {
    padding: 0 4mm;
    page-break-after: always;
  }
  .inv-header {
    background: linear-gradient(135deg, #1a1f2c 0%, #2a3148 100%);
    color: #fff; padding: 14px 18px;
    border-radius: 8px 8px 0 0;
    display: flex; align-items: flex-start; justify-content: space-between;
    border-bottom: 4px solid #FFD700;
  }
  .inv-header .brand { font-size: 14pt; font-weight: 700; letter-spacing: 0.3px; }
  .inv-header .inv-no { font-size: 10pt; margin-top: 4px; opacity: 0.95; }
  .inv-header .inv-no strong { color: #FFD700; }
  .inv-meta { font-size: 9pt; text-align: ${isAr ? 'left' : 'right'}; opacity: 0.95; }
  .inv-meta .page-no { margin-top: 4px; font-size: 8pt; opacity: 0.8; }
  .lbl { color: #6b7280; font-weight: 500; }
  .party-box {
    border: 1px solid #e5e7eb; border-top: none;
    background: #f9fafb; padding: 10px 14px;
    border-radius: 0 0 8px 8px;
    margin-bottom: 12px;
  }
  .party-box .party-row {
    display: flex; justify-content: space-between; gap: 16px;
    margin-top: 6px; font-size: 9pt;
  }
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
  thead tr { background: #1a1f2c; color: #fff; }
  th { padding: 7px 5px; text-align: center; font-weight: 600; border: 1px solid #2d3548; }
  td { padding: 5px 6px; border: 1px solid #d1d5db; vertical-align: middle; }
  tbody tr:nth-child(even) { background: #f9fafb; }
  td.num { text-align: center; font-variant-numeric: tabular-nums; }
  td.bold { font-weight: 700; }
  td.small { font-size: 8pt; }
  td.mono { font-family: 'Courier New', monospace; font-weight: 600; font-size: 8pt; }
  td.desc { font-size: 8pt; }
  td.box-no { font-weight: 700; color: #b91c1c; text-align: center; }
  td.muted { color: #9ca3af; text-align: center; }
  td.img-cell { text-align: center; padding: 2px; }
  td.img-cell img { width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb; }
  td.img-cell .no-img { width: 40px; height: 40px; display: inline-flex; align-items: center; justify-content: center; background: #f3f4f6; border-radius: 4px; color: #9ca3af; }
  .totals {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
    margin-top: 12px;
  }
  .stat { border: 1.5px solid #e5e7eb; border-radius: 6px; padding: 10px 8px; text-align: center; background: #f9fafb; }
  .stat .v { font-size: 14pt; font-weight: 700; color: #1a1f2c; }
  .stat .l { font-size: 8pt; color: #6b7280; margin-top: 2px; font-weight: 500; }
  .signatures {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
    margin-top: 28px; padding: 0 8px;
  }
  .sig-box { text-align: center; }
  .sig-line { border-top: 1.5px solid #1a1f2c; height: 40px; margin-bottom: 4px; }
  .sig-label { font-size: 8.5pt; color: #4b5563; font-weight: 500; }
  .cover-page .cover-supplier { text-align: center; padding: 20px; margin: 20px 0; border: 2px solid #FFD700; border-radius: 8px; background: #fffbea; }
  .cover-page .cover-supplier h2 { font-size: 18pt; color: #1a1f2c; margin-top: 6px; }
  .cover-totals { margin-top: 0; margin-bottom: 16px; }
</style>
</head>
<body>
${sections.join('\n')}
</body>
</html>`;
}

/** Print HTML using the standard iframe + Blob path with Electron fallbacks. */
export async function printHTMLDocument(html: string, documentTitle: string): Promise<void> {
  const originalTitle = document.title;
  document.title = documentTitle;

  const w = window as unknown as {
    electronAPI?: {
      printHTML?: (html: string) => Promise<void>;
      openExternal?: (url: string) => Promise<void>;
    };
  };

  if (w.electronAPI?.printHTML) {
    try { await w.electronAPI.printHTML(html); }
    catch (e) { console.log('Electron print cancelled:', e); }
    finally { document.title = originalTitle; }
    return;
  }

  if (w.electronAPI?.openExternal) {
    try {
      const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
      await w.electronAPI.openExternal(dataUrl);
      document.title = originalTitle;
      return;
    } catch (e) { console.warn('openExternal fallback failed:', e); }
  }

  const blob = new Blob([html], { type: 'text/html' });
  const blobUrl = URL.createObjectURL(blob);
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  iframe.setAttribute('aria-hidden', 'true');

  const cleanup = () => {
    document.title = originalTitle;
    URL.revokeObjectURL(blobUrl);
    iframe.remove();
  };

  iframe.onload = () => {
    const fw = iframe.contentWindow;
    if (!fw) { cleanup(); return; }
    fw.focus();
    const imgs = fw.document.images;
    const total = imgs.length;
    let loaded = 0;
    const tryPrint = () => fw.print();
    if (total === 0) { setTimeout(tryPrint, 200); }
    else {
      const onDone = () => { loaded += 1; if (loaded >= total) setTimeout(tryPrint, 150); };
      for (const img of Array.from(imgs)) {
        if (img.complete) onDone();
        else { img.addEventListener('load', onDone); img.addEventListener('error', onDone); }
      }
      setTimeout(tryPrint, 5000);
    }
    fw.onafterprint = cleanup;
    setTimeout(cleanup, 10000);
  };

  iframe.src = blobUrl;
  document.body.appendChild(iframe);
}