import ExcelJS from 'exceljs';

export interface ExportDeclaration {
  id: string;
  type: string;
  sender: string;
  status: string;
  created_at: string;
}

export const exportDeclarationsToExcel = async (
  declarations: ExportDeclaration[],
  fileName: string = 'declarations'
) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Declaration System';
  wb.created = new Date();

  const ws = wb.addWorksheet('الإقرارات');

  ws.columns = [
    { header: 'رقم الإقرار', key: 'id', width: 20 },
    { header: 'النوع', key: 'type', width: 15 },
    { header: 'المرسل', key: 'sender', width: 20 },
    { header: 'الحالة', key: 'status', width: 15 },
    { header: 'تاريخ الإنشاء', key: 'created_at', width: 22 },
  ];

  // Style header row
  ws.getRow(1).eachCell(cell => {
    cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  declarations.forEach(dec => {
    ws.addRow({
      id: dec.id,
      type: dec.type,
      sender: dec.sender,
      status: dec.status,
      created_at: dec.created_at,
    });
  });

  const timestamp = new Date().toISOString().split('T')[0];
  const fullFileName = `${fileName}_${timestamp}.xlsx`;

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fullFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return fullFileName;
};
