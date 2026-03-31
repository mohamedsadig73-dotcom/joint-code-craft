import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatNumber } from '@/utils/numberFormat';
import { formatDate } from '@/utils/dateUtils';

interface Expense {
  id: string;
  expense_date: string;
  vendor_name: string;
  description: string;
  total_amount: number;
  status: string;
}

interface PettyCashPeriod {
  id: string;
  period_number: string;
  location: string;
  responsible_person: string;
  budget_limit: number;
  opening_balance: number;
  current_balance: number;
  total_expenses: number;
  expenses_count: number;
  status: string;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
}

interface PettyCashPrintPreviewProps {
  period: PettyCashPeriod;
  expenses: Expense[];
}

export function PettyCashPrintPreview({ period, expenses }: PettyCashPrintPreviewProps) {
  const { t, language } = useLanguage();

  const statusLabels: Record<string, string> = {
    open: language === 'ar' ? 'مفتوحة' : 'Open',
    closed: language === 'ar' ? 'مغلقة' : 'Closed',
    pending_approval: language === 'ar' ? 'بانتظار الموافقة' : 'Pending Approval',
    rejected: language === 'ar' ? 'مرفوضة' : 'Rejected',
    approved: language === 'ar' ? 'موافق عليه' : 'Approved',
    pending: language === 'ar' ? 'معلق' : 'Pending',
  };

  const usagePercentage = period.opening_balance > 0
    ? Math.round((period.total_expenses / period.opening_balance) * 100)
    : 0;

  const handlePrint = async () => {
    const originalTitle = document.title;
    document.title = `تفاصيل النثرية - ${period.period_number}`;

    const html = buildPrintHTML();

    // Use Electron's native print if available
    if (window.electronAPI?.printHTML) {
      try {
        await window.electronAPI.printHTML(html);
      } catch (e) {
        console.log('Electron print cancelled or failed:', e);
      } finally {
        document.title = originalTitle;
      }
      return;
    }

    // Fallback: iframe approach for browser
    printViaIframe(html, originalTitle);
  };

  const printViaIframe = (html: string, originalTitle: string) => {
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>تفاصيل النثرية - ${period.period_number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'IBM Plex Sans Arabic', 'Arial', sans-serif;
      direction: rtl;
      color: #1a1a2e;
      background: #fff;
      padding: 20mm 15mm;
      font-size: 12pt;
      line-height: 1.6;
    }

    @media print {
      body { padding: 10mm; }
      .no-print { display: none !important; }
      @page { 
        size: A4;
        margin: 12mm;
      }
    }

    .header {
      text-align: center;
      border-bottom: 3px solid #1a1a2e;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }

    .header h1 {
      font-size: 22pt;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 4px;
    }

    .header .period-number {
      font-size: 14pt;
      font-weight: 600;
      color: #2563eb;
    }

    .header .subtitle {
      font-size: 10pt;
      color: #6b7280;
      margin-top: 4px;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }

    .summary-card {
      border: 1.5px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
    }

    .summary-card .label {
      font-size: 9pt;
      color: #6b7280;
      font-weight: 500;
      margin-bottom: 6px;
    }

    .summary-card .value {
      font-size: 16pt;
      font-weight: 700;
    }

    .summary-card .currency {
      font-size: 10pt;
      font-weight: 500;
      color: #6b7280;
    }

    .summary-card.status .value {
      font-size: 12pt;
      background: #dcfce7;
      color: #166534;
      padding: 4px 12px;
      border-radius: 20px;
      display: inline-block;
    }

    .summary-card.status.closed .value {
      background: #f3f4f6;
      color: #374151;
    }

    .value-blue { color: #2563eb; }
    .value-red { color: #dc2626; }
    .value-green { color: #16a34a; }

    .usage-bar-container {
      margin-bottom: 24px;
      border: 1.5px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px 16px;
    }

    .usage-bar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .usage-bar-header .label {
      font-size: 10pt;
      color: #6b7280;
      font-weight: 500;
    }

    .usage-bar-header .percentage {
      font-size: 12pt;
      font-weight: 700;
      color: #1a1a2e;
    }

    .usage-bar {
      width: 100%;
      height: 10px;
      background: #e5e7eb;
      border-radius: 5px;
      overflow: hidden;
    }

    .usage-bar-fill {
      height: 100%;
      border-radius: 5px;
      background: ${usagePercentage > 100 ? '#dc2626' : usagePercentage > 80 ? '#eab308' : '#16a34a'};
    }

    .details-section {
      border: 1.5px solid #e5e7eb;
      border-radius: 8px;
      padding: 14px 16px;
      margin-bottom: 24px;
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11pt;
    }

    .detail-item .detail-label {
      color: #6b7280;
      font-weight: 500;
    }

    .detail-item .detail-value {
      font-weight: 600;
      color: #1a1a2e;
    }

    .expenses-section h2 {
      font-size: 14pt;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 12px;
      text-align: center;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
    }

    thead th {
      background: #1a1a2e;
      color: #fff;
      font-weight: 600;
      padding: 10px 12px;
      text-align: right;
      font-size: 10pt;
    }

    thead th:first-child {
      border-radius: 0 8px 0 0;
    }

    thead th:last-child {
      border-radius: 8px 0 0 0;
    }

    tbody tr {
      border-bottom: 1px solid #e5e7eb;
    }

    tbody tr:nth-child(even) {
      background: #f9fafb;
    }

    tbody td {
      padding: 9px 12px;
      text-align: right;
      font-size: 10pt;
    }

    .expense-status {
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 9pt;
      font-weight: 600;
      display: inline-block;
    }

    .expense-status.approved {
      background: #dcfce7;
      color: #166534;
    }

    .expense-status.pending {
      background: #fef3c7;
      color: #92400e;
    }

    .totals-row {
      font-weight: 700;
      background: #f0f9ff !important;
      border-top: 2px solid #1a1a2e;
    }

    .totals-row td {
      padding: 10px 12px;
      font-size: 11pt;
    }

    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 2px solid #e5e7eb;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      text-align: center;
      font-size: 10pt;
    }

    .footer .signature-box {
      padding-top: 40px;
      border-top: 1px dashed #9ca3af;
    }

    .footer .signature-label {
      color: #6b7280;
      font-weight: 500;
    }

    .notes-section {
      margin-top: 16px;
      padding: 10px 14px;
      background: #f9fafb;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      font-size: 10pt;
    }

    .notes-section .notes-label {
      font-weight: 600;
      color: #6b7280;
      margin-bottom: 4px;
    }

    .print-date {
      text-align: center;
      font-size: 9pt;
      color: #9ca3af;
      margin-top: 20px;
    }

    .print-btn {
      position: fixed;
      top: 20px;
      left: 20px;
      padding: 10px 24px;
      background: #2563eb;
      color: #fff;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-family: 'IBM Plex Sans Arabic', sans-serif;
      font-size: 12pt;
      font-weight: 600;
    }

    .print-btn:hover {
      background: #1d4ed8;
    }

    .row-num {
      width: 40px;
      text-align: center !important;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨️ طباعة</button>

  <div class="header">
    <h1>تقرير تفاصيل النثرية</h1>
    <div class="period-number">${period.period_number}</div>
    <div class="subtitle">نظام إدارة المخزن - DTS Store Management</div>
  </div>

  <div class="summary-grid">
    <div class="summary-card status ${period.status !== 'open' ? 'closed' : ''}">
      <div class="label">الحالة</div>
      <div class="value">${statusLabels[period.status] || period.status}</div>
    </div>
    <div class="summary-card">
      <div class="label">الرصيد الافتتاحي</div>
      <div class="value value-blue">${formatNumber(period.opening_balance)}</div>
      <div class="currency">ريال</div>
    </div>
    <div class="summary-card">
      <div class="label">إجمالي المصاريف</div>
      <div class="value value-red">${formatNumber(period.total_expenses)}</div>
      <div class="currency">ريال</div>
    </div>
    <div class="summary-card">
      <div class="label">الرصيد المتبقي</div>
      <div class="value ${period.current_balance < 0 ? 'value-red' : 'value-green'}">${formatNumber(period.current_balance)}</div>
      <div class="currency">ريال</div>
    </div>
  </div>

  <div class="usage-bar-container">
    <div class="usage-bar-header">
      <span class="label">نسبة الاستهلاك</span>
      <span class="percentage">${usagePercentage}%</span>
    </div>
    <div class="usage-bar">
      <div class="usage-bar-fill" style="width: ${Math.min(usagePercentage, 100)}%"></div>
    </div>
  </div>

  <div class="details-section">
    <div class="details-grid">
      <div class="detail-item">
        <span class="detail-label">المسؤول:</span>
        <span class="detail-value">${period.responsible_person}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">الموقع:</span>
        <span class="detail-value">${period.location}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">تاريخ الفتح:</span>
        <span class="detail-value">${formatDate(period.opened_at)}</span>
      </div>
      ${period.closed_at ? `
      <div class="detail-item">
        <span class="detail-label">تاريخ الإغلاق:</span>
        <span class="detail-value">${formatDate(period.closed_at)}</span>
      </div>` : ''}
    </div>
  </div>

  ${period.notes ? `
  <div class="notes-section">
    <div class="notes-label">ملاحظات:</div>
    <div>${period.notes}</div>
  </div>` : ''}

  <div class="expenses-section">
    <h2>مصروفات النثرية (${expenses.length})</h2>
    ${expenses.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th class="row-num">م</th>
          <th>التاريخ</th>
          <th>المورد</th>
          <th>الوصف</th>
          <th>المبلغ</th>
          <th>الحالة</th>
        </tr>
      </thead>
      <tbody>
        ${expenses.map((exp, i) => `
        <tr>
          <td class="row-num">${i + 1}</td>
          <td>${formatDate(exp.expense_date)}</td>
          <td>${exp.vendor_name}</td>
          <td>${exp.description}</td>
          <td style="font-weight:600">${formatNumber(exp.total_amount || 0)} ريال</td>
          <td><span class="expense-status ${exp.status}">${statusLabels[exp.status] || exp.status}</span></td>
        </tr>`).join('')}
        <tr class="totals-row">
          <td colspan="4" style="text-align:center">الإجمالي</td>
          <td>${formatNumber(period.total_expenses)} ريال</td>
          <td></td>
        </tr>
      </tbody>
    </table>` : '<p style="text-align:center;color:#6b7280;padding:20px;">لا توجد مصروفات في هذه الفترة</p>'}
  </div>

  <div class="footer">
    <div>
      <div class="signature-box"></div>
      <div class="signature-label">توقيع المسؤول</div>
    </div>
    <div>
      <div class="signature-box"></div>
      <div class="signature-label">توقيع المدير</div>
    </div>
    <div>
      <div class="signature-box"></div>
      <div class="signature-label">توقيع المدقق</div>
    </div>
  </div>

  <div class="print-date">تم الطباعة بتاريخ: ${new Date().toLocaleDateString('en-GB')}</div>
</body>
</html>`;

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
      setTimeout(() => {
        frameWindow.print();
      }, 250);

      frameWindow.onafterprint = cleanup;
      setTimeout(cleanup, 1500);
    };

    iframe.src = blobUrl;
    document.body.appendChild(iframe);
  };

  return (
    <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
      <Printer className="w-4 h-4" />
      {t('print') || (language === 'ar' ? 'طباعة' : 'Print')}
    </Button>
  );
}
