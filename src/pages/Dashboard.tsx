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
} from 'lucide-react';

const statusColors = {
  unsigned: 'bg-unsigned/20 text-unsigned border-unsigned/30',
  pending: 'bg-pending/20 text-pending border-pending/30',
  approved: 'bg-approved/20 text-approved border-approved/30',
  archived: 'bg-archived/20 text-archived border-archived/30',
};

export default function Dashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    unsigned: 0,
    pending: 0,
    approved: 0,
  });
  const [recentDeclarations, setRecentDeclarations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data, error } = await supabase
        .from('declarations')
        .select(`
          *,
          sender:profiles(username)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      setRecentDeclarations(data || []);

      const { count: totalCount } = await supabase
        .from('declarations')
        .select('*', { count: 'exact', head: true });

      const { count: unsignedCount } = await supabase
        .from('declarations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'unsigned');

      const { count: pendingCount } = await supabase
        .from('declarations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: approvedCount } = await supabase
        .from('declarations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      setStats({
        total: totalCount || 0,
        unsigned: unsignedCount || 0,
        pending: pendingCount || 0,
        approved: approvedCount || 0,
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
        title: 'تم بنجاح',
        description: 'تم حذف الإقرار بنجاح',
      });
      loadDashboardData();
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: 'unsigned' | 'pending' | 'approved' | 'archived') => {
    try {
      const { error } = await supabase
        .from('declarations')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'تم بنجاح',
        description: 'تم تحديث حالة الإقرار بنجاح',
      });
      loadDashboardData();
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message,
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
            { label: t('unsigned'), value: stats.unsigned, icon: Clock, color: 'text-unsigned', bgColor: 'bg-unsigned/10' },
            { label: t('pending'), value: stats.pending, icon: AlertCircle, color: 'text-pending', bgColor: 'bg-pending/10' },
            { label: t('approved'), value: stats.approved, icon: CheckCircle, color: 'text-approved', bgColor: 'bg-approved/10' },
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
              <Button variant="outline" onClick={() => navigate('/manage')}>
                {t('manageUsers')}
              </Button>
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
                        {t('loading')}...
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
                        <TableCell>{new Date(declaration.created_at).toLocaleDateString('ar-SA')}</TableCell>
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
                              onClick={() => {
                                const newStatus = declaration.status === 'unsigned' ? 'pending' : 
                                                declaration.status === 'pending' ? 'approved' : 'archived';
                                handleStatusUpdate(declaration.id, newStatus);
                              }}
                              title="تحديث الحالة"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {user?.role === 'admin' && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (window.confirm('هل أنت متأكد من حذف هذا الإقرار؟')) {
                                    handleDelete(declaration.id);
                                  }
                                }}
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
            </TabsContent>
          </Tabs>
        </Card>
      </main>
    </div>
  );
}
