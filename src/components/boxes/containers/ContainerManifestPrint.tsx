import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import QRCode from 'qrcode';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ShippingContainer } from '@/hooks/useContainers';
import type { ContainerItemRow } from '@/hooks/useContainerItems';

interface Props {
  container: ShippingContainer;
  boxedGroups: { box_no: string; destination: string; items: ContainerItemRow[]; total_qty: number }[];
  looseItems: ContainerItemRow[];
}

function fmt(d: string | null) {
  if (!d) return '—';
  const date = new Date(d);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function esc(s: string | number | null | undefined): string {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function ContainerManifestPrint({ container, boxedGroups, looseItems }: Props) {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';

  const buildHTML = async () => {
    const url = `${window.location.origin}/boxes/container/${container.id}`;
    const qrDataUrl = await QRCode.toDataURL(url, { width: 180, margin: 1 });

    const destLabels: Record<string, string> = {
      morocco: isAr ? 'المغرب' : 'Morocco',
      uzbekistan: isAr ? 'أوزبكستان' : 'Uzbekistan',
      unspecified: isAr ? 'غير محدد' : 'Unspecified',
    };
    const statusLabels: Record<string, string> = {
      preparing: isAr ? 'قيد التجهيز' : 'Preparing',
      sealed: isAr ? 'مختوم' : 'Sealed',
      shipped: isAr ? 'تم الشحن' : 'Shipped',
      delivered: isAr ? 'تم التسليم' : 'Delivered',
    };

    const totalBoxedQty = boxedGroups.reduce((s, g) => s + g.total_qty, 0);
    const totalLooseQty = looseItems.reduce((s, r) => s + (r.receipt.qty || 0), 0);
    const grandTotal = totalBoxedQty + totalLooseQty;

    const boxedRows = boxedGroups
      .map((g, idx) => {
        const inner = g.items
          .map(
            (it) => `
          <tr class="sub">
            <td class="num">${idx + 1}.${g.items.indexOf(it) + 1}</td>
            <td>${esc(it.receipt.supplier)}</td>
            <td class="mono">${esc(it.receipt.part_no)}</td>
            <td class="desc">${esc(it.receipt.description)}</td>
            <td class="num bold">${(it.receipt.qty || 0).toLocaleString('en-US')}</td>
            <td class="num small">${esc(it.receipt.unit)}</td>
          </tr>`
          )
          .join('');
        return `
        <tr class="grp">
          <td colspan="6">
            <div class="grp-head">
              <span class="box-no">${esc(g.box_no)}</span>
              <span class="badge dest-${g.destination}">${destLabels[g.destination] || g.destination}</span>
              <span class="muted">${g.items.length} ${isAr ? 'صنف' : 'items'} • ${isAr ? 'إجمالي' : 'Total'}: ${g.total_qty.toLocaleString('en-US')}</span>
            </div>
          </td>
        </tr>
        ${inner}`;
      })
      .join('');

    const looseRows = looseItems
      .map(
        (it, i) => `
        <tr>
          <td class="num">${i + 1}</td>
          <td>${esc(it.receipt.supplier)}</td>
          <td class="mono">${esc(it.receipt.part_no)}</td>
          <td class="desc">${esc(it.receipt.description)}</td>
          <td class="num bold">${(it.receipt.qty || 0).toLocaleString('en-US')}</td>
          <td class="num small">${esc(it.receipt.unit)}</td>
          <td><span class="badge dest-${it.receipt.destination}">${destLabels[it.receipt.destination] || it.receipt.destination}</span></td>
        </tr>`
      )
      .join('');

    const today = fmt(new Date().toISOString());
    const title = isAr ? 'بوليصة الكونتينر' : 'Container Manifest';

    return `<!DOCTYPE html>
<html dir="${isAr ? 'rtl' : 'ltr'}" lang="${isAr ? 'ar' : 'en'}">
<head>
  <meta charset="UTF-8">
  <title>${esc(title)} - ${esc(container.container_no)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'IBM Plex Sans Arabic', 'Segoe UI', Arial, sans-serif;
      direction: ${isAr ? 'rtl' : 'ltr'};
      color: #1a1a2e; background: #fff;
      padding: 10mm; font-size: 9.5pt; line-height: 1.4;
    }
    @page { size: A4; margin: 8mm; }
    @media print {
      body { padding: 4mm; }
      .no-print { display: none !important; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
      .section { page-break-inside: auto; }
    }
    .header {
      background: #1a1f2c; color: #fff;
      padding: 14px 18px; border-radius: 6px;
      display: flex; align-items: center; justify-content: space-between;
      gap: 16px; margin-bottom: 12px;
    }
    .header h1 { font-size: 16pt; font-weight: 700; }
    .header .sub { font-size: 9pt; opacity: 0.85; font-style: italic; margin-top: 2px; }
    .qr-box {
      background: #fff; padding: 6px; border-radius: 4px;
      text-align: center; min-width: 100px;
    }
    .qr-box img { width: 80px; height: 80px; display: block; }
    .qr-box .qr-hint { font-size: 6.5pt; color: #1a1f2c; margin-top: 2px; }
    .meta-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
      margin-bottom: 12px;
    }
    .meta {
      border: 1.5px solid #e5e7eb; border-radius: 6px;
      padding: 8px 10px; background: #f9fafb;
    }
    .meta .l { font-size: 7.5pt; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; }
    .meta .v { font-size: 11pt; font-weight: 700; color: #1a1f2c; margin-top: 2px; }
    .meta .v.mono { font-family: 'Courier New', monospace; }
    .totals {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
      margin-bottom: 12px;
    }
    .stat {
      border: 1.5px solid #1a1f2c; border-radius: 6px;
      padding: 10px; text-align: center; background: #fff;
    }
    .stat .v { font-size: 16pt; font-weight: 700; color: #1a1f2c; }
    .stat .l { font-size: 8pt; color: #6b7280; margin-top: 2px; font-weight: 500; }
    .section { margin-bottom: 14px; }
    .section h2 {
      font-size: 11pt; font-weight: 700; color: #fff;
      background: #1a1f2c; padding: 6px 10px; border-radius: 4px 4px 0 0;
    }
    table { width: 100%; border-collapse: collapse; font-size: 8.5pt; background: #fff; }
    thead tr { background: #2d3548; color: #fff; }
    th { padding: 6px 6px; text-align: center; font-weight: 600; border: 1px solid #2d3548; font-size: 8.5pt; }
    td { padding: 4px 6px; border: 1px solid #d1d5db; vertical-align: middle; }
    tr.grp td { background: #fef3c7; padding: 6px 8px; }
    tr.sub td { background: #fffbeb; }
    tr:nth-child(even) td { background: #f9fafb; }
    tr.grp:nth-child(even) td { background: #fef3c7; }
    tr.sub:nth-child(even) td { background: #fef9e3; }
    .grp-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .box-no { font-weight: 700; font-size: 11pt; color: #b91c1c; font-family: 'Courier New', monospace; }
    .muted { font-size: 8pt; color: #6b7280; }
    td.num { text-align: center; font-variant-numeric: tabular-nums; }
    td.bold { font-weight: 700; }
    td.small { font-size: 8pt; }
    td.mono { font-family: 'Courier New', monospace; font-weight: 600; font-size: 8pt; }
    td.desc { font-size: 8pt; }
    .badge {
      display: inline-block; padding: 2px 7px; border-radius: 10px;
      font-size: 7.5pt; font-weight: 600; white-space: nowrap;
    }
    .dest-morocco { background: #fed7aa; color: #9a3412; }
    .dest-uzbekistan { background: #bbf7d0; color: #166534; }
    .dest-unspecified { background: #e5e7eb; color: #4b5563; }
    .empty { text-align: center; padding: 16px; color: #9ca3af; font-size: 9pt; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; }
    .footer {
      margin-top: 14px; padding-top: 8px;
      border-top: 1.5px solid #1a1f2c;
      display: flex; justify-content: space-between;
      font-size: 8pt; color: #6b7280;
    }
    .signatures {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
      margin-top: 18px;
    }
    .sig { border-top: 1.5px solid #1a1f2c; padding-top: 4px; text-align: center; font-size: 8.5pt; color: #4b5563; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${esc(title)}</h1>
      <div class="sub">${isAr ? 'وثيقة الشحن النهائية' : 'Final shipping document'}</div>
    </div>
    <div class="qr-box">
      <img src="${qrDataUrl}" alt="QR" />
      <div class="qr-hint">${isAr ? 'امسح للوصول' : 'Scan to open'}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta"><div class="l">${isAr ? 'رقم الكونتينر' : 'Container No'}</div><div class="v mono">${esc(container.container_no)}</div></div>
    <div class="meta"><div class="l">${isAr ? 'شركة الشحن' : 'Shipping Company'}</div><div class="v">${esc(container.shipping_company)}</div></div>
    <div class="meta"><div class="l">${isAr ? 'الوجهة' : 'Destination'}</div><div class="v">${destLabels[container.destination] || container.destination}</div></div>
    <div class="meta"><div class="l">${isAr ? 'الحالة' : 'Status'}</div><div class="v">${statusLabels[container.status] || container.status}</div></div>
  </div>

  <div class="totals">
    <div class="stat"><div class="v">${boxedGroups.length.toLocaleString('en-US')}</div><div class="l">${isAr ? 'صناديق' : 'Boxes'}</div></div>
    <div class="stat"><div class="v">${looseItems.length.toLocaleString('en-US')}</div><div class="l">${isAr ? 'أصناف غير معبأة' : 'Loose items'}</div></div>
    <div class="stat"><div class="v">${totalBoxedQty.toLocaleString('en-US')}</div><div class="l">${isAr ? 'كمية الصناديق' : 'Boxed Qty'}</div></div>
    <div class="stat"><div class="v">${grandTotal.toLocaleString('en-US')}</div><div class="l">${isAr ? 'الإجمالي الكلي' : 'Grand Total'}</div></div>
  </div>

  <div class="section">
    <h2>${isAr ? 'الصناديق' : 'Boxes'} (${boxedGroups.length.toLocaleString('en-US')})</h2>
    ${
      boxedGroups.length === 0
        ? `<div class="empty">${isAr ? 'لا توجد صناديق في هذا الكونتينر' : 'No boxes in this container'}</div>`
        : `<table>
      <thead>
        <tr>
          <th style="width:50px">#</th>
          <th>${isAr ? 'المورد' : 'Supplier'}</th>
          <th>${isAr ? 'رقم القطعة' : 'Part No'}</th>
          <th>${isAr ? 'الوصف' : 'Description'}</th>
          <th style="width:60px">${isAr ? 'الكمية' : 'Qty'}</th>
          <th style="width:50px">${isAr ? 'الوحدة' : 'Unit'}</th>
        </tr>
      </thead>
      <tbody>${boxedRows}</tbody>
    </table>`
    }
  </div>

  <div class="section">
    <h2>${isAr ? 'الأصناف غير المعبأة' : 'Loose Items'} (${looseItems.length.toLocaleString('en-US')})</h2>
    ${
      looseItems.length === 0
        ? `<div class="empty">${isAr ? 'لا توجد أصناف غير معبأة في هذا الكونتينر' : 'No loose items in this container'}</div>`
        : `<table>
      <thead>
        <tr>
          <th style="width:30px">#</th>
          <th>${isAr ? 'المورد' : 'Supplier'}</th>
          <th>${isAr ? 'رقم القطعة' : 'Part No'}</th>
          <th>${isAr ? 'الوصف' : 'Description'}</th>
          <th style="width:60px">${isAr ? 'الكمية' : 'Qty'}</th>
          <th style="width:50px">${isAr ? 'الوحدة' : 'Unit'}</th>
          <th style="width:90px">${isAr ? 'الوجهة' : 'Destination'}</th>
        </tr>
      </thead>
      <tbody>${looseRows}</tbody>
    </table>`
    }
  </div>

  <div class="signatures">
    <div class="sig">${isAr ? 'أمين المخزن' : 'Warehouse Keeper'}</div>
    <div class="sig">${isAr ? 'مسؤول الشحن' : 'Shipping Officer'}</div>
    <div class="sig">${isAr ? 'المدير' : 'Manager'}</div>
  </div>

  <div class="footer">
    <div>${isAr ? 'نظام إدارة المخزن - DTS Store' : 'Warehouse Management System - DTS Store'}</div>
    <div>${isAr ? 'تاريخ الطباعة:' : 'Printed:'} ${today}</div>
  </div>
</body>
</html>`;
  };

  const handlePrint = async () => {
    const originalTitle = document.title;
    document.title = `${t('containerManifest')} - ${container.container_no}`;
    const html = await buildHTML();

    if (window.electronAPI?.printHTML) {
      try { await window.electronAPI.printHTML(html); }
      catch (e) { console.log('Electron print cancelled:', e); }
      finally { document.title = originalTitle; }
      return;
    }

    const blob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    iframe.setAttribute('aria-hidden', 'true');

    const cleanup = () => {
      document.title = originalTitle;
      URL.revokeObjectURL(blobUrl);
      iframe.remove();
    };

    iframe.onload = () => {
      const w = iframe.contentWindow;
      if (!w) return cleanup();
      w.focus();
      setTimeout(() => w.print(), 300);
      w.onafterprint = cleanup;
      setTimeout(cleanup, 8000);
    };
    iframe.src = blobUrl;
    document.body.appendChild(iframe);
  };

  return (
    <Button variant="outline" onClick={handlePrint}>
      <Printer className="w-4 h-4 me-1.5" />
      {t('printManifest')}
    </Button>
  );
}