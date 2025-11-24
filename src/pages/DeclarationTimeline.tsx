import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, User, FileText, CheckCircle2, Circle } from 'lucide-react';
import { format } from 'date-fns';

interface StatusHistoryEntry {
  id: string;
  declaration_id: string;
  old_status: string | null;
  new_status: string;
  changed_at: string;
  changed_by: string;
  notes: string | null;
  changer: {
    username: string;
    email: string;
  };
}

interface Declaration {
  id: string;
  type: 'دخول' | 'خروج';
  created_at: string;
  sender: {
    username: string;
  };
}

const statusLabels = {
  draft: 'مسودة',
  pending_warehouse_signature: 'بانتظار توقيع المخزن',
  warehouse_signed: 'موقّع من المخزن',
  sent_to_admin_office: 'مُرسل إلى المكتب الإداري',
  received_by_admin_office: 'مستلم من المكتب الإداري',
  returned_to_warehouse: 'مُعاد إلى المخزن للأرشفة',
  archived: 'مؤرشف',
  rejected: 'مرفوض / يحتاج إلى تصحيح',
};

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

export default function DeclarationTimeline() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [declaration, setDeclaration] = useState<Declaration | null>(null);
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      // Load declaration details
      const { data: declData, error: declError } = await supabase
        .from('declarations')
        .select(`
          *,
          sender:profiles!sender_id(username)
        `)
        .eq('id', id)
        .maybeSingle();

      if (declError) throw declError;

      if (!declData) {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'الإقرار غير موجود',
        });
        navigate('/manage');
        return;
      }

      setDeclaration(declData as any);

      // Load status history
      const { data: historyData, error: historyError } = await supabase
        .from('declaration_status_history')
        .select(`
          *,
          changer:profiles!declaration_status_history_changed_by_fkey(username, email)
        `)
        .eq('declaration_id', id)
        .order('changed_at', { ascending: false });

      if (historyError) throw historyError;

      setHistory(historyData as any || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: error.message || 'فشل تحميل البيانات',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">جاري التحميل...</div>
        </div>
      </div>
    );
  }

  if (!declaration) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(`/declaration/${id}`)}
            className="gap-2 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            العودة لتفاصيل الإقرار
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">مسار الإقرار</h1>
              <p className="text-muted-foreground">رقم الإقرار: {declaration.id}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">نوع الإقرار</div>
              <div className="text-lg font-medium">{declaration.type}</div>
            </div>
          </div>
        </div>

        {/* Declaration Info Card */}
        <Card className="glass-card border-border/50 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              معلومات الإقرار
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">المرسل</label>
                <p className="text-lg font-medium">{declaration.sender?.username}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">تاريخ الإنشاء</label>
                <p className="text-lg">
                  {format(new Date(declaration.created_at), 'MMMM dd, yyyy')}
                </p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">عدد التحديثات</label>
                <p className="text-lg font-medium">{history.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              الخط الزمني للإقرار
            </CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا يوجد سجل تغييرات لهذا الإقرار
              </div>
            ) : (
              <div className="relative">
                {/* Timeline Line */}
                <div className="absolute right-4 top-0 bottom-0 w-0.5 bg-border/50" />

                {/* Timeline Items */}
                <div className="space-y-6">
                  {history.map((entry, index) => {
                    const isFirst = index === 0;
                    const isLast = index === history.length - 1;
                    
                    return (
                      <div key={entry.id} className="relative pr-12">
                        {/* Timeline Dot */}
                        <div className="absolute right-0 top-1 w-8 h-8 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                          {isFirst ? (
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                          ) : (
                            <Circle className="w-3 h-3 text-primary fill-primary" />
                          )}
                        </div>

                        {/* Timeline Content */}
                        <Card className="glass-card border-border/50">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  {entry.old_status ? (
                                    <>
                                      <Badge className={statusColors[entry.old_status as keyof typeof statusColors]}>
                                        {statusLabels[entry.old_status as keyof typeof statusLabels]}
                                      </Badge>
                                      <span className="text-muted-foreground">←</span>
                                      <Badge className={statusColors[entry.new_status as keyof typeof statusColors]}>
                                        {statusLabels[entry.new_status as keyof typeof statusLabels]}
                                      </Badge>
                                    </>
                                  ) : (
                                    <Badge className={statusColors[entry.new_status as keyof typeof statusColors]}>
                                      {statusLabels[entry.new_status as keyof typeof statusLabels]}
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                  <User className="w-4 h-4" />
                                  <span>{entry.changer?.username}</span>
                                </div>

                                {entry.notes && (
                                  <p className="text-sm text-muted-foreground mt-2">
                                    {entry.notes}
                                  </p>
                                )}
                              </div>

                              <div className="text-left ml-4">
                                <div className="text-sm font-medium">
                                  {format(new Date(entry.changed_at), 'MMMM dd, yyyy')}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {format(new Date(entry.changed_at), 'h:mm a')}
                                </div>
                              </div>
                            </div>

                            {entry.old_status && (
                              <div className="text-xs text-muted-foreground">
                                {entry.old_status === 'draft' && entry.new_status === 'pending_warehouse_signature' && 'تم إرسال الإقرار للمخزن'}
                                {entry.old_status === 'pending_warehouse_signature' && entry.new_status === 'warehouse_signed' && 'تم التوقيع من المخزن'}
                                {entry.old_status === 'warehouse_signed' && entry.new_status === 'sent_to_admin_office' && 'تم إرسال الإقرار للمكتب الإداري'}
                                {entry.old_status === 'sent_to_admin_office' && entry.new_status === 'received_by_admin_office' && 'تم الاستلام من المكتب الإداري'}
                                {entry.old_status === 'received_by_admin_office' && entry.new_status === 'returned_to_warehouse' && 'تمت إعادة الإقرار للمخزن'}
                                {entry.old_status === 'returned_to_warehouse' && entry.new_status === 'archived' && 'تمت أرشفة الإقرار'}
                                {entry.new_status === 'rejected' && 'تم رفض الإقرار'}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
