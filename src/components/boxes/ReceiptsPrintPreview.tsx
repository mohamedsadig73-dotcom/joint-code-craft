import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import type { BoxReceipt } from '@/hooks/useBoxReceipts';

interface Props {
  receipts: BoxReceipt[];
  filterSummary?: string;
}

function formatDate(d: string) {
  if (!d) return '';
  const date = new Date(d);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function escapeHtml(s: string | number | null | undefined): string {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function ReceiptsPrintPreview({ receipts, filterSummary }: Props) {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';

  const buildPrintHTML = () => {
    const destLabels: Record<string, string> = {
      morocco: isAr ? 'المغرب' : 'Morocco',
      uzbekistan: isAr ? 'أوزبكستان' : 'Uzbekistan',
      unspecified: isAr ? 'غير محدد' : 'Unspecified',
    };
    const statusLabels: Record<string, string> = {
      received: isAr ? 'مستلم' : 'Received',
      sorted: isAr ? 'مفروز' : 'Sorted',
      packed: isAr ? 'معبأ' : 'Packed',
      shipped: isAr ? 'مشحون' : 'Shipped',
    };
    const packingLabels: Record<string, string> = {
      boxed: isAr ? 'صندوق' : 'Boxed',
      loose: isAr ? 'بدون صندوق' : 'Loose',
    };

    const totalQty = receipts.reduce((s, r) => s + (r.qty || 0), 0);
    const boxedCount = receipts.filter((r) => r.packing_type === 'boxed').length;
    const looseCount = receipts.filter((r) => r.packing_type === 'loose').length;
    const distinctBoxes = new Set(
      receipts.filter((r) => r.packing_type === 'boxed' && r.box_no).map((r) => r.box_no)
    ).size;

    const rows = receipts
      .map((r, i) => {
        const imgUrl = r.image_path
          ? supabase.storage.from('box-images').getPublicUrl(r.image_path).data.publicUrl
          : null;
        const isLoose = r.packing_type === 'loose';
        return `
          <tr>
            <td class="num">${i + 1}</td>
            <td class="img-cell">
              ${
                imgUrl
                  ? `<img src="${escapeHtml(imgUrl)}" alt="" loading="eager" />`
                  : `<div class="no-img">—</div>`
              }
            </td>
            <td>${escapeHtml(r.supplier)}</td>
            <td class="mono">${escapeHtml(r.part_no)}</td>
            <td class="desc">${escapeHtml(r.description)}</td>
            <td class="num bold">${(r.qty || 0).toLocaleString('en-US')}</td>
            <td class="num small">${escapeHtml(r.unit)}</td>
            <td><span class="badge dest-${r.destination}">${destLabels[r.destination] || r.destination}</span></td>
            <td><span class="badge pack-${r.packing_type}">${packingLabels[r.packing_type]}</span></td>
            <td class="${isLoose ? 'muted' : 'box-no'}">${isLoose ? '—' : escapeHtml(r.box_no)}</td>
            <td class="num small">${formatDate(r.receipt_date)}</td>
            <td><span class="badge status-${r.status}">${statusLabels[r.status] || r.status}</span></td>
          </tr>`;
      })
      .join('');

    const today = formatDate(new Date().toISOString());
    const title = isAr ? 'سجل استلام الأغراض - المخزن' : 'Warehouse Goods Receipt Record';
    const subtitle = isAr ? 'نقطة الإدخال الوحيدة للبيانات' : 'Warehouse Goods Receipt Record';

    return `<!DOCTYPE html>
<html dir="${isAr ? 'rtl' : 'ltr'}" lang="${isAr ? 'ar' : 'en'}">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)} - ${today}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'IBM Plex Sans Arabic', 'Segoe UI', Arial, sans-serif;
      direction: ${isAr ? 'rtl' : 'ltr'};
      color: #1a1a2e; background: #fff;
      padding: 12mm 8mm; font-size: 9pt; line-height: 1.4;
    }
    @page { size: A4 landscape; margin: 8mm; }
    @media print {
      body { padding: 4mm; }
      .no-print { display: none !important; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
    }
    .header {
      background: #1a1f2c; color: #fff;
      padding: 14px 18px; border-radius: 6px 6px 0 0;
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 0;
    }
    .header h1 { font-size: 16pt; font-weight: 700; }
    .header .sub { font-size: 9pt; opacity: 0.85; font-style: italic; }
    .header .meta { font-size: 8.5pt; text-align: ${isAr ? 'left' : 'right'}; }
    .header .meta div { margin-bottom: 2px; }
    .summary {
      display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;
      padding: 10px 0; margin-bottom: 8px;
    }
    .stat {
      border: 1.5px solid #e5e7eb; border-radius: 6px;
      padding: 8px 10px; text-align: center; background: #f9fafb;
    }
    .stat .v { font-size: 14pt; font-weight: 700; color: #1a1f2c; }
    .stat .l { font-size: 8pt; color: #6b7280; margin-top: 2px; font-weight: 500; }
    table {
      width: 100%; border-collapse: collapse;
      font-size: 8.5pt; background: #fff;
    }
    thead tr { background: #1a1f2c; color: #fff; }
    th {
      padding: 8px 6px; text-align: center;
      font-weight: 600; font-size: 8.5pt;
      border: 1px solid #2d3548;
    }
    th .en { display: block; font-size: 7pt; opacity: 0.8; font-weight: 400; margin-top: 1px; }
    td {
      padding: 5px 6px; border: 1px solid #d1d5db;
      vertical-align: middle; font-size: 8.5pt;
    }
    tbody tr:nth-child(even) { background: #f9fafb; }
    td.num { text-align: center; font-variant-numeric: tabular-nums; }
    td.bold { font-weight: 700; }
    td.small { font-size: 8pt; }
    td.mono { font-family: 'Courier New', monospace; font-weight: 600; font-size: 8pt; }
    td.desc { font-size: 8pt; max-width: 200px; }
    td.box-no { font-weight: 700; color: #b91c1c; text-align: center; }
    td.muted { color: #9ca3af; text-align: center; }
    td.img-cell { text-align: center; padding: 2px; width: 50px; }
    td.img-cell img {
      width: 44px; height: 44px; object-fit: cover;
      border-radius: 4px; border: 1px solid #e5e7eb;
    }
    td.img-cell .no-img {
      width: 44px; height: 44px; display: inline-flex;
      align-items: center; justify-content: center;
      background: #f3f4f6; border-radius: 4px; color: #9ca3af; font-size: 14pt;
    }
    .badge {
      display: inline-block; padding: 2px 7px; border-radius: 10px;
      font-size: 7.5pt; font-weight: 600; white-space: nowrap;
    }
    .dest-morocco { background: #fed7aa; color: #9a3412; }
    .dest-uzbekistan { background: #bbf7d0; color: #166534; }
    .dest-unspecified { background: #e5e7eb; color: #4b5563; }
    .pack-boxed { background: #dbeafe; color: #1e40af; }
    .pack-loose { background: #ede9fe; color: #6b21a8; }
    .status-received { background: #dbeafe; color: #1e40af; }
    .status-sorted { background: #fef3c7; color: #92400e; }
    .status-packed { background: #ede9fe; color: #6b21a8; }
    .status-shipped { background: #d1fae5; color: #065f46; }
    .footer {
      margin-top: 12px; padding-top: 8px;
      border-top: 1.5px solid #1a1f2c;
      display: flex; justify-content: space-between;
      font-size: 8pt; color: #6b7280;
    }
    .empty {
      text-align: center; padding: 40px;
      color: #9ca3af; font-size: 11pt;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${escapeHtml(title)}</h1>
      <div class="sub">${escapeHtml(subtitle)}</div>
    </div>
    <div class="meta">
      <div><strong>${isAr ? 'تاريخ الطباعة:' : 'Printed:'}</strong> ${today}</div>
      ${filterSummary ? `<div>${escapeHtml(filterSummary)}</div>` : ''}
    </div>
  </div>

  <div class="summary">
    <div class="stat"><div class="v">${receipts.length.toLocaleString('en-US')}</div><div class="l">${isAr ? 'إجمالي السجلات' : 'Total Records'}</div></div>
    <div class="stat"><div class="v">${totalQty.toLocaleString('en-US')}</div><div class="l">${isAr ? 'إجمالي الكمية' : 'Total Quantity'}</div></div>
    <div class="stat"><div class="v">${boxedCount.toLocaleString('en-US')}</div><div class="l">${isAr ? 'أصناف بصناديق' : 'Boxed Items'}</div></div>
    <div class="stat"><div class="v">${looseCount.toLocaleString('en-US')}</div><div class="l">${isAr ? 'أصناف بدون صناديق' : 'Loose Items'}</div></div>
    <div class="stat"><div class="v">${distinctBoxes.toLocaleString('en-US')}</div><div class="l">${isAr ? 'عدد الصناديق' : 'Distinct Boxes'}</div></div>
  </div>

  ${
    receipts.length === 0
      ? `<div class="empty">${isAr ? 'لا توجد بيانات للطباعة' : 'No data to print'}</div>`
      : `<table>
    <thead>
      <tr>
        <th style="width:30px">#</th>
        <th style="width:50px">${isAr ? 'الصورة' : 'Image'}</th>
        <th>${isAr ? 'المورد' : 'Supplier'}</th>
        <th>${isAr ? 'رقم القطعة' : 'Part No'}</th>
        <th>${isAr ? 'الوصف' : 'Description'}</th>
        <th style="width:50px">${isAr ? 'الكمية' : 'Qty'}</th>
        <th style="width:45px">${isAr ? 'الوحدة' : 'Unit'}</th>
        <th style="width:80px">${isAr ? 'الوجهة' : 'Destination'}</th>
        <th style="width:75px">${isAr ? 'التعبئة' : 'Packing'}</th>
        <th style="width:60px">${isAr ? 'رقم الصندوق' : 'Box No'}</th>
        <th style="width:65px">${isAr ? 'التاريخ' : 'Date'}</th>
        <th style="width:70px">${isAr ? 'الحالة' : 'Status'}</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`
  }

  <div class="footer">
    <div>${isAr ? 'نظام إدارة المخزن - DTS Store' : 'Warehouse Management System - DTS Store'}</div>
    <div>${isAr ? 'صفحة' : 'Page'} <span class="page-num"></span></div>
  </div>
</body>
</html>`;
  };

  const handlePrint = async () => {
    const originalTitle = document.title;
    const reportTitle = isAr ? 'سجل استلام الأغراض' : 'Goods Receipt Record';
    document.title = `${reportTitle} - ${formatDate(new Date().toISOString())}`;

    const html = buildPrintHTML();

    if (window.electronAPI?.printHTML) {
      try {
        await window.electronAPI.printHTML(html);
      } catch (e) {
        console.log('Electron print cancelled:', e);
      } finally {
        document.title = originalTitle;
      }
      return;
    }

    const blob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');

    const cleanup = () => {
      document.title = originalTitle;
      URL.revokeObjectURL(blobUrl);
      iframe.remove();
    };

    iframe.onload = () => {
      const frameWindow = iframe.contentWindow;
      if (!frameWindow) {
        cleanup();
        return;
      }
      frameWindow.focus();
      // Wait for images to load before printing
      const imgs = frameWindow.document.images;
      const total = imgs.length;
      let loaded = 0;
      const tryPrint = () => {
        frameWindow.print();
      };
      if (total === 0) {
        setTimeout(tryPrint, 200);
      } else {
        const onDone = () => {
          loaded += 1;
          if (loaded >= total) setTimeout(tryPrint, 150);
        };
        for (const img of Array.from(imgs)) {
          if (img.complete) onDone();
          else {
            img.addEventListener('load', onDone);
            img.addEventListener('error', onDone);
          }
        }
        // Hard cap in case some images hang
        setTimeout(tryPrint, 4000);
      }
      frameWindow.onafterprint = cleanup;
      setTimeout(cleanup, 8000);
    };

    iframe.src = blobUrl;
    document.body.appendChild(iframe);
  };

  return (
    <Button variant="outline" onClick={handlePrint} disabled={receipts.length === 0}>
      <Printer className="w-4 h-4 me-1.5" />
      {t('print')}
    </Button>
  );
}