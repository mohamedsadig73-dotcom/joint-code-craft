import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { StatusQuickAction } from '@/components/declarations/StatusQuickAction';
import { DeclarationRowExpand } from '@/components/declarations/DeclarationRowExpand';
import { StatsCard } from '@/components/ui/StatsCard';
import { EmptyState } from '@/components/EmptyState';
import { TableSkeleton, CardSkeleton } from '@/components/ui/TableSkeleton';
import { SmartNudge } from '@/components/SmartNudge';
import { SwipeableRow } from '@/components/SwipeableRow';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useDeclarationsRealtime } from '@/hooks/useRealtimeUpdates';
import { useSmartNudges } from '@/hooks/useSmartNudges';
import { useIsMobile } from '@/hooks/use-mobile';
import { statusLabels, statusColors } from '@/constants/statusLabels';
import { Declaration, DeletedDeclaration, DeclarationStats, Profile } from '@/types/declarations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { toGregorianDate, toGregorianDateLong } from '@/utils/dateUtils';
import { differenceInDays } from 'date-fns';
// Removed framer-motion for performance
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
  RefreshCw,
  Plus,
  Edit,
  Clock,
  Send,
  RotateCcw,
  FileEdit,
} from 'lucide-react';
export default function Dashboard() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
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
  const [deletedDeclarations, setDeletedDeclarations] = useState<DeletedDeclaration[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTrash, setLoadingTrash] = useState(true);
  const [stats, setStats] = useState<DeclarationStats>({
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

  // Smart Nudges
  const completionRate = useMemo(() => {
    if (stats.total === 0) return 0;
    return Math.round((stats.archived / stats.total) * 100);
  }, [stats]);

  const hasOverdueItems = useMemo(() => {
    return stats.pending_warehouse_signature > 0 || stats.returned_to_warehouse > 0;
  }, [stats]);

  const { activeNudge, dismissNudge } = useSmartNudges({
    totalItems: stats.total,
    completionRate,
    hasOverdueItems,
  });

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
        .select(`*, sender:profiles!sender_id(username)`)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDeclarations(data || []);
      
      // Calculate stats
      const newStats: DeclarationStats = {
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

  const loadDeletedDeclarations = useCallback(async () => {
    try {
      setLoadingTrash(true);
      const { data, error } = await supabase
        .from('declarations')
        .select(`*, sender:profiles!sender_id(username)`)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setDeletedDeclarations((data || []) as DeletedDeclaration[]);
    } catch (error: any) {
      console.error('Error loading deleted declarations:', error);
    } finally {
      setLoadingTrash(false);
    }
  }, []);

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, email, created_at, updated_at')
        .order('username');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      console.error('Error loading profiles:', error);
    }
  };

  useEffect(() => {
    loadDeclarations();
    loadDeletedDeclarations();
    loadProfiles();
  }, [loadDeclarations, loadDeletedDeclarations]);

  // Realtime updates
  useDeclarationsRealtime(() => {
    loadDeclarations();
    loadDeletedDeclarations();
  });

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
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const { error } = await supabase
        .from('declarations')
        .update({ deleted_at: null, deleted_by: null })
        .eq('id', id);

      if (error) throw error;

      toast({ title: t('success'), description: 'تم استرجاع الإقرار بنجاح' });
    } catch (error: any) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!window.confirm('⚠️ تحذير: سيتم حذف الإقرار نهائياً ولا يمكن استرجاعه. هل أنت متأكد؟')) return;

    try {
      const { error } = await supabase.from('declarations').delete().eq('id', id);
      if (error) throw error;
      toast({ title: t('success'), description: 'تم حذف الإقرار نهائياً' });
    } catch (error: any) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    }
  };

  const getDaysRemaining = (deletedAt: string) => {
    const daysPassed = differenceInDays(new Date(), new Date(deletedAt));
    return Math.max(0, 30 - daysPassed);
  };

  const filteredDeclarations = useMemo(() => declarations.filter(dec => {
    const matchesSearch = dec.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         dec.sender?.username?.toLowerCase().includes(searchQuery.toLowerCase());
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
  }), [declarations, searchQuery, statusFilter, senderFilter, dateFrom, dateTo]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setSenderFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
  }, []);

  const hasActiveFilters = useMemo(() => 
    searchQuery || statusFilter !== 'all' || senderFilter !== 'all' || dateFrom || dateTo
  , [searchQuery, statusFilter, senderFilter, dateFrom, dateTo]);
  
  const toggleSelectAll = useCallback(() => {
    if (selectedItems.length === filteredDeclarations.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredDeclarations.map(d => d.id));
    }
  }, [selectedItems.length, filteredDeclarations]);

  const toggleSelectItem = useCallback((id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, []);

  const toggleRowExpand = useCallback((id: string) => {
    setExpandedRows(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, []);
  const isRTL = language === 'ar';
  
  return (
    <div className="min-h-screen pb-24 md:pb-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        {/* Breadcrumbs */}
        <Breadcrumbs />

        {/* Header with Stats */}
        <div className="mb-4 md:mb-6">
          <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 mb-4 md:mb-6 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <h1 className="text-xl md:text-3xl font-bold gradient-text">{t('systemTitle')}</h1>
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
            </div>
          </div>

          {/* Compact Stats Bar */}
          {loading ? (
            <CardSkeleton count={4} />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 md:gap-3 animate-fade-in">
              <StatsCard
                label={t('totalDeclarations')}
                value={stats.total}
                icon={FileText}
                color="text-primary"
                bgColor="bg-primary/10"
                size="sm"
              />
              <StatsCard
                label={t('draft')}
                value={stats.draft}
                icon={FileEdit}
                color="text-muted-foreground"
                bgColor="bg-muted/10"
                size="sm"
              />
              <StatsCard
                label={t('pendingSignature')}
                value={stats.pending_warehouse_signature}
                icon={Clock}
                color="text-yellow-600 dark:text-yellow-400"
                bgColor="bg-yellow-500/10"
                size="sm"
              />
              <StatsCard
                label={t('signed')}
                value={stats.warehouse_signed}
                icon={CheckCircle}
                color="text-blue-600 dark:text-blue-400"
                bgColor="bg-blue-500/10"
                size="sm"
              />
              <StatsCard
                label={t('sentToOffice')}
                value={stats.sent_to_admin_office}
                icon={Send}
                color="text-purple-600 dark:text-purple-400"
                bgColor="bg-purple-500/10"
                size="sm"
              />
              <StatsCard
                label={t('returnedForModification')}
                value={stats.returned_to_warehouse}
                icon={RotateCcw}
                color="text-orange-600 dark:text-orange-400"
                bgColor="bg-orange-500/10"
                size="sm"
              />
              <StatsCard
                label={t('archived')}
                value={stats.archived}
                icon={Archive}
                color="text-green-600 dark:text-green-400"
                bgColor="bg-green-500/10"
                size="sm"
              />
            </div>
          )}

          {/* Smart Nudge */}
          {activeNudge && (
            <SmartNudge
              nudge={activeNudge}
              onDismiss={dismissNudge}
              className="mt-4"
            />
          )}
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">{t('overview')}</span>
            </TabsTrigger>
            <TabsTrigger value="manage" className="gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">{t('manage')}</span>
            </TabsTrigger>
            <TabsTrigger value="archive" className="gap-2">
              <FolderOpen className="w-4 h-4" />
              <span className="hidden sm:inline">{t('archiveFiles')}</span>
            </TabsTrigger>
            <TabsTrigger value="trash" className="gap-2 relative">
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">{t('trashBin')}</span>
              {deletedDeclarations.length > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -end-2 h-5 w-5 p-0 text-xs flex items-center justify-center">
                  {deletedDeclarations.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="animate-fade-in">
                <Card className="glass-card border-border/50 p-6">
                  <h3 className="text-base font-semibold mb-4">{t('recentDeclarations')}</h3>
                  {loading ? (
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
                        <TableSkeleton rows={5} columns={7} />
                      </TableBody>
                    </Table>
                  ) : declarations.length === 0 ? (
                    <EmptyState
                      variant="declarations"
                      title={t('noDeclarations')}
                      description="لم يتم إنشاء أي إقرارات بعد. ابدأ بإنشاء إقرار جديد."
                      actionLabel={t('createDeclaration')}
                      onAction={() => setCreateDialogOpen(true)}
                    />
                  ) : (
                    <>
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
                          {declarations.slice(0, 5).map((declaration) => (
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
                          ))}
                        </TableBody>
                      </Table>
                      {declarations.length > 5 && (
                        <div className="mt-4 text-center">
                          <Button variant="link" onClick={() => setActiveTab('manage')}>
                            {t('viewAll')} ({declarations.length})
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </Card>
            </div>
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
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
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
              <div className="animate-slide-up">
                <Card className="glass-card border-border/50 p-3 flex items-center gap-3">
                  <span className="text-sm font-medium">
                    {selectedItems.length} {t('selected')}
                  </span>
                  <Button size="sm" variant="outline">{t('bulkActions')}</Button>
                </Card>
              </div>
            )}

            {/* Mobile Cards View */}
            {isMobile ? (
              <div className="space-y-3">
                {loading ? (
                  <CardSkeleton count={5} />
                ) : filteredDeclarations.length === 0 ? (
                  <EmptyState
                    variant="search"
                    title={hasActiveFilters ? 'لا توجد نتائج' : t('noDeclarations')}
                    description={hasActiveFilters ? 'جرب تعديل الفلاتر للحصول على نتائج أخرى' : 'ابدأ بإنشاء إقرار جديد'}
                    actionLabel={hasActiveFilters ? t('clearFilters') : t('createDeclaration')}
                    onAction={hasActiveFilters ? clearFilters : () => setCreateDialogOpen(true)}
                  />
                ) : (
                  filteredDeclarations.map((declaration) => (
                    <SwipeableRow
                      key={declaration.id}
                      onEdit={() => navigate(`/declaration/${declaration.id}`)}
                      onDelete={(user?.role === 'admin' || (user?.role === 'manager' && declaration.sender_id === user?.id)) 
                        ? () => handleDelete(declaration) 
                        : undefined}
                      editLabel={t('view')}
                      deleteLabel={t('delete')}
                    >
                      <Card className="p-4 space-y-3 bg-background border-border/50">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              {declaration.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground font-mono">
                              #{declaration.id.slice(0, 8)}
                            </span>
                          </div>
                          <StatusQuickAction
                            declarationId={declaration.id}
                            currentStatus={declaration.status}
                            onStatusChange={loadDeclarations}
                          />
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{declaration.sender?.username || t('unknown')}</span>
                          <span>•</span>
                          <span>{toGregorianDate(declaration.created_at)}</span>
                        </div>

                        {declaration.archive_number && (
                          <div className="text-xs text-muted-foreground">
                            {t('archiveNumber')}: <span className="font-mono">{declaration.archive_number}</span>
                          </div>
                        )}
                      </Card>
                    </SwipeableRow>
                  ))
                )}
              </div>
            ) : (
              /* Desktop Table View */
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
                      <TableSkeleton rows={10} columns={9} />
                    ) : filteredDeclarations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          <EmptyState
                            variant="search"
                            title={hasActiveFilters ? 'لا توجد نتائج' : t('noDeclarations')}
                            description={hasActiveFilters ? 'جرب تعديل الفلاتر للحصول على نتائج أخرى' : 'ابدأ بإنشاء إقرار جديد'}
                            actionLabel={hasActiveFilters ? t('clearFilters') : t('createDeclaration')}
                            onAction={hasActiveFilters ? clearFilters : () => setCreateDialogOpen(true)}
                          />
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
            )}
          </TabsContent>

          {/* Archive Files Tab */}
          <TabsContent value="archive">
            <ArchiveFilesManagement />
          </TabsContent>

          {/* Trash Tab */}
          <TabsContent value="trash" className="space-y-6">
            <div className="animate-fade-in space-y-6">
                {/* Info Card */}
                <Card className="glass-card border-border/50 p-4 bg-blue-500/5 border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm space-y-1">
                      <p className="text-foreground font-medium">معلومات مهمة عن سلة المحذوفات:</p>
                      <ul className="text-muted-foreground space-y-1 mr-4">
                        <li>• يمكن استرجاع الإقرارات المحذوفة خلال 30 يوم من تاريخ الحذف</li>
                        <li>• بعد 30 يوم، سيتم حذف الإقرار نهائياً بشكل تلقائي</li>
                      </ul>
                    </div>
                  </div>
                </Card>

                {/* Trash Table */}
                <Card className="glass-card border-border/50 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('declarationId')}</TableHead>
                        <TableHead>{t('type')}</TableHead>
                        <TableHead>{t('sender')}</TableHead>
                        <TableHead>{t('archiveNumber')}</TableHead>
                        <TableHead>{t('status')}</TableHead>
                        <TableHead>تاريخ الحذف</TableHead>
                        <TableHead>الأيام المتبقية</TableHead>
                        <TableHead className="text-right">{t('actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingTrash ? (
                        <TableSkeleton rows={5} columns={8} />
                      ) : deletedDeclarations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            <EmptyState
                              variant="trash"
                              title="سلة المحذوفات فارغة"
                              description="لا توجد إقرارات محذوفة حالياً"
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        deletedDeclarations.map((declaration) => {
                          const daysRemaining = getDaysRemaining(declaration.deleted_at);
                          const isUrgent = daysRemaining <= 7;
                          
                          return (
                            <TableRow key={declaration.id} className="hover:bg-muted/5">
                              <TableCell className="font-medium font-mono text-sm">{declaration.id}</TableCell>
                              <TableCell>{declaration.type}</TableCell>
                              <TableCell>{declaration.sender?.username || 'Unknown'}</TableCell>
                              <TableCell className="font-mono text-sm">
                                {declaration.archive_number || <span className="text-muted-foreground">-</span>}
                              </TableCell>
                              <TableCell>
                                <Badge className={statusColors[declaration.status]}>
                                  {statusLabels[declaration.status] || declaration.status}
                                </Badge>
                              </TableCell>
                              <TableCell>{toGregorianDate(declaration.deleted_at)}</TableCell>
                              <TableCell>
                                <Badge 
                                  variant="outline"
                                  className={isUrgent ? 'border-red-500/50 text-red-700 dark:text-red-300' : ''}
                                >
                                  {daysRemaining} {daysRemaining === 1 ? 'يوم' : 'أيام'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex justify-end gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => navigate(`/declaration/${declaration.id}`)}
                                    title={t('view')}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  {(user?.role === 'admin' || (user?.role === 'manager' && declaration.sender_id === user.id)) && (
                                    <>
                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        className="text-green-600 hover:text-green-700 dark:text-green-400"
                                        onClick={() => handleRestore(declaration.id)}
                                        title="استرجاع"
                                      >
                                        <RefreshCw className="w-4 h-4" />
                                      </Button>
                                      {user?.role === 'admin' && (
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="text-destructive hover:text-destructive"
                                          onClick={() => handlePermanentDelete(declaration.id)}
                                          title="حذف نهائي"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </Card>
            </div>
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
