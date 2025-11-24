import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toHijriDateLong } from '@/utils/dateUtils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Calendar, User, FileText, Clock, Archive, Save } from 'lucide-react';

interface DeclarationDetails {
  id: string;
  type: 'دخول' | 'خروج';
  status: 'draft' | 'pending_warehouse_signature' | 'warehouse_signed' | 'sent_to_admin_office' | 'received_by_admin_office' | 'returned_to_warehouse' | 'archived' | 'rejected';
  archive_number: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sender_id: string;
  sender: {
    username: string;
    email: string;
  };
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

const typeLabels = {
  دخول: 'دخول',
  خروج: 'خروج',
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
  const [archiveNumber, setArchiveNumber] = useState('');
  const [editingArchive, setEditingArchive] = useState(false);

  useEffect(() => {
    loadDeclaration();
  }, [id]);

  useEffect(() => {
    if (declaration) {
      setArchiveNumber(declaration.archive_number || '');
    }
  }, [declaration]);

  const loadDeclaration = async () => {
    try {
      const { data, error } = await supabase
        .from('declarations')
        .select(`
          *,
          sender:profiles!sender_id(username, email)
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

  const handleArchiveNumberUpdate = async () => {
    if (!declaration) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('declarations')
        .update({ archive_number: archiveNumber || null })
        .eq('id', declaration.id);

      if (error) throw error;

      toast({
        title: 'تم بنجاح',
        description: 'تم تحديث رقم الأرشفة',
      });

      setDeclaration({ ...declaration, archive_number: archiveNumber || null });
      setEditingArchive(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: error.message || 'فشل تحديث رقم الأرشفة',
      });
    } finally {
      setUpdating(false);
    }
  };

  const generateArchiveNumber = async () => {
    setUpdating(true);
    try {
      const { data, error } = await supabase.rpc('generate_archive_number');

      if (error) throw error;

      if (data) {
        setArchiveNumber(data);
        toast({
          title: 'تم التوليد',
          description: `رقم الأرشفة التلقائي: ${data}`,
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: error.message || 'فشل توليد رقم الأرشفة',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusUpdate = async (newStatus: 'draft' | 'pending_warehouse_signature' | 'warehouse_signed' | 'sent_to_admin_office' | 'received_by_admin_office' | 'returned_to_warehouse' | 'archived' | 'rejected') => {
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
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => navigate(`/declaration/${declaration.id}/timeline`)}
                className="gap-2"
              >
                <Clock className="w-4 h-4" />
                مسار الإقرار
              </Button>
              <Badge className={statusColors[declaration.status]}>
                {statusLabels[declaration.status]}
              </Badge>
            </div>
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
                      <SelectItem value="draft">مسودة</SelectItem>
                      <SelectItem value="pending_warehouse_signature">بانتظار توقيع المخزن</SelectItem>
                      <SelectItem value="warehouse_signed">موقّع من المخزن</SelectItem>
                      <SelectItem value="sent_to_admin_office">مُرسل إلى المكتب الإداري</SelectItem>
                      <SelectItem value="received_by_admin_office">مستلم من المكتب الإداري</SelectItem>
                      <SelectItem value="returned_to_warehouse">مُعاد إلى المخزن للأرشفة</SelectItem>
                      <SelectItem value="archived">مؤرشف</SelectItem>
                      <SelectItem value="rejected">مرفوض / يحتاج إلى تصحيح</SelectItem>
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
                  {toHijriDateLong(declaration.created_at)}
                </p>
              </div>

              <div>
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  آخر تحديث
                </label>
                <p className="text-lg">
                  {toHijriDateLong(declaration.updated_at)}
                </p>
              </div>

              <div className="md:col-span-2">
                <Label className="flex items-center gap-2 mb-2">
                  <Archive className="w-4 h-4" />
                  رقم ملف الأرشفة
                </Label>
                {canUpdateStatus ? (
                  <div className="flex gap-2">
                    <Input
                      value={archiveNumber}
                      onChange={(e) => setArchiveNumber(e.target.value)}
                      placeholder="أدخل رقم ملف الأرشفة (مثال: S1, S2)"
                      disabled={updating || !editingArchive}
                      className="flex-1"
                    />
                    {!editingArchive ? (
                      <Button
                        onClick={() => setEditingArchive(true)}
                        variant="outline"
                        disabled={updating}
                      >
                        تعديل
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={generateArchiveNumber}
                          variant="outline"
                          disabled={updating}
                        >
                          توليد تلقائي
                        </Button>
                        <Button
                          onClick={handleArchiveNumberUpdate}
                          disabled={updating}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          حفظ
                        </Button>
                        <Button
                          onClick={() => {
                            setArchiveNumber(declaration.archive_number || '');
                            setEditingArchive(false);
                          }}
                          variant="outline"
                          disabled={updating}
                        >
                          إلغاء
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-lg font-medium">
                    {declaration.archive_number || 'لم يتم تحديد رقم الأرشفة'}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  رقم الملف الذي سيتم أرشفة الإقرار فيه
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
