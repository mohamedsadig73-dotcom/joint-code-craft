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
import { SmartNudge } from '@/components/SmartNudge';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { DeclarationsTable } from '@/components/dashboard/DeclarationsTable';
import { TrashTable } from '@/components/dashboard/TrashTable';
import { RecentDeclarationsTable } from '@/components/dashboard/RecentDeclarationsTable';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useDeclarationsRealtime } from '@/hooks/useRealtimeUpdates';
import { useSmartNudges } from '@/hooks/useSmartNudges';
import { Declaration, DeletedDeclaration, DeclarationStats, Profile } from '@/types/declarations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { differenceInDays } from 'date-fns';
import { 
  FileText,
  FolderOpen,
  LayoutDashboard,
  Trash2,
} from 'lucide-react';

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

      toast({ 
        title: t('success'), 
        description: language === 'ar' ? 'تم استرجاع الإقرار بنجاح' : 'Declaration restored successfully' 
      });
    } catch (error: any) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    }
  };

  const handlePermanentDelete = async (id: string) => {
    const confirmMsg = language === 'ar' 
      ? '⚠️ تحذير: سيتم حذف الإقرار نهائياً ولا يمكن استرجاعه. هل أنت متأكد؟'
      : '⚠️ Warning: This declaration will be permanently deleted and cannot be recovered. Are you sure?';
    
    if (!window.confirm(confirmMsg)) return;

    try {
      const { error } = await supabase.from('declarations').delete().eq('id', id);
      if (error) throw error;
      toast({ 
        title: t('success'), 
        description: language === 'ar' ? 'تم حذف الإقرار نهائياً' : 'Declaration permanently deleted' 
      });
    } catch (error: any) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    }
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
            </div>
          </div>

          {/* Compact Stats Bar */}
          <DashboardStats stats={stats} loading={loading} />

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
            <RecentDeclarationsTable
              declarations={declarations}
              loading={loading}
              expandedRows={expandedRows}
              onToggleRowExpand={toggleRowExpand}
              onStatusChange={loadDeclarations}
              onCreateNew={() => setCreateDialogOpen(true)}
              onViewAll={() => setActiveTab('manage')}
              totalCount={declarations.length}
            />
          </TabsContent>

          {/* Manage Tab */}
          <TabsContent value="manage" className="space-y-6">
            {/* Filters */}
            <DashboardFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              senderFilter={senderFilter}
              onSenderFilterChange={setSenderFilter}
              dateFrom={dateFrom}
              onDateFromChange={setDateFrom}
              dateTo={dateTo}
              onDateToChange={setDateTo}
              profiles={profiles}
              hasActiveFilters={!!hasActiveFilters}
              onClearFilters={clearFilters}
              filteredCount={filteredDeclarations.length}
              totalCount={declarations.length}
            />

            {/* Bulk Actions */}
            {selectedItems.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-card border-border/50 p-3 flex items-center gap-3 rounded-lg"
              >
                <span className="text-sm font-medium">
                  {selectedItems.length} {t('selected')}
                </span>
              </motion.div>
            )}

            {/* Declarations Table */}
            <DeclarationsTable
              declarations={filteredDeclarations}
              loading={loading}
              selectedItems={selectedItems}
              expandedRows={expandedRows}
              onToggleSelectAll={toggleSelectAll}
              onToggleSelectItem={toggleSelectItem}
              onToggleRowExpand={toggleRowExpand}
              onDelete={handleDelete}
              onStatusChange={loadDeclarations}
              hasActiveFilters={!!hasActiveFilters}
              onClearFilters={clearFilters}
              onCreateNew={() => setCreateDialogOpen(true)}
            />
          </TabsContent>

          {/* Archive Files Tab */}
          <TabsContent value="archive">
            <ArchiveFilesManagement />
          </TabsContent>

          {/* Trash Tab */}
          <TabsContent value="trash" className="space-y-6">
            <TrashTable
              declarations={deletedDeclarations}
              loading={loadingTrash}
              onRestore={handleRestore}
              onPermanentDelete={handlePermanentDelete}
            />
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
