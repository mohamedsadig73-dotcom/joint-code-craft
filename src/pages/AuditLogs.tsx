import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FileText, Shield, RefreshCw, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/EmptyState';
import { TableSkeleton, CardSkeleton } from '@/components/ui/TableSkeleton';
import { 
  auditActionLabels, 
  auditActionColors, 
  tableLabels,
  emptyStateMessages 
} from '@/constants/statusLabels';

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
  const { t, language } = useLanguage();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterTable, setFilterTable] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

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
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadLogs();
    }
  }, [user, loadLogs]);

  const getActionBadge = (action: string) => {
    const actionLabelsTranslated: Record<string, string> = {
      CREATE: t('createAction'),
      UPDATE: t('updateAction'),
      DELETE: t('deleteAction'),
      ASSIGN_ROLE: t('assignRole'),
      UPDATE_ROLE: t('updateRole'),
      REMOVE_ROLE: t('removeRole'),
      FAILED_LOGIN: t('failedLoginAttempt'),
    };
    
    return (
      <Badge className={auditActionColors[action] || 'bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30'}>
        {actionLabelsTranslated[action] || auditActionLabels[action] || action}
      </Badge>
    );
  };

  const getTableLabel = (tableName: string) => {
    const tableLabelsTranslated: Record<string, string> = {
      declarations: t('declarationsTable'),
      user_roles: t('userRolesTable'),
      maintenance_items: t('maintenanceItemsTable'),
      maintenance_schedule: t('maintenanceScheduleTable'),
    };
    return tableLabelsTranslated[tableName] || tableLabels[tableName] || tableName;
  };

  const filteredLogs = useMemo(() => logs.filter(log => {
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    const matchesTable = filterTable === 'all' || log.table_name === filterTable;
    const matchesSearch = searchTerm === '' || 
      log.record_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.profiles?.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.profiles?.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesAction && matchesTable && matchesSearch;
  }), [logs, filterAction, filterTable, searchTerm]);

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="glass-card border-border/50 p-8 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">{t('unauthorized')}</h2>
            <p className="text-muted-foreground">{t('adminOnlyPage')}</p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 gradient-text">
            {t('auditLogsTitle')}
          </h1>
          <p className="text-muted-foreground">
            {t('auditLogsDesc')}
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
              <div className="text-sm text-muted-foreground">{t('totalLogs')}</div>
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
              <div className="text-sm text-muted-foreground">{t('createOperations')}</div>
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
              <div className="text-sm text-muted-foreground">{t('updateOperations')}</div>
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
              <div className="text-sm text-muted-foreground">{t('deleteOperations')}</div>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="glass-card border-border/50 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                <Input
                  placeholder={t('searchByIdOrUser')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={language === 'ar' ? 'pr-10' : 'pl-10'}
                />
              </div>
            </div>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder={t('operationType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allOperations')}</SelectItem>
                <SelectItem value="CREATE">{t('createAction')}</SelectItem>
                <SelectItem value="UPDATE">{t('updateAction')}</SelectItem>
                <SelectItem value="DELETE">{t('deleteAction')}</SelectItem>
                <SelectItem value="ASSIGN_ROLE">{t('assignRole')}</SelectItem>
                <SelectItem value="UPDATE_ROLE">{t('updateRole')}</SelectItem>
                <SelectItem value="REMOVE_ROLE">{t('removeRole')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterTable} onValueChange={setFilterTable}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder={t('tableFilter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allTables')}</SelectItem>
                <SelectItem value="declarations">{t('declarationsTable')}</SelectItem>
                <SelectItem value="user_roles">{t('userRolesTable')}</SelectItem>
                <SelectItem value="maintenance_items">{t('maintenanceItemsTable')}</SelectItem>
                <SelectItem value="maintenance_schedule">{t('maintenanceScheduleTable')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadLogs}>
              <RefreshCw className="w-4 h-4 me-2" />
              {t('refresh')}
            </Button>
          </div>
        </Card>

        {/* Logs Table */}
        <Card className="glass-card border-border/50">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">{t('logsTableTitle')}</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('dateTimeColumn')}</TableHead>
                  <TableHead>{t('userColumn')}</TableHead>
                  <TableHead>{t('operationColumn')}</TableHead>
                  <TableHead>{t('tableColumn')}</TableHead>
                  <TableHead>{t('idColumn')}</TableHead>
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
                        {new Date(log.created_at).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.profiles?.username || t('unknownUser')}</div>
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