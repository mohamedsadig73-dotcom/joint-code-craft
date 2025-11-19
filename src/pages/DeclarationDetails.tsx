import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Calendar, User, FileText, Clock } from 'lucide-react';

interface DeclarationDetails {
  id: string;
  type: 'Import' | 'Export' | 'Transit';
  status: 'unsigned' | 'pending' | 'approved' | 'archived';
  created_at: string;
  updated_at: string;
  sender_id: string;
  sender: {
    username: string;
    email: string;
  };
}

const statusColors = {
  unsigned: 'bg-unsigned/20 text-unsigned border-unsigned/30',
  pending: 'bg-pending/20 text-pending border-pending/30',
  approved: 'bg-approved/20 text-approved border-approved/30',
  archived: 'bg-archived/20 text-archived border-archived/30',
};

const statusLabels = {
  unsigned: 'غير موقّع',
  pending: 'قيد الانتظار',
  approved: 'موافق عليه',
  archived: 'مؤرشف',
};

const typeLabels = {
  Import: 'استيراد',
  Export: 'تصدير',
  Transit: 'ترانزيت',
};

export default function DeclarationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [declaration, setDeclaration] = useState<DeclarationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadDeclaration();
  }, [id]);

  const loadDeclaration = async () => {
    try {
      const { data, error } = await supabase
        .from('declarations')
        .select(`
          *,
          sender:profiles(username, email)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'الإقرار غير موجود',
        });
        navigate('/manage');
        return;
      }

      setDeclaration(data as any);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: error.message || 'فشل تحميل بيانات الإقرار',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: 'unsigned' | 'pending' | 'approved' | 'archived') => {
    if (!declaration) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('declarations')
        .update({ status: newStatus })
        .eq('id', declaration.id);

      if (error) throw error;

      toast({
        title: 'تم بنجاح',
        description: 'تم تحديث حالة الإقرار',
      });

      setDeclaration({ ...declaration, status: newStatus });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: error.message || 'فشل تحديث الحالة',
      });
    } finally {
      setUpdating(false);
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

  const canUpdateStatus = user?.role === 'admin' || user?.role === 'manager' || user?.id === declaration.sender_id;

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/manage')}
            className="gap-2 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            العودة للإدارة
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">تفاصيل الإقرار</h1>
              <p className="text-muted-foreground">رقم الإقرار: {declaration.id}</p>
            </div>
            <Badge className={statusColors[declaration.status]}>
              {statusLabels[declaration.status]}
            </Badge>
          </div>
        </div>

        {/* Main Details Card */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              المعلومات الأساسية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-muted-foreground">نوع الإقرار</label>
                <p className="text-lg font-medium">{typeLabels[declaration.type]}</p>
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground">الحالة</label>
                {canUpdateStatus ? (
                  <Select
                    value={declaration.status}
                    onValueChange={(value: any) => handleStatusUpdate(value)}
                    disabled={updating}
                  >
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unsigned">غير موقّع</SelectItem>
                      <SelectItem value="pending">قيد الانتظار</SelectItem>
                      <SelectItem value="approved">موافق عليه</SelectItem>
                      <SelectItem value="archived">مؤرشف</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-lg font-medium">{statusLabels[declaration.status]}</p>
                )}
              </div>

              <div>
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  تاريخ الإنشاء
                </label>
                <p className="text-lg">
                  {new Date(declaration.created_at).toLocaleDateString('ar-EG', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              <div>
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  آخر تحديث
                </label>
                <p className="text-lg">
                  {new Date(declaration.updated_at).toLocaleDateString('ar-EG', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sender Details Card */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              معلومات المرسل
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-muted-foreground">اسم المستخدم</label>
                <p className="text-lg font-medium">{declaration.sender.username}</p>
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground">البريد الإلكتروني</label>
                <p className="text-lg font-medium">{declaration.sender.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
