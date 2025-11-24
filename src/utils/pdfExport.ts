import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportDeclaration {
  id: string;
  type: string;
  sender: string;
  status: string;
  created_at: string;
}

export const exportDeclarationsToPDF = (
  declarations: ExportDeclaration[],
  title: string = 'تقرير الإقرارات'
) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Set document properties
  doc.setProperties({
    title: title,
    subject: 'Declarations Report',
    author: 'Declaration System',
    keywords: 'declarations, report',
    creator: 'Declaration System',
  });

  // Add title
  doc.setFontSize(18);
  doc.setTextColor(31, 41, 55); // gray-800
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.text(title, pageWidth / 2, 20, { align: 'center' });

  // Add date and time
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128); // gray-500
  const currentDate = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`تاريخ التصدير: ${currentDate}`, pageWidth / 2, 28, { align: 'center' });

  // Add statistics
  doc.setFontSize(9);
  doc.text(`عدد الإقرارات: ${declarations.length}`, 20, 35);

  // Prepare table data
  const tableData = declarations.map((dec) => [
    dec.id,
    dec.type,
    dec.sender,
    dec.status,
    dec.created_at,
  ]);

  // Generate table
  autoTable(doc, {
    startY: 42,
    head: [['رقم الإقرار', 'النوع', 'المرسل', 'الحالة', 'تاريخ الإنشاء']],
    body: tableData,
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 3,
      halign: 'center',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [59, 130, 246], // blue-500
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251], // gray-50
    },
    columnStyles: {
      0: { cellWidth: 45 }, // ID
      1: { cellWidth: 35 }, // Type
      2: { cellWidth: 45 }, // Sender
      3: { cellWidth: 35 }, // Status
      4: { cellWidth: 45 }, // Date
    },
    margin: { top: 42, left: 15, right: 15 },
    theme: 'grid',
    tableLineColor: [229, 231, 235], // gray-200
    tableLineWidth: 0.1,
  });

  // Add footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(
      `صفحة ${i} من ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  return doc;
};
