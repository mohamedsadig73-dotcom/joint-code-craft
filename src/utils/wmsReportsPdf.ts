import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InventoryStats {
  totalProducts: number;
  totalQuantity: number;
  totalValue: number;
  lowStockCount: number;
  expiringCount: number;
}

interface TransactionStats {
  receives: number;
  shipments: number;
  adjustments: number;
  transfers: number;
}

interface TopProduct {
  name: string;
  sku: string;
  quantity: number;
  value: number;
}

interface LowStockProduct {
  name: string;
  sku: string;
  quantity: number;
  minStock: number;
}

interface ExportData {
  inventoryStats: InventoryStats;
  transactionStats: TransactionStats;
  topProducts: TopProduct[];
  lowStockProducts: LowStockProduct[];
  language: 'ar' | 'en';
}

export const exportWMSReportToPDF = (data: ExportData): void => {
  const { inventoryStats, transactionStats, topProducts, lowStockProducts, language } = data;
  const isRTL = language === 'ar';
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Set font for Arabic support
  doc.setFont('helvetica');
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPos = 20;

  // Title
  doc.setFontSize(24);
  doc.setTextColor(30, 58, 95);
  const title = isRTL ? 'تقرير المستودع' : 'Warehouse Report';
  doc.text(title, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setTextColor(100);
  const dateStr = new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(dateStr, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 15;

  // KPI Section
  doc.setFontSize(14);
  doc.setTextColor(30, 58, 95);
  doc.text(isRTL ? 'ملخص المخزون' : 'Inventory Summary', margin, yPos);
  yPos += 8;

  const kpiData = [
    [
      isRTL ? 'إجمالي الكمية' : 'Total Quantity',
      inventoryStats.totalQuantity.toLocaleString()
    ],
    [
      isRTL ? 'قيمة المخزون' : 'Inventory Value',
      new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
        style: 'currency',
        currency: 'SAR',
        minimumFractionDigits: 0
      }).format(inventoryStats.totalValue)
    ],
    [
      isRTL ? 'مخزون منخفض' : 'Low Stock Items',
      inventoryStats.lowStockCount.toString()
    ],
    [
      isRTL ? 'قريبة الانتهاء' : 'Expiring Soon',
      inventoryStats.expiringCount.toString()
    ]
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: kpiData,
    theme: 'grid',
    styles: {
      fontSize: 11,
      cellPadding: 5,
      halign: isRTL ? 'right' : 'left'
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { cellWidth: 80 }
    },
    margin: { left: margin, right: margin }
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Transaction Stats Section
  doc.setFontSize(14);
  doc.setTextColor(30, 58, 95);
  doc.text(isRTL ? 'إحصائيات الشهر' : 'Monthly Statistics', margin, yPos);
  yPos += 8;

  const transactionData = [
    [isRTL ? 'الاستلام' : 'Receives', transactionStats.receives.toString()],
    [isRTL ? 'الشحنات' : 'Shipments', transactionStats.shipments.toString()],
    [isRTL ? 'التعديلات' : 'Adjustments', transactionStats.adjustments.toString()],
    [isRTL ? 'التحويلات' : 'Transfers', transactionStats.transfers.toString()]
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: transactionData,
    theme: 'grid',
    styles: {
      fontSize: 11,
      cellPadding: 5,
      halign: isRTL ? 'right' : 'left'
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { cellWidth: 80 }
    },
    margin: { left: margin, right: margin }
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Top Products Section
  if (topProducts.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 95);
    doc.text(isRTL ? 'أعلى المنتجات كمية' : 'Top Products by Quantity', margin, yPos);
    yPos += 8;

    const topProductsHeader = isRTL 
      ? [['المنتج', 'SKU', 'الكمية', 'القيمة']]
      : [['Product', 'SKU', 'Quantity', 'Value']];

    const topProductsData = topProducts.map(p => [
      p.name,
      p.sku,
      p.quantity.toLocaleString(),
      new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
        style: 'currency',
        currency: 'SAR',
        minimumFractionDigits: 0
      }).format(p.value)
    ]);

    autoTable(doc, {
      startY: yPos,
      head: topProductsHeader,
      body: topProductsData,
      theme: 'striped',
      headStyles: {
        fillColor: [30, 58, 95],
        textColor: 255,
        fontStyle: 'bold',
        halign: isRTL ? 'right' : 'left'
      },
      styles: {
        fontSize: 10,
        cellPadding: 4,
        halign: isRTL ? 'right' : 'left'
      },
      margin: { left: margin, right: margin }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Low Stock Products Section
  if (lowStockProducts.length > 0) {
    // Check if we need a new page
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(220, 38, 38); // Red color for alerts
    doc.text(isRTL ? 'تنبيه: منتجات تحت الحد الأدنى' : 'Alert: Low Stock Products', margin, yPos);
    yPos += 8;

    const lowStockHeader = isRTL 
      ? [['المنتج', 'SKU', 'الكمية الحالية', 'الحد الأدنى']]
      : [['Product', 'SKU', 'Current Qty', 'Min Stock']];

    const lowStockData = lowStockProducts.map(p => [
      p.name,
      p.sku,
      p.quantity.toString(),
      p.minStock.toString()
    ]);

    autoTable(doc, {
      startY: yPos,
      head: lowStockHeader,
      body: lowStockData,
      theme: 'striped',
      headStyles: {
        fillColor: [220, 38, 38],
        textColor: 255,
        fontStyle: 'bold',
        halign: isRTL ? 'right' : 'left'
      },
      styles: {
        fontSize: 10,
        cellPadding: 4,
        halign: isRTL ? 'right' : 'left'
      },
      margin: { left: margin, right: margin }
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `${isRTL ? 'صفحة' : 'Page'} ${i} / ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  const fileName = `wms-report-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
