import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Navigation } from '@/components/Navigation';
import { useLanguage } from '@/contexts/LanguageContext';
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
import { RefreshCw, Trash2, Eye, AlertCircle } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { formatDate } from '@/utils/dateUtils';
import { useCalendar } from '@/contexts/CalendarContext';

interface DeletedDeclaration {
  id: string;
  type: 'دخول' | 'خروج';
  sender_id: string;
  sender?: { username: string };
  status: string;
  archive_number: string | null;
  created_at: string;
  deleted_at: string;
  deleted_by: string;
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

export default function Trash() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { calendarType } = useCalendar();
  const navigate = useNavigate();
  const [declarations, setDeclarations] = useState<DeletedDeclaration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeletedDeclarations();
  }, []);

  const loadDeletedDeclarations = async () => {
    try {
      const { data, error } = await supabase
        .from('declarations')
        .select(`
          *,
          sender:profiles!sender_id(username)
        `)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) throw error;

      setDeclarations(data || []);
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

  const handleRestore = async (id: string) => {
    try {
      const { error } = await supabase
        .from('declarations')
        .update({ 
          deleted_at: null,
          deleted_by: null 
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: t('success'),
        description: 'تم استرجاع الإقرار بنجاح',
      });
      loadDeletedDeclarations();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!window.confirm('⚠️ تحذير: سيتم حذف الإقرار نهائياً ولا يمكن استرجاعه. هل أنت متأكد؟')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('declarations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: t('success'),
        description: 'تم حذف الإقرار نهائياً',
      });
      loadDeletedDeclarations();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getDaysRemaining = (deletedAt: string) => {
    const daysPassed = differenceInDays(new Date(), new Date(deletedAt));
    return Math.max(0, 30 - daysPassed);
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🗑️ سلة المحذوفات</h1>
          <p className="text-muted-foreground">
            الإقرارات المحذوفة - سيتم حذفها نهائياً بعد 30 يوم
          </p>
        </div>

        {/* Info Card */}
        <Card className="glass-card border-border/50 p-4 mb-6 bg-blue-500/5 border-blue-500/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm space-y-1">
              <p className="text-foreground font-medium">
                معلومات مهمة عن سلة المحذوفات:
              </p>
              <ul className="text-muted-foreground space-y-1 mr-4">
                <li>• يمكن استرجاع الإقرارات المحذوفة خلال 30 يوم من تاريخ الحذف</li>
                <li>• بعد 30 يوم، سيتم حذف الإقرار نهائياً بشكل تلقائي</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Declarations Table */}
        <Card className="glass-card border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('declarationId')}</TableHead>
                <TableHead>{t('type')}</TableHead>
                <TableHead>{t('sender')}</TableHead>
                <TableHead>رقم الأرشفة</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead>تاريخ الحذف</TableHead>
                <TableHead>الأيام المتبقية</TableHead>
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
              ) : declarations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Trash2 className="w-12 h-12 text-muted-foreground/50" />
                      <p className="text-muted-foreground">سلة المحذوفات فارغة</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                declarations.map((declaration) => {
                  const daysRemaining = getDaysRemaining(declaration.deleted_at);
                  const isUrgent = daysRemaining <= 7;
                  
                  return (
                    <TableRow key={declaration.id} className="hover:bg-muted/5">
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
                      <TableCell>
                        {formatDate(declaration.deleted_at, calendarType)}
                      </TableCell>
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
      </main>
    </div>
  );
}
