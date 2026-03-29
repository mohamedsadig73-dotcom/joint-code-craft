import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { FAB } from '@/components/FAB';
import { CreateDeclarationDialog } from '@/components/CreateDeclarationDialog';
import { ArchiveFilesManagement } from '@/components/ArchiveFilesManagement';
import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';
import { SmartNudge } from '@/components/SmartNudge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LayoutDashboard, FileText, FolderOpen, Trash2 } from 'lucide-react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useSmartNudges } from '@/hooks/useSmartNudges';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Declaration } from '@/types/declarations';

// Dashboard sub-components
import {
  DashboardStats,
  DashboardHeader,
  DashboardFilters,
  DeclarationsTable,
  RecentDeclarationsTable,
  TrashTable,
  MissingDeclarations,
} from '@/components/dashboard';

export default function Dashboard() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Fetch data using custom hook
  const {
    declarations,
    deletedDeclarations,
    profiles,
    loading,
    loadingTrash,
    stats,
    completionRate,
    hasOverdueItems,
    loadDeclarations,
    loadDeletedDeclarations,
    selectedYear,
    setSelectedYear,
    availableYears,
  } = useDashboardData();
  
  // UI State
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [senderFilter, setSenderFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [declarationToDelete, setDeclarationToDelete] = useState<Declaration | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Smart Nudges
  const { activeNudge, dismissNudge } = useSmartNudges({
    totalItems: stats.total,
    completionRate,
    hasOverdueItems,
  });

  // Keyboard shortcuts
  useKeyboardShortcuts([
    { key: 'n', ctrl: true, action: () => setCreateDialogOpen(true), description: 'New declaration' },
  ]);

  // Filter logic
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

  // Selection handlers
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

  // Delete handlers
  const handleDelete = useCallback((declaration: Declaration) => {
    setDeclarationToDelete(declaration);
    setDeleteDialogOpen(true);
  }, []);

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
      toast({ title: t('success'), description: t('restoredSuccessfully') });
    } catch (error: any) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    }
  };

  const handlePermanentDelete = async (id: string) => {
    const confirmMessage = language === 'ar' 
      ? '⚠️ تحذير: سيتم حذف الإقرار نهائياً ولا يمكن استرجاعه. هل أنت متأكد؟'
      : '⚠️ Warning: This will permanently delete the declaration. Are you sure?';
    if (!window.confirm(confirmMessage)) return;

    try {
      const { error } = await supabase.from('declarations').delete().eq('id', id);
      if (error) throw error;
      toast({ title: t('success'), description: t('permanentlyDeleted') });
    } catch (error: any) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    }
  };

  const isRTL = language === 'ar';
  
  return (
    <div className="min-h-screen pb-24 md:pb-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        <Breadcrumbs />

        {/* Header */}
        <DashboardHeader
          createDialogOpen={createDialogOpen}
          onCreateDialogOpenChange={setCreateDialogOpen}
          onSuccess={loadDeclarations}
        />

        {/* Stats */}
        <div className="mb-4 md:mb-6">
          <DashboardStats 
            stats={stats} 
            loading={loading} 
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            availableYears={availableYears}
          />
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
              declarations={declarations.slice(0, 5)}
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
            <MissingDeclarations declarations={declarations} loading={loading} />
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
              hasActiveFilters={Boolean(hasActiveFilters)}
              onClearFilters={clearFilters}
              filteredCount={filteredDeclarations.length}
              totalCount={declarations.length}
            />

            {/* Bulk Actions */}
            {selectedItems.length > 0 && (
              <Card className="glass-card border-border/50 p-3 flex items-center gap-3 animate-slide-up">
                <span className="text-sm font-medium">
                  {selectedItems.length} {t('selected')}
                </span>
                <Button size="sm" variant="outline">{t('bulkActions')}</Button>
              </Card>
            )}

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
              hasActiveFilters={Boolean(hasActiveFilters)}
              onClearFilters={clearFilters}
              onCreateNew={() => setCreateDialogOpen(true)}
            />
          </TabsContent>

          {/* Archive Files Tab */}
          <TabsContent value="archive">
            <ArchiveFilesManagement />
          </TabsContent>

          {/* Trash Tab */}
          <TabsContent value="trash">
            <TrashTable
              declarations={deletedDeclarations}
              loading={loadingTrash}
              onRestore={handleRestore}
              onPermanentDelete={handlePermanentDelete}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* FAB for mobile */}
      <FAB onSuccess={loadDeclarations} />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        declaration={declarationToDelete}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
