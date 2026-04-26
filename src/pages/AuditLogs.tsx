import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { FileText, Shield, RefreshCw, Search, Download, FileSpreadsheet, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { TableSkeleton, CardSkeleton } from '@/components/ui/TableSkeleton';
import { VirtualizedList } from '@/components/VirtualizedList';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatDateTime, formatDate } from '@/utils/dateUtils';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  auditActionLabels, 
  auditActionColors, 
  tableLabels,
  emptyStateMessages 
} from '@/constants/statusLabels';
import { exportAuditLogsToExcel, exportAuditLogsToPDF, AuditLogExport } from '@/utils/auditExport';
interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  old_values: any;
  new_values: any;
  created_at: string;
  profiles?: {
    username: string;
    email: string;
  } | null;
}

export default function AuditLogs() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterTable, setFilterTable] = useState<string>(searchParams.get('table') || 'all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [partNoFilter, setPartNoFilter] = useState(searchParams.get('partNo') || '');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date | undefined>(endOfMonth(new Date()));

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      const userIds = [...new Set(data?.map(log => log.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, email')
        .in('id', userIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]));
      
      const logsWithProfiles = data?.map(log => ({
        ...log,
        profiles: profilesMap.get(log.user_id) || null,
      })) || [];

      setLogs(logsWithProfiles as any);
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadLogs();
    }
  }, [user, loadLogs]);
  const getActionBadge = (action: string) => {
    return (
      <Badge className={auditActionColors[action] || 'bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30'}>
        {auditActionLabels[action] || action}
      </Badge>
    );
  };

  const getTableLabel = (tableName: string) => {
    return tableLabels[tableName] || tableName;
  };

  // Get unique users for filter
  const uniqueUsers = useMemo(() => {
    const users = new Map<string, { username: string; email: string }>();
    logs.forEach(log => {
      if (log.profiles && !users.has(log.user_id)) {
        users.set(log.user_id, { username: log.profiles.username, email: log.profiles.email });
      }
    });
    return Array.from(users.entries()).map(([id, data]) => ({ id, ...data }));
  }, [logs]);

  const filteredLogs = useMemo(() => logs.filter(log => {
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    const matchesTable = filterTable === 'all' || log.table_name === filterTable;
    const matchesUser = filterUser === 'all' || log.user_id === filterUser;
    const matchesSearch = searchTerm === '' || 
      log.record_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.profiles?.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.profiles?.email.toLowerCase().includes(searchTerm.toLowerCase());

    // Filter by part number — peeks into the new_values / old_values JSON
    const partNoQ = partNoFilter.trim().toLowerCase();
    const partFromValues = (() => {
      const a = (log.new_values?.part_no ?? '') as string;
      const b = (log.old_values?.part_no ?? '') as string;
      return `${a} ${b}`.toLowerCase();
    })();
    const matchesPartNo = partNoQ === '' || partFromValues.includes(partNoQ);
    
    // Date filtering
    const logDate = new Date(log.created_at);
    const matchesDateFrom = !dateFrom || logDate >= dateFrom;
    const matchesDateTo = !dateTo || logDate <= new Date(dateTo.setHours(23, 59, 59, 999));
    
    return matchesAction && matchesTable && matchesUser && matchesSearch && matchesPartNo && matchesDateFrom && matchesDateTo;
  }), [logs, filterAction, filterTable, filterUser, searchTerm, partNoFilter, dateFrom, dateTo]);

  // Export functions
  const handleExportExcel = useCallback(async () => {
    try {
      setExporting('excel');
      const exportData: AuditLogExport[] = filteredLogs.map(log => ({
        id: log.id,
        user_id: log.user_id,
        action: log.action,
        table_name: log.table_name,
        record_id: log.record_id,
        part_no: (log.new_values?.part_no ?? log.old_values?.part_no ?? null) as string | null,
        created_at: log.created_at,
        profiles: log.profiles,
      }));
      
      await exportAuditLogsToExcel(exportData, 'audit_logs');
      toast({ title: 'تم التصدير', description: 'تم تصدير السجلات إلى Excel بنجاح' });
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } finally {
      setExporting(null);
    }
  }, [filteredLogs]);

  const handleExportPDF = useCallback(async () => {
    try {
      setExporting('pdf');
      const exportData: AuditLogExport[] = filteredLogs.map(log => ({
        id: log.id,
        user_id: log.user_id,
        action: log.action,
        table_name: log.table_name,
        record_id: log.record_id,
        part_no: (log.new_values?.part_no ?? log.old_values?.part_no ?? null) as string | null,
        created_at: log.created_at,
        profiles: log.profiles,
      }));
      
      const dateRange = dateFrom && dateTo 
        ? `${formatDate(dateFrom)} - ${formatDate(dateTo)}`
        : new Date().toLocaleDateString('ar-SA');
      
      await exportAuditLogsToPDF(exportData, 'سجل التدقيق', dateRange);
      toast({ title: 'تم التصدير', description: 'تم تصدير السجلات إلى PDF بنجاح' });
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } finally {
      setExporting(null);
    }
  }, [filteredLogs, dateFrom, dateTo]);
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="glass-card border-border/50 p-8 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">غير مصرح</h2>
            <p className="text-muted-foreground">هذه الصفحة متاحة للمسؤولين فقط</p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 gradient-text">
            سجل التدقيق (Audit Logs)
          </h1>
          <p className="text-muted-foreground">
            سجل شامل لجميع العمليات المهمة في النظام
          </p>
        </div>

        {/* Statistics */}
        {loading ? (
          <CardSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="glass-card border-border/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="text-3xl font-bold mb-1">{logs.length}</div>
              <div className="text-sm text-muted-foreground">إجمالي السجلات</div>
            </Card>

            <Card className="glass-card border-border/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-green-500/10">
                  <FileText className="w-6 h-6 text-green-700 dark:text-green-300" />
                </div>
              </div>
              <div className="text-3xl font-bold mb-1">
                {logs.filter(l => l.action === 'CREATE').length}
              </div>
              <div className="text-sm text-muted-foreground">عمليات إنشاء</div>
            </Card>

            <Card className="glass-card border-border/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-blue-500/10">
                  <FileText className="w-6 h-6 text-blue-700 dark:text-blue-300" />
                </div>
              </div>
              <div className="text-3xl font-bold mb-1">
                {logs.filter(l => l.action === 'UPDATE').length}
              </div>
              <div className="text-sm text-muted-foreground">عمليات تحديث</div>
            </Card>

            <Card className="glass-card border-border/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-red-500/10">
                  <FileText className="w-6 h-6 text-red-700 dark:text-red-300" />
                </div>
              </div>
              <div className="text-3xl font-bold mb-1">
                {logs.filter(l => l.action === 'DELETE').length}
              </div>
              <div className="text-sm text-muted-foreground">عمليات حذف</div>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="glass-card border-border/50 p-6 mb-8">
          <div className="flex flex-col gap-4">
            {/* Row 1: Search + Export buttons */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex-1 w-full md:max-w-2xl flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث بالمعرف أو المستخدم..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <Input
                  placeholder="فلترة برقم القطعة..."
                  value={partNoFilter}
                  onChange={(e) => setPartNoFilter(e.target.value)}
                  className="font-mono sm:max-w-[200px]"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button 
                  variant="outline" 
                  onClick={handleExportExcel} 
                  disabled={exporting !== null || filteredLogs.length === 0}
                >
                  {exporting === 'excel' ? (
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4 ml-2" />
                  )}
                  تصدير Excel
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleExportPDF} 
                  disabled={exporting !== null || filteredLogs.length === 0}
                >
                  {exporting === 'pdf' ? (
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 ml-2" />
                  )}
                  تصدير PDF
                </Button>
                <Button variant="outline" onClick={loadLogs} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
                  تحديث
                </Button>
              </div>
            </div>
            
            {/* Row 2: Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="نوع العملية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع العمليات</SelectItem>
                  <SelectItem value="CREATE">إنشاء</SelectItem>
                  <SelectItem value="UPDATE">تحديث</SelectItem>
                  <SelectItem value="DELETE">حذف</SelectItem>
                  <SelectItem value="ASSIGN_ROLE">تعيين دور</SelectItem>
                  <SelectItem value="UPDATE_ROLE">تحديث دور</SelectItem>
                  <SelectItem value="REMOVE_ROLE">إزالة دور</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterTable} onValueChange={setFilterTable}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="الجدول" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الجداول</SelectItem>
                  <SelectItem value="declarations">الإقرارات</SelectItem>
                  <SelectItem value="user_roles">أدوار المستخدمين</SelectItem>
                  <SelectItem value="maintenance_items">بنود الصيانة</SelectItem>
                  <SelectItem value="maintenance_schedule">جدول الصيانة</SelectItem>
                  <SelectItem value="box_receipts">سجل الاستلام (الصناديق)</SelectItem>
                  <SelectItem value="shipping_containers">حاويات الشحن</SelectItem>
                  <SelectItem value="container_items">عناصر الحاوية</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant={filterTable === 'box_receipts' ? 'default' : 'outline'}
                size="sm"
                onClick={() =>
                  setFilterTable(filterTable === 'box_receipts' ? 'all' : 'box_receipts')
                }
                className="gap-1.5"
              >
                <FileText className="w-4 h-4" />
                Receipts only
              </Button>
              
              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="المستخدم" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المستخدمين</SelectItem>
                  {uniqueUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full md:w-[160px] justify-start text-right">
                    <CalendarIcon className="w-4 h-4 ml-2" />
                    {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'من تاريخ'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    locale={ar}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full md:w-[160px] justify-start text-right">
                    <CalendarIcon className="w-4 h-4 ml-2" />
                    {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'إلى تاريخ'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    locale={ar}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Results count */}
            <div className="text-sm text-muted-foreground">
              عرض {filteredLogs.length} من {logs.length} سجل
            </div>
          </div>
        </Card>

        {/* Logs Table */}
        <Card className="glass-card border-border/50">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">السجلات</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ والوقت</TableHead>
                  <TableHead>المستخدم</TableHead>
                  <TableHead>العملية</TableHead>
                  <TableHead>الجدول</TableHead>
                  <TableHead>المعرف</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
                {loading ? (
                  <TableSkeleton rows={5} columns={5} />
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="p-0">
                      <EmptyState
                        variant="search"
                        title={emptyStateMessages.auditLogs.title}
                        description={emptyStateMessages.auditLogs.description}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {formatDateTime(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.profiles?.username || 'غير معروف'}</div>
                          <div className="text-sm text-muted-foreground">{log.profiles?.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell>{getTableLabel(log.table_name)}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.record_id?.substring(0, 8)}...
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>
    </div>
  );
}