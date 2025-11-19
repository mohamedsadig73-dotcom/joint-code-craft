import * as XLSX from 'xlsx';

export interface ExportDeclaration {
  id: string;
  type: string;
  sender: string;
  status: string;
  created_at: string;
}

export const exportDeclarationsToExcel = (
  declarations: ExportDeclaration[],
  fileName: string = 'declarations'
) => {
  // Prepare data with Arabic headers
  const exportData = declarations.map((dec) => ({
    'رقم الإقرار': dec.id,
    'النوع': dec.type,
    'المرسل': dec.sender,
    'الحالة': dec.status,
    'تاريخ الإنشاء': dec.created_at,
  }));

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Set column widths for better readability
  ws['!cols'] = [
    { wch: 20 }, // رقم الإقرار
    { wch: 15 }, // النوع
    { wch: 20 }, // المرسل
    { wch: 15 }, // الحالة
    { wch: 22 }, // تاريخ الإنشاء
  ];

  // Style the header row
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellAddress]) continue;
    
    ws[cellAddress].s = {
      font: { bold: true, sz: 12 },
      fill: { fgColor: { rgb: '3B82F6' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  }

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الإقرارات');

  // Add metadata
  wb.Props = {
    Title: 'تقرير الإقرارات',
    Subject: 'Declarations Report',
    Author: 'Declaration System',
    CreatedDate: new Date(),
  };

  // Generate file name with timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  const fullFileName = `${fileName}_${timestamp}.xlsx`;

  // Write file
  XLSX.writeFile(wb, fullFileName, {
    bookType: 'xlsx',
    type: 'binary',
  });

  return fullFileName;
};
