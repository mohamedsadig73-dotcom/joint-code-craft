import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf, Font } from '@react-pdf/renderer';

// Register a font that supports Arabic (optional - falls back to system fonts)
// For full Arabic support, you would need to register an Arabic font

export interface ExportDeclaration {
  id: string;
  type: string;
  sender: string;
  status: string;
  created_at: string;
}

// Create styles for PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  stat: {
    fontSize: 9,
    color: '#4b5563',
  },
  table: {
    width: '100%',
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#3b82f6',
    padding: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 6,
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 6,
    backgroundColor: '#f9fafb',
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  tableCell: {
    flex: 1,
    fontSize: 9,
    color: '#374151',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
  },
  pageNumber: {
    fontSize: 8,
    color: '#6b7280',
  },
});

// PDF Document Component
const DeclarationsDocument = ({ 
  declarations, 
  title,
  currentDate 
}: { 
  declarations: ExportDeclaration[]; 
  title: string;
  currentDate: string;
}) => (
  <Document>
    <Page size="A4" orientation="landscape" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>Export Date: {currentDate}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <Text style={styles.stat}>Total Records: {declarations.length}</Text>
      </View>

      {/* Table */}
      <View style={styles.table}>
        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderCell}>ID</Text>
          <Text style={styles.tableHeaderCell}>Type</Text>
          <Text style={styles.tableHeaderCell}>Sender</Text>
          <Text style={styles.tableHeaderCell}>Status</Text>
          <Text style={styles.tableHeaderCell}>Created At</Text>
        </View>

        {/* Table Body */}
        {declarations.map((dec, index) => (
          <View 
            key={dec.id} 
            style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
          >
            <Text style={styles.tableCell}>{dec.id.slice(0, 8)}...</Text>
            <Text style={styles.tableCell}>{dec.type}</Text>
            <Text style={styles.tableCell}>{dec.sender}</Text>
            <Text style={styles.tableCell}>{dec.status}</Text>
            <Text style={styles.tableCell}>{dec.created_at}</Text>
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer} fixed>
        <Text 
          style={styles.pageNumber} 
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} 
        />
      </View>
    </Page>
  </Document>
);

// Maintenance PDF Document Component
const MaintenanceDocument = ({ 
  data, 
  year,
  title,
  currentDate,
  stats
}: { 
  data: ExportDeclaration[]; 
  year: number;
  title: string;
  currentDate: string;
  stats: {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    overdueTasks: number;
    completionRate: string;
    totalCost: number;
  };
}) => (
  <Document>
    <Page size="A4" orientation="landscape" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>Year: {year} | Export Date: {currentDate}</Text>
      </View>

      {/* Table */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderCell}>ID</Text>
          <Text style={styles.tableHeaderCell}>Item</Text>
          <Text style={styles.tableHeaderCell}>Month</Text>
          <Text style={styles.tableHeaderCell}>Status</Text>
          <Text style={styles.tableHeaderCell}>Date</Text>
        </View>

        {data.map((item, index) => (
          <View 
            key={item.id} 
            style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
          >
            <Text style={styles.tableCell}>{item.id.slice(0, 8)}...</Text>
            <Text style={styles.tableCell}>{item.type}</Text>
            <Text style={styles.tableCell}>{item.sender}</Text>
            <Text style={styles.tableCell}>{item.status}</Text>
            <Text style={styles.tableCell}>{item.created_at}</Text>
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer} fixed>
        <Text 
          style={styles.pageNumber} 
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} 
        />
      </View>
    </Page>

    {/* Stats Page */}
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Performance Statistics</Text>
      </View>
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 12, marginBottom: 10 }}>Total Tasks: {stats.totalTasks}</Text>
        <Text style={{ fontSize: 12, marginBottom: 10 }}>Completed Tasks: {stats.completedTasks}</Text>
        <Text style={{ fontSize: 12, marginBottom: 10 }}>Pending Tasks: {stats.pendingTasks}</Text>
        <Text style={{ fontSize: 12, marginBottom: 10 }}>Overdue Tasks: {stats.overdueTasks}</Text>
        <Text style={{ fontSize: 12, marginBottom: 10 }}>Completion Rate: {stats.completionRate}%</Text>
        <Text style={{ fontSize: 12, marginBottom: 10 }}>Total Actual Cost: {stats.totalCost.toFixed(2)} SAR</Text>
      </View>
    </Page>
  </Document>
);

// Export function that generates and downloads PDF
export const exportDeclarationsToPDFSecure = async (
  declarations: ExportDeclaration[],
  title: string = 'Declarations Report'
): Promise<void> => {
  const currentDate = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const blob = await pdf(
    <DeclarationsDocument 
      declarations={declarations} 
      title={title}
      currentDate={currentDate}
    />
  ).toBlob();

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export interface MaintenanceReportData {
  id: string;
  item_name: string;
  month: number;
  year: number;
  status: string;
  scheduled_date: string;
  executed_date: string | null;
  actual_cost: number | null;
  notes: string | null;
}

const STATUS_MAP: Record<string, string> = {
  pending: 'Required',
  done: 'Done',
  not_required: 'Not Required',
  overdue: 'Overdue',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const exportMaintenanceToPDFSecure = async (
  data: MaintenanceReportData[],
  year: number,
  title: string = 'Maintenance Report'
): Promise<void> => {
  const currentDate = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Calculate stats
  const totalTasks = data.length;
  const completedTasks = data.filter(d => d.status === 'done').length;
  const pendingTasks = data.filter(d => d.status === 'pending').length;
  const overdueTasks = data.filter(d => d.status === 'overdue').length;
  const totalCost = data
    .filter(d => d.actual_cost !== null)
    .reduce((sum, d) => sum + (d.actual_cost || 0), 0);
  const completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : '0';

  // Convert data for export
  const exportData: ExportDeclaration[] = data.map((item) => ({
    id: item.id,
    type: item.item_name,
    sender: `${MONTHS[item.month - 1]} ${item.year}`,
    status: STATUS_MAP[item.status] || item.status,
    created_at: item.executed_date || item.scheduled_date,
  }));

  const blob = await pdf(
    <MaintenanceDocument 
      data={exportData}
      year={year}
      title={title}
      currentDate={currentDate}
      stats={{
        totalTasks,
        completedTasks,
        pendingTasks,
        overdueTasks,
        completionRate,
        totalCost,
      }}
    />
  ).toBlob();

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `maintenance_report_${year}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
