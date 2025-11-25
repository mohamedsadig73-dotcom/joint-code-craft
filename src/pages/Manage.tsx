import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Navigation } from '@/components/Navigation';
import { CreateDeclarationDialog } from '@/components/CreateDeclarationDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { exportDeclarationsToExcel } from '@/utils/excelExport';
import { exportDeclarationsToPDF } from '@/utils/pdfExport';
import { formatDate, formatDateLong } from '@/utils/dateUtils';
import { useCalendar } from '@/contexts/CalendarContext';
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
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Filter, Download, Edit, Trash2, Eye, Plus, CalendarIcon, X, FileSpreadsheet, FileText, Archive } from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';

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

const statusColors = {
  draft: 'bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30',
  pending_warehouse_signature: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
  warehouse_signed: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
  sent_to_admin_office: 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30',
  received_by_admin_office: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
  returned_to_warehouse: 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30',
  archived: 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30',
};

export default function Manage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { calendarType } = useCalendar();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [senderFilter, setSenderFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
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

  useEffect(() => {
    loadDeclarations();
    loadProfiles();
  }, []);

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

  const loadDeclarations = async () => {
    try {
      const { data, error } = await supabase
        .from('declarations')
        .select(`
          *,
          sender:profiles!sender_id(username)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDeclarations(data || []);
      
      // Calculate stats
      const newStats = {
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
  };

  const handleDelete = async (declaration: Declaration) => {
    setDeclarationToDelete(declaration);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!declarationToDelete) return;

    try {
      // Log deletion for audit
      const { error: logError } = await supabase
        .from('declaration_deletion_log')
        .insert({
          declaration_id: declarationToDelete.id,
          deleted_by: user?.id,
          declaration_type: declarationToDelete.type,
          declaration_status: declarationToDelete.status,
          sender_username: declarationToDelete.sender?.username,
          archive_number: declarationToDelete.archive_number,
        });

      if (logError) console.error('Error logging deletion:', logError);

      // Soft delete
      const { error } = await supabase
        .from('declarations')
        .update({ 
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id 
        })
        .eq('id', declarationToDelete.id);

      if (error) throw error;

      toast({
        title: t('success'),
        description: 'تم نقل الإقرار إلى سلة المحذوفات',
      });
      
      setDeleteDialogOpen(false);
      setDeclarationToDelete(null);
      loadDeclarations();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: 'draft' | 'pending_warehouse_signature' | 'warehouse_signed' | 'sent_to_admin_office' | 'received_by_admin_office' | 'returned_to_warehouse' | 'archived' | 'rejected') => {
    try {
      // Check if manager is trying to update someone else's declaration
      if (user?.role === 'manager') {
        const declaration = declarations.find(d => d.id === id);
        if (declaration && declaration.sender_id !== user.id) {
          return; // Silent block for managers trying to update others' declarations
        }
      }

      const { error } = await supabase
        .from('declarations')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: t('success'),
        description: 'Status updated successfully',
      });
      loadDeclarations();
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
    
    // Date filtering
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

  const exportToExcel = () => {
    try {
      const exportData = filteredDeclarations.map(dec => ({
        id: dec.id,
        type: dec.type,
        sender: dec.sender?.username || 'غير معروف',
        status: t(dec.status),
        archive_number: dec.archive_number || '-',
        created_at: formatDate(dec.created_at, calendarType),
      }));

      exportDeclarationsToExcel(exportData, 'إقرارات');

      toast({
        title: t('success'),
        description: 'تم تصدير البيانات إلى Excel',
      });
    } catch (error: any) {
      toast({
        title: t('error'),
        description: 'فشل تصدير البيانات',
        variant: 'destructive',
      });
    }
  };

  const exportToPDF = () => {
    try {
      const exportData = filteredDeclarations.map(dec => ({
        id: dec.id,
        type: dec.type,
        sender: dec.sender?.username || 'غير معروف',
        status: t(dec.status),
        archive_number: dec.archive_number || '-',
        created_at: formatDate(dec.created_at, calendarType),
      }));

      const doc = exportDeclarationsToPDF(exportData, 'تقرير الإقرارات');
      
      const fileName = `إقرارات_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast({
        title: t('success'),
        description: 'تم تصدير البيانات إلى PDF',
      });
    } catch (error: any) {
      toast({
        title: t('error'),
        description: 'فشل تصدير البيانات',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t('declarations')}</h1>
            <p className="text-muted-foreground">
              {t('showing')} {filteredDeclarations.length} {t('of')} {declarations.length} {t('results')}
            </p>
          </div>
          
          {/* Export Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={exportToExcel}
              className="gap-2"
              disabled={filteredDeclarations.length === 0}
            >
              <FileSpreadsheet className="w-4 h-4" />
              تصدير Excel
            </Button>
            <Button
              variant="outline"
              onClick={exportToPDF}
              className="gap-2"
              disabled={filteredDeclarations.length === 0}
            >
              <FileText className="w-4 h-4" />
              تصدير PDF
            </Button>
          </div>
        </div>

        {/* Filters and Actions */}
        <Card className="glass-card border-border/50 p-6 mb-6">
          <div className="space-y-4">
            {/* First Row - Search and Quick Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={`${t('search')}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 glass-card border-border/50"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48 glass-card border-border/50">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder={t('status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatuses')}</SelectItem>
                  <SelectItem value="draft">مسودة</SelectItem>
                  <SelectItem value="pending_warehouse_signature">بانتظار توقيع المخزن</SelectItem>
                  <SelectItem value="warehouse_signed">موقّع من المخزن</SelectItem>
                  <SelectItem value="sent_to_admin_office">مُرسل إلى المكتب الإداري</SelectItem>
                  <SelectItem value="received_by_admin_office">مستلم من المكتب الإداري</SelectItem>
                  <SelectItem value="returned_to_warehouse">مُعاد إلى المخزن للأرشفة</SelectItem>
                  <SelectItem value="archived">{t('archived')}</SelectItem>
                  <SelectItem value="rejected">مرفوض / يحتاج إلى تصحيح</SelectItem>
                </SelectContent>
              </Select>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <CreateDeclarationDialog 
                  onSuccess={loadDeclarations}
                />
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => navigate('/trash')}
                >
                  <Archive className="w-4 h-4" />
                  سلة المحذوفات
                </Button>
              </div>
            </div>

            {/* Second Row - Advanced Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              {/* Sender Filter */}
              <Select value={senderFilter} onValueChange={setSenderFilter}>
                <SelectTrigger className="w-full md:w-48 glass-card border-border/50">
                  <SelectValue placeholder="جميع المرسلين" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المرسلين</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date From */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full md:w-[200px] justify-start text-left font-normal glass-card border-border/50",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? formatDateLong(dateFrom, calendarType) : "من تاريخ"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              {/* Date To */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full md:w-[200px] justify-start text-left font-normal glass-card border-border/50",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? formatDateLong(dateTo, calendarType) : "إلى تاريخ"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  مسح الفلاتر
                </Button>
              )}
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedItems.length > 0 && (
            <div className="mt-4 flex items-center gap-3 p-3 bg-secondary/10 rounded-lg">
              <span className="text-sm font-medium">
                {selectedItems.length} {t('selected')}
              </span>
              <Button size="sm" variant="outline">{t('bulkActions')}</Button>
            </div>
          )}
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'مسودة', value: stats.draft, color: 'text-gray-700 dark:text-gray-300' },
            { label: 'بانتظار المخزن', value: stats.pending_warehouse_signature, color: 'text-yellow-700 dark:text-yellow-300' },
            { label: 'موقّع', value: stats.warehouse_signed, color: 'text-blue-700 dark:text-blue-300' },
            { label: t('archived'), value: stats.archived, color: 'text-green-700 dark:text-green-300' },
          ].map((stat) => (
            <Card key={stat.label} className="glass-card border-border/50 p-4 text-center">
              <div className={`text-2xl font-bold mb-1 ${stat.color}`}>{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </Card>
          ))}
        </div>

        {/* Declarations Table */}
        <Card className="glass-card border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedItems.length === filteredDeclarations.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>{t('declarationId')}</TableHead>
                <TableHead>{t('type')}</TableHead>
                <TableHead>{t('sender')}</TableHead>
                <TableHead>رقم الأرشفة</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead>{t('createdDate')}</TableHead>
                <TableHead className="text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    {t('loading')}...
                  </TableCell>
                </TableRow>
              ) : filteredDeclarations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No declarations found
                  </TableCell>
                </TableRow>
              ) : (
                filteredDeclarations.map((declaration) => (
                  <TableRow key={declaration.id} className="hover:bg-muted/5">
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.includes(declaration.id)}
                        onCheckedChange={() => toggleSelectItem(declaration.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{declaration.id}</TableCell>
                    <TableCell>{declaration.type}</TableCell>
                    <TableCell>{declaration.sender?.username || 'Unknown'}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {declaration.archive_number || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[declaration.status as keyof typeof statusColors]}>
                        {t(declaration.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(declaration.created_at, calendarType)}</TableCell>
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
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => navigate(`/declaration/${declaration.id}`)}
                          title="تحديث الحالة"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {(user?.role === 'admin' || (user?.role === 'manager' && declaration.sender_id === user.id)) && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(declaration)}
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          declaration={declarationToDelete}
          onConfirm={confirmDelete}
          userRole={user?.role}
        />
      </main>
    </div>
  );
}
