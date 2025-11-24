import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { UserManagement } from '@/components/UserManagement';
import { CreateDeclarationDialog } from '@/components/CreateDeclarationDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toHijriDate } from '@/utils/dateUtils';
import { exportDeclarationsToExcel } from '@/utils/excelExport';
import { exportDeclarationsToPDF } from '@/utils/pdfExport';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { 
  FileText, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Plus,
  TrendingUp,
  Eye,
  Edit,
  Trash2,
  FileSpreadsheet,
} from 'lucide-react';

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

export default function Dashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
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
  const [recentDeclarations, setRecentDeclarations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // جلب آخر 5 إقرارات مع جلب جميع البيانات في استعلام واحد
      const [declarationsResult, allDeclarationsResult] = await Promise.all([
        supabase
          .from('declarations')
          .select(`
            *,
            sender:profiles!sender_id(username)
          `)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('declarations')
          .select('status')
      ]);

      if (declarationsResult.error) throw declarationsResult.error;
      if (allDeclarationsResult.error) throw allDeclarationsResult.error;

      setRecentDeclarations(declarationsResult.data || []);

      // حساب الإحصائيات من البيانات المجلوبة
      const allDeclarations = allDeclarationsResult.data || [];
      const statusCounts = allDeclarations.reduce((acc, dec) => {
        acc[dec.status] = (acc[dec.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      setStats({
        total: allDeclarations.length,
        draft: statusCounts['draft'] || 0,
        pending_warehouse_signature: statusCounts['pending_warehouse_signature'] || 0,
        warehouse_signed: statusCounts['warehouse_signed'] || 0,
        sent_to_admin_office: statusCounts['sent_to_admin_office'] || 0,
        received_by_admin_office: statusCounts['received_by_admin_office'] || 0,
        returned_to_warehouse: statusCounts['returned_to_warehouse'] || 0,
        archived: statusCounts['archived'] || 0,
        rejected: statusCounts['rejected'] || 0,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('declarations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: t('success'),
        description: 'تم حذف الإقرار بنجاح',
      });
      loadDashboardData();
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
      const { error } = await supabase
        .from('declarations')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: t('success'),
        description: t('statusUpdated'),
      });
      loadDashboardData();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const exportAllToExcel = async () => {
    try {
      const { data, error } = await supabase
        .from('declarations')
        .select(`
          *,
          sender:profiles!sender_id(username)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const exportData = (data || []).map(dec => ({
        id: dec.id,
        type: dec.type,
        sender: dec.sender?.username || 'غير معروف',
        status: t(dec.status),
        created_at: toHijriDate(dec.created_at),
      }));

      exportDeclarationsToExcel(exportData, 'جميع_الإقرارات');

      toast({
        title: t('success'),
        description: 'تم تصدير جميع البيانات إلى Excel',
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
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {t('welcome')}, {user?.username}!
          </h1>
          <p className="text-muted-foreground">{t('dashboardSubtitle')}</p>
        </div>

        {/* Admin: User Management Section */}
        {user?.role === 'admin' && (
          <div className="mb-8">
            <UserManagement />
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: t('totalDeclarations'), value: stats.total, icon: FileText, color: 'text-primary', bgColor: 'bg-primary/10' },
            { label: t('draft'), value: stats.draft, icon: Clock, color: 'text-gray-700 dark:text-gray-300', bgColor: 'bg-gray-500/10' },
            { label: t('pendingWarehouseSignature'), value: stats.pending_warehouse_signature, icon: AlertCircle, color: 'text-yellow-700 dark:text-yellow-300', bgColor: 'bg-yellow-500/10' },
            { label: t('warehouseSigned'), value: stats.warehouse_signed, icon: CheckCircle, color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-500/10' },
          ].map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="glass-card border-border/50 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <TrendingUp className="w-4 h-4 text-success" />
                </div>
                <div className="text-3xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card className="glass-card border-border/50 p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">{t('quickActions')}</h3>
          <div className="flex flex-wrap gap-3">
            <CreateDeclarationDialog 
              open={createDialogOpen} 
              onOpenChange={setCreateDialogOpen}
              onSuccess={() => {
                setCreateDialogOpen(false);
                loadDashboardData();
              }}
            />
            <Button variant="outline" onClick={() => navigate('/reports')}>
              {t('viewReports')}
            </Button>
            {user?.role === 'admin' && (
              <>
                <Button variant="outline" onClick={() => navigate('/manage')}>
                  {t('manageUsers')}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={exportAllToExcel}
                  className="gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  {t('exportAllDeclarations')}
                </Button>
              </>
            )}
          </div>
        </Card>

        {/* Declarations Tabs */}
        <Card className="glass-card border-border/50">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="p-6">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="all">{t('all')}</TabsTrigger>
              <TabsTrigger value="unsigned">{t('unsigned')}</TabsTrigger>
              <TabsTrigger value="pending">{t('pending')}</TabsTrigger>
              <TabsTrigger value="approved">{t('approved')}</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              <h3 className="text-lg font-semibold mb-4">{t('recentDeclarations')}</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('declarationId')}</TableHead>
                    <TableHead>{t('type')}</TableHead>
                    <TableHead>{t('sender')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('createdDate')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        {t('loadingData')}
                      </TableCell>
                    </TableRow>
                  ) : recentDeclarations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No recent declarations
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentDeclarations.map((declaration) => (
                      <TableRow key={declaration.id}>
                        <TableCell className="font-medium">{declaration.id}</TableCell>
                        <TableCell>{declaration.type}</TableCell>
                        <TableCell>{declaration.sender?.username || 'Unknown'}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[declaration.status as keyof typeof statusColors]}>
                            {t(declaration.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>{toHijriDate(declaration.created_at)}</TableCell>
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
                              title={t('updateStatus')}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {user?.role === 'admin' && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (window.confirm(t('areYouSure'))) {
                                    handleDelete(declaration.id);
                                  }
                                }}
                                title={t('delete')}
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
            </TabsContent>
          </Tabs>
        </Card>
      </main>
    </div>
  );
}
