import * as XLSX from 'xlsx';
import { pdf } from '@react-pdf/renderer';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import React from 'react';
import { formatDateTime } from '@/utils/dateUtils';

export interface AuditLogExport {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  created_at: string;
  profiles?: {
    username: string;
    email: string;
  } | null;
}

const actionLabelsAr: Record<string, string> = {
  CREATE: 'إنشاء',
  UPDATE: 'تحديث',
  DELETE: 'حذف',
  ASSIGN_ROLE: 'تعيين دور',
  UPDATE_ROLE: 'تحديث دور',
  REMOVE_ROLE: 'إزالة دور',
  FAILED_LOGIN: 'محاولة دخول فاشلة',
};

const tableLabelsAr: Record<string, string> = {
  declarations: 'الإقرارات',
  user_roles: 'أدوار المستخدمين',
  profiles: 'الملفات الشخصية',
  maintenance_items: 'بنود الصيانة',
  maintenance_schedule: 'جدول الصيانة',
  'auth.users': 'المستخدمين',
};

export const exportAuditLogsToExcel = (
  logs: AuditLogExport[],
  fileName: string = 'audit_logs'
) => {
  const exportData = logs.map((log) => ({
    'التاريخ والوقت': formatDateTime(log.created_at),
    'المستخدم': log.profiles?.username || 'غير معروف',
    'البريد الإلكتروني': log.profiles?.email || '-',
    'العملية': actionLabelsAr[log.action] || log.action,
    'الجدول': tableLabelsAr[log.table_name] || log.table_name,
    'معرف السجل': log.record_id || '-',
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);

  ws['!cols'] = [
    { wch: 20 },
    { wch: 18 },
    { wch: 25 },
    { wch: 15 },
    { wch: 18 },
    { wch: 40 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'سجل التدقيق');

  wb.Props = {
    Title: 'سجل التدقيق',
    Subject: 'Audit Logs Report',
    Author: 'Declaration System',
    CreatedDate: new Date(),
  };

  const timestamp = new Date().toISOString().split('T')[0];
  const fullFileName = `${fileName}_${timestamp}.xlsx`;

  XLSX.writeFile(wb, fullFileName, {
    bookType: 'xlsx',
    type: 'binary',
  });

  return fullFileName;
};

// PDF Styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 5,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row-reverse',
    backgroundColor: '#3B82F6',
    padding: 8,
    borderRadius: 4,
  },
  tableHeaderText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row-reverse',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 6,
    minHeight: 30,
  },
  tableCell: {
    fontSize: 8,
    color: '#374151',
    textAlign: 'center',
  },
  col1: { width: '15%' },
  col2: { width: '15%' },
  col3: { width: '20%' },
  col4: { width: '12%' },
  col5: { width: '15%' },
  col6: { width: '23%' },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 8,
  },
  statsContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    marginTop: 20,
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 4,
  },
});

interface AuditPDFProps {
  logs: AuditLogExport[];
  title: string;
  dateRange?: string;
}

const AuditLogsPDFDocument: React.FC<AuditPDFProps> = ({ logs, title, dateRange }) => {
  const stats = {
    total: logs.length,
    creates: logs.filter(l => l.action === 'CREATE').length,
    updates: logs.filter(l => l.action === 'UPDATE').length,
    deletes: logs.filter(l => l.action === 'DELETE').length,
  };

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.title }, title),
        React.createElement(
          Text,
          { style: styles.subtitle },
          `Audit Logs Report - ${dateRange || new Date().toLocaleDateString('ar-SA')}`
        )
      ),
      // Stats
      React.createElement(
        View,
        { style: styles.statsContainer },
        React.createElement(
          View,
          { style: styles.statItem },
          React.createElement(Text, { style: styles.statValue }, stats.total.toString()),
          React.createElement(Text, { style: styles.statLabel }, 'Total')
        ),
        React.createElement(
          View,
          { style: styles.statItem },
          React.createElement(Text, { style: styles.statValue }, stats.creates.toString()),
          React.createElement(Text, { style: styles.statLabel }, 'Create')
        ),
        React.createElement(
          View,
          { style: styles.statItem },
          React.createElement(Text, { style: styles.statValue }, stats.updates.toString()),
          React.createElement(Text, { style: styles.statLabel }, 'Update')
        ),
        React.createElement(
          View,
          { style: styles.statItem },
          React.createElement(Text, { style: styles.statValue }, stats.deletes.toString()),
          React.createElement(Text, { style: styles.statLabel }, 'Delete')
        )
      ),
      // Table
      React.createElement(
        View,
        { style: styles.table },
        // Table Header
        React.createElement(
          View,
          { style: styles.tableHeader },
          React.createElement(Text, { style: [styles.tableHeaderText, styles.col1] }, 'Date'),
          React.createElement(Text, { style: [styles.tableHeaderText, styles.col2] }, 'User'),
          React.createElement(Text, { style: [styles.tableHeaderText, styles.col3] }, 'Email'),
          React.createElement(Text, { style: [styles.tableHeaderText, styles.col4] }, 'Action'),
          React.createElement(Text, { style: [styles.tableHeaderText, styles.col5] }, 'Table'),
          React.createElement(Text, { style: [styles.tableHeaderText, styles.col6] }, 'Record ID')
        ),
        // Table Rows (limit to 30 for PDF readability)
        ...logs.slice(0, 30).map((log, index) =>
          React.createElement(
            View,
            { key: log.id, style: [styles.tableRow, { backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb' }] },
            React.createElement(Text, { style: [styles.tableCell, styles.col1] }, formatDateTime(log.created_at).split(' - ')[0]),
            React.createElement(Text, { style: [styles.tableCell, styles.col2] }, log.profiles?.username || 'Unknown'),
            React.createElement(Text, { style: [styles.tableCell, styles.col3] }, log.profiles?.email || '-'),
            React.createElement(Text, { style: [styles.tableCell, styles.col4] }, actionLabelsAr[log.action] || log.action),
            React.createElement(Text, { style: [styles.tableCell, styles.col5] }, tableLabelsAr[log.table_name] || log.table_name),
            React.createElement(Text, { style: [styles.tableCell, styles.col6] }, log.record_id?.substring(0, 20) || '-')
          )
        )
      ),
      // Footer
      React.createElement(
        Text,
        { style: styles.footer },
        `Page 1 | Generated: ${new Date().toLocaleString('ar-SA')}`
      )
    )
  );
};

export const exportAuditLogsToPDF = async (
  logs: AuditLogExport[],
  title: string = 'Audit Logs Report',
  dateRange?: string
): Promise<void> => {
  const doc = React.createElement(AuditLogsPDFDocument, { logs, title, dateRange });
  const blob = await pdf(doc).toBlob();
  
  const timestamp = new Date().toISOString().split('T')[0];
  const fileName = `audit_logs_${timestamp}.pdf`;
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
