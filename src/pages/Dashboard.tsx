import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { FAB } from '@/components/FAB';
import { CreateDeclarationDialog } from '@/components/CreateDeclarationDialog';
import { ArchiveFilesManagement } from '@/components/ArchiveFilesManagement';
import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';
import { DeclarationTableSkeleton } from '@/components/declarations/DeclarationTableSkeleton';
import { StatusQuickAction } from '@/components/declarations/StatusQuickAction';
import { DeclarationRowExpand } from '@/components/declarations/DeclarationRowExpand';
import { StatsCard } from '@/components/ui/StatsCard';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { toGregorianDate, toGregorianDateLong } from '@/utils/dateUtils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Search, 
  Filter, 
  Eye, 
  Trash2, 
  CalendarIcon, 
  X, 
  FileText,
  FolderOpen,
  LayoutDashboard,
  Archive,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Declaration {
  id: string;
  type: 'دخول' | 'خروج';
  sender_id: string;
  sender?: { username: string };
  status: 'draft' | 'pending_warehouse_signature' | 'warehouse_signed' | 'sent_to_admin_office' | 'received_by_admin_office' | 'returned_to_warehouse' | 'archived' | 'rejected';
  archive_number: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  username: string;
}

export default function Dashboard() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [senderFilter, setSenderFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    pending_warehouse_signature: 0,
    warehouse_signed: 0,
    sent_to_admin_office: 0,
    received_by_admin_office: 0,
    returned_to_warehouse: 0,
    archived: 0,
    rejected: 0,
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [declarationToDelete, setDeclarationToDelete] = useState<Declaration | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'n',
      ctrl: true,
      action: () => setCreateDialogOpen(true),
      description: 'New declaration',
    },
  ]);

  const loadDeclarations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('declarations')
        .select(`
          *,
          sender:profiles!sender_id(username)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDeclarations(data || []);
      
      // Calculate stats
      const newStats = {
        total: data?.length || 0,
        draft: data?.filter(d => d.status === 'draft').length || 0,
        pending_warehouse_signature: data?.filter(d => d.status === 'pending_warehouse_signature').length || 0,
        warehouse_signed: data?.filter(d => d.status === 'warehouse_signed').length || 0,
        sent_to_admin_office: data?.filter(d => d.status === 'sent_to_admin_office').length || 0,
        received_by_admin_office: data?.filter(d => d.status === 'received_by_admin_office').length || 0,
        returned_to_warehouse: data?.filter(d => d.status === 'returned_to_warehouse').length || 0,
        archived: data?.filter(d => d.status === 'archived').length || 0,
        rejected: data?.filter(d => d.status === 'rejected').length || 0,
      };
      setStats(newStats);
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
    loadDeclarations();
    loadProfiles();
  }, [loadDeclarations]);

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username')
        .order('username');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      console.error('Error loading profiles:', error);
    }
  };

  const handleDelete = async (declaration: Declaration) => {
    setDeclarationToDelete(declaration);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!declarationToDelete) return;

    try {
      const { data: existing, error: checkError } = await supabase
        .from('declarations')
        .select('id, deleted_at')
        .eq('id', declarationToDelete.id)
        .single();

      if (checkError) throw checkError;
      if (existing?.deleted_at) {
        throw new Error(t('alreadyDeleted'));
      }

      await supabase
        .from('declaration_deletion_log')
        .insert({
          declaration_id: declarationToDelete.id,
          deleted_by: user?.id,
          declaration_type: declarationToDelete.type,
          declaration_status: declarationToDelete.status,
          sender_username: declarationToDelete.sender?.username,
          archive_number: declarationToDelete.archive_number,
        });

      const { error } = await supabase
        .from('declarations')
        .update({ 
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id 
        })
        .eq('id', declarationToDelete.id)
        .is('deleted_at', null);

      if (error) throw error;

      toast({
        title: t('success'),
        description: t('movedToTrash'),
      });
      
      setDeleteDialogOpen(false);
      setDeclarationToDelete(null);
      await loadDeclarations();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const filteredDeclarations = declarations.filter(dec => {
    const matchesSearch = dec.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         dec.sender?.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || dec.status === statusFilter;
    const matchesSender = senderFilter === 'all' || dec.sender_id === senderFilter;
    
    let matchesDate = true;
    if (dateFrom || dateTo) {
      const decDate = new Date(dec.created_at);
      if (dateFrom && dateTo) {
        matchesDate = decDate >= dateFrom && decDate <= dateTo;
      } else if (dateFrom) {
        matchesDate = decDate >= dateFrom;
      } else if (dateTo) {
        matchesDate = decDate <= dateTo;
      }
    }
    
    return matchesSearch && matchesStatus && matchesSender && matchesDate;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSenderFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || senderFilter !== 'all' || dateFrom || dateTo;

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredDeclarations.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredDeclarations.map(d => d.id));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleRowExpand = (id: string) => {
    setExpandedRows(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <Breadcrumbs />

        {/* Header with Stats */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold gradient-text">{t('systemTitle')}</h1>
              <p className="text-muted-foreground text-sm">
                {t('welcome')}, {user?.username}!
              </p>
            </div>
            <div className="flex gap-2">
              <CreateDeclarationDialog 
                onSuccess={loadDeclarations}
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
              />
              <Button 
                variant="outline" 
                onClick={() => navigate('/trash')}
                className="gap-2"
              >
                <Archive className="w-4 h-4" />
                {t('trashBin')}
              </Button>
            </div>
          </div>

          {/* Compact Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCard
              label={t('totalDeclarations')}
              value={stats.total}
              icon={FileText}
              color="text-primary"
              bgColor="bg-primary/10"
            />
            <StatsCard
              label={t('pendingWarehouseSignature')}
              value={stats.pending_warehouse_signature}
              icon={AlertCircle}
              color="text-yellow-600 dark:text-yellow-400"
              bgColor="bg-yellow-500/10"
            />
            <StatsCard
              label={t('warehouseSigned')}
              value={stats.warehouse_signed}
              icon={CheckCircle}
              color="text-blue-600 dark:text-blue-400"
              bgColor="bg-blue-500/10"
            />
            <StatsCard
              label={t('archived')}
              value={stats.archived}
              icon={Archive}
              color="text-green-600 dark:text-green-400"
              bgColor="bg-green-500/10"
            />
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutDashboard className="w-4 h-4" />
              {t('overview')}
            </TabsTrigger>
            <TabsTrigger value="manage" className="gap-2">
              <FileText className="w-4 h-4" />
              {t('manage')}
            </TabsTrigger>
            <TabsTrigger value="archive" className="gap-2">
              <FolderOpen className="w-4 h-4" />
              {t('archiveFiles')}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card className="glass-card border-border/50 p-6">
              <h3 className="text-base font-semibold mb-4">{t('recentDeclarations')}</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>{t('declarationId')}</TableHead>
                    <TableHead>{t('type')}</TableHead>
                    <TableHead>{t('sender')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('createdDate')}</TableHead>
                    <TableHead>{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <DeclarationTableSkeleton rows={5} />
                  ) : declarations.slice(0, 5).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        {t('noDeclarations')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    declarations.slice(0, 5).map((declaration) => (
                      <Collapsible key={declaration.id} asChild open={expandedRows.includes(declaration.id)}>
                        <>
                          <TableRow className="hover:bg-muted/5">
                            <TableCell>
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => toggleRowExpand(declaration.id)}
                                >
                                  {expandedRows.includes(declaration.id) ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            </TableCell>
                            <TableCell className="font-medium font-mono text-sm">{declaration.id}</TableCell>
                            <TableCell>{declaration.type}</TableCell>
                            <TableCell>{declaration.sender?.username || t('unknown')}</TableCell>
                            <TableCell>
                              <StatusQuickAction
                                declarationId={declaration.id}
                                currentStatus={declaration.status}
                                onStatusChange={loadDeclarations}
                              />
                            </TableCell>
                            <TableCell>{toGregorianDate(declaration.created_at)}</TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => navigate(`/declaration/${declaration.id}`)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          <CollapsibleContent asChild>
                            <tr>
                              <td colSpan={7} className="p-0">
                                <DeclarationRowExpand declarationId={declaration.id} />
                              </td>
                            </tr>
                          </CollapsibleContent>
                        </>
                      </Collapsible>
                    ))
                  )}
                </TableBody>
              </Table>
              {declarations.length > 5 && (
                <div className="mt-4 text-center">
                  <Button variant="link" onClick={() => setActiveTab('manage')}>
                    {t('viewAll')} ({declarations.length})
                  </Button>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Manage Tab */}
          <TabsContent value="manage" className="space-y-6">
            {/* Filters - Sticky */}
            <Card className="glass-card border-border/50 p-4 sticky top-20 z-40 backdrop-blur-md">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={`${t('search')}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="ps-10"
                  />
                </div>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <Filter className="w-4 h-4 me-2" />
                    <SelectValue placeholder={t('status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allStatuses')}</SelectItem>
                    <SelectItem value="draft">{t('draft')}</SelectItem>
                    <SelectItem value="pending_warehouse_signature">{t('pendingWarehouseSignature')}</SelectItem>
                    <SelectItem value="warehouse_signed">{t('warehouseSigned')}</SelectItem>
                    <SelectItem value="sent_to_admin_office">{t('sentToAdminOffice')}</SelectItem>
                    <SelectItem value="received_by_admin_office">{t('receivedByAdminOffice')}</SelectItem>
                    <SelectItem value="returned_to_warehouse">{t('returnedToWarehouse')}</SelectItem>
                    <SelectItem value="archived">{t('archived')}</SelectItem>
                    <SelectItem value="rejected">{t('rejected')}</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sender Filter */}
                <Select value={senderFilter} onValueChange={setSenderFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder={t('allSendersFilter')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allSendersFilter')}</SelectItem>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Date Filters */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full md:w-[150px] justify-start", !dateFrom && "text-muted-foreground")}>
                      <CalendarIcon className="me-2 h-4 w-4" />
                      {dateFrom ? toGregorianDateLong(dateFrom) : t('from')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full md:w-[150px] justify-start", !dateTo && "text-muted-foreground")}>
                      <CalendarIcon className="me-2 h-4 w-4" />
                      {dateTo ? toGregorianDateLong(dateTo) : t('to')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                  </PopoverContent>
                </Popover>

                {hasActiveFilters && (
                  <Button variant="ghost" onClick={clearFilters} className="gap-2">
                    <X className="w-4 h-4" />
                    {t('clearFilters')}
                  </Button>
                )}
              </div>

              {/* Results count */}
              <div className="mt-3 text-sm text-muted-foreground">
                {t('showing')} {filteredDeclarations.length} {t('of')} {declarations.length} {t('results')}
              </div>
            </Card>

            {/* Bulk Actions */}
            {selectedItems.length > 0 && (
              <Card className="glass-card border-border/50 p-3 flex items-center gap-3">
                <span className="text-sm font-medium">
                  {selectedItems.length} {t('selected')}
                </span>
                <Button size="sm" variant="outline">{t('bulkActions')}</Button>
              </Card>
            )}

            {/* Declarations Table */}
            <Card className="glass-card border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedItems.length === filteredDeclarations.length && filteredDeclarations.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>{t('declarationId')}</TableHead>
                    <TableHead>{t('type')}</TableHead>
                    <TableHead>{t('sender')}</TableHead>
                    <TableHead>{t('archiveNumber')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('createdDate')}</TableHead>
                    <TableHead>{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <DeclarationTableSkeleton rows={10} />
                  ) : filteredDeclarations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        {t('noDeclarations')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDeclarations.map((declaration) => (
                      <Collapsible key={declaration.id} asChild open={expandedRows.includes(declaration.id)}>
                        <>
                          <TableRow className="hover:bg-muted/5">
                            <TableCell>
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => toggleRowExpand(declaration.id)}
                                >
                                  {expandedRows.includes(declaration.id) ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            </TableCell>
                            <TableCell>
                              <Checkbox
                                checked={selectedItems.includes(declaration.id)}
                                onCheckedChange={() => toggleSelectItem(declaration.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium font-mono text-sm">{declaration.id}</TableCell>
                            <TableCell>{declaration.type}</TableCell>
                            <TableCell>{declaration.sender?.username || t('unknown')}</TableCell>
                            <TableCell className="font-mono text-sm">
                              {declaration.archive_number || <span className="text-muted-foreground">-</span>}
                            </TableCell>
                            <TableCell>
                              <StatusQuickAction
                                declarationId={declaration.id}
                                currentStatus={declaration.status}
                                onStatusChange={loadDeclarations}
                              />
                            </TableCell>
                            <TableCell>{toGregorianDate(declaration.created_at)}</TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => navigate(`/declaration/${declaration.id}`)}
                                  title={t('view')}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {(user?.role === 'admin' || (user?.role === 'manager' && declaration.sender_id === user.id)) && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => handleDelete(declaration)}
                                    title={t('delete')}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                          <CollapsibleContent asChild>
                            <tr>
                              <td colSpan={9} className="p-0">
                                <DeclarationRowExpand declarationId={declaration.id} />
                              </td>
                            </tr>
                          </CollapsibleContent>
                        </>
                      </Collapsible>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Archive Files Tab */}
          <TabsContent value="archive">
            <ArchiveFilesManagement />
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          declaration={declarationToDelete}
          onConfirm={confirmDelete}
          userRole={user?.role}
        />
      </main>

      {/* FAB for creating new declaration */}
      <FAB onSuccess={loadDeclarations} />
    </div>
  );
}
