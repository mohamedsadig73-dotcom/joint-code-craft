import type { ReportBlock, WmsReviewReport } from '@/data/wmsReviewReport';

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const calloutColor = (variant: string) => {
  switch (variant) {
    case 'warning':
      return { bg: '#FEF3C7', border: '#F59E0B', fg: '#92400E' };
    case 'success':
      return { bg: '#D1FAE5', border: '#10B981', fg: '#065F46' };
    case 'danger':
      return { bg: '#FEE2E2', border: '#EF4444', fg: '#991B1B' };
    default:
      return { bg: '#DBEAFE', border: '#3B82F6', fg: '#1E40AF' };
  }
};

function renderBlockHtml(block: ReportBlock): string {
  switch (block.type) {
    case 'p':
      return `<p style="margin:0 0 12px;line-height:1.85;font-size:14pt;text-align:justify;">${escapeHtml(block.text)}</p>`;
    case 'list': {
      const tag = block.ordered ? 'ol' : 'ul';
      const items = block.items
        .map((it) => `<li style="margin-bottom:6px;line-height:1.7;">${escapeHtml(it)}</li>`)
        .join('');
      return `<${tag} style="padding-inline-start:22px;margin:0 0 14px;font-size:13pt;">${items}</${tag}>`;
    }
    case 'table': {
      const head = block.headers
        .map(
          (h) =>
            `<th style="border:1px solid #94A3B8;background:#1E3A8A;color:#fff;padding:8px;font-size:12pt;text-align:start;">${escapeHtml(h)}</th>`,
        )
        .join('');
      const body = block.rows
        .map(
          (row, i) =>
            `<tr style="background:${i % 2 ? '#F8FAFC' : '#fff'};">${row
              .map(
                (c) =>
                  `<td style="border:1px solid #CBD5E1;padding:7px;font-size:11pt;vertical-align:top;">${escapeHtml(c)}</td>`,
              )
              .join('')}</tr>`,
        )
        .join('');
      return `<table style="width:100%;border-collapse:collapse;margin:8px 0 16px;direction:rtl;"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
    }
    case 'callout': {
      const c = calloutColor(block.variant);
      const title = block.title
        ? `<div style="font-weight:bold;margin-bottom:4px;color:${c.fg};">${escapeHtml(block.title)}</div>`
        : '';
      return `<div style="background:${c.bg};border-inline-start:4px solid ${c.border};padding:10px 14px;margin:8px 0 16px;color:${c.fg};border-radius:4px;">${title}<div style="font-size:13pt;line-height:1.7;">${escapeHtml(block.text)}</div></div>`;
    }
  }
}

export function renderReportFullHtml(report: WmsReviewReport): string {
  const sectionsHtml = report.sections
    .map(
      (s) => `
      <section style="page-break-inside:avoid;margin-bottom:18px;">
        <h2 style="font-size:18pt;color:#1E3A8A;border-bottom:2px solid #1E3A8A;padding-bottom:6px;margin:18px 0 12px;">${escapeHtml(s.title)}</h2>
        ${s.blocks.map(renderBlockHtml).join('\n')}
      </section>`,
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(report.title)}</title>
<style>
  @page { size: A4; margin: 20mm; }
  body { font-family: 'Segoe UI Arabic','Tajawal','Arial',sans-serif; direction: rtl; color:#0F172A; padding: 16px; }
  .cover { text-align:center; padding: 60px 0 40px; border-bottom: 3px double #1E3A8A; margin-bottom: 24px; page-break-after: always; }
  .cover h1 { font-size: 26pt; color:#1E3A8A; margin: 0 0 12px; }
  .cover .subtitle { font-size: 14pt; color:#475569; margin-bottom: 28px; }
  .cover .meta { font-size: 12pt; color:#64748B; line-height: 2; }
  table { page-break-inside: avoid; }
  h2 { page-break-after: avoid; }
  @media print { .no-print { display: none !important; } }
</style>
</head>
<body>
  <div class="cover">
    <h1>${escapeHtml(report.title)}</h1>
    <div class="subtitle">${escapeHtml(report.subtitle)}</div>
    <div class="meta">
      <div>الإصدار: ${escapeHtml(report.version)}</div>
      <div>التاريخ: ${escapeHtml(report.date)}</div>
      <div>إعداد: ${escapeHtml(report.author)}</div>
    </div>
  </div>
  ${sectionsHtml}
</body>
</html>`;
}

/** Word-compatible HTML (.doc) — Word opens HTML directly with full RTL/table fidelity */
export function downloadDocx(report: WmsReviewReport, filename = 'WMS-Technical-Review.doc') {
  const html = renderReportFullHtml(report);
  const wordHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head>
<body>${html}</body></html>`;
  const blob = new Blob(['\ufeff', wordHtml], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Open print-ready window for PDF via browser native print-to-PDF */
export function printPdf(report: WmsReviewReport) {
  const html = renderReportFullHtml(report);
  const w = window.open('', '_blank', 'width=1024,height=768');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.onload = () => {
    setTimeout(() => {
      w.focus();
      w.print();
    }, 300);
  };
}
