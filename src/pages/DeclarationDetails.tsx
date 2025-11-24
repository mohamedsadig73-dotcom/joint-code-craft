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
import { ArrowLeft, Calendar, User, FileText, Clock, Printer, Download, FileSpreadsheet } from 'lucide-react';
import { exportDeclarationsToPDF } from '@/utils/pdfExport';
import { exportDeclarationsToExcel } from '@/utils/excelExport';

interface DeclarationDetails {
  id: string;
  type: 'دخول' | 'خروج';
  status: 'draft' | 'pending_warehouse_signature' | 'warehouse_signed' | 'sent_to_admin_office' | 'received_by_admin_office' | 'returned_to_warehouse' | 'archived' | 'rejected';
  created_at: string;
  updated_at: string;
  sender_id: string;
  archive_number?: string;
  phone?: string;
  notes?: string;
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

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    if (!declaration) return;

    try {
      const exportData = [{
        id: declaration.id,
        type: declaration.type,
        sender: declaration.sender.username,
        status: statusLabels[declaration.status],
        created_at: new Date(declaration.created_at).toLocaleDateString('ar-SA'),
      }];

      const doc = exportDeclarationsToPDF(exportData, `تفاصيل الإقرار ${declaration.id}`);
      doc.save(`إقرار_${declaration.id}.pdf`);

      toast({
        title: 'تم بنجاح',
        description: 'تم تصدير الإقرار إلى PDF',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'فشل تصدير الإقرار',
      });
    }
  };

  const handleExportExcel = () => {
    if (!declaration) return;

    try {
      const exportData = [{
        id: declaration.id,
        type: declaration.type,
        sender: declaration.sender.username,
        status: statusLabels[declaration.status],
        created_at: new Date(declaration.created_at).toLocaleDateString('ar-SA'),
      }];

      exportDeclarationsToExcel(exportData, `إقرار_${declaration.id}`);

      toast({
        title: 'تم بنجاح',
        description: 'تم تصدير الإقرار إلى Excel',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'فشل تصدير الإقرار',
      });
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
        <div className="mb-6 no-print">
          <Button
            variant="ghost"
            onClick={() => navigate('/manage')}
            className="gap-2 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            العودة للإدارة
          </Button>
          
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">تفاصيل الإقرار</h1>
              <p className="text-muted-foreground">رقم الإقرار: {declaration.id}</p>
              {declaration.archive_number && (
                <p className="text-sm text-muted-foreground">رقم الأرشيف: {declaration.archive_number}</p>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                variant="outline"
                onClick={handlePrint}
                className="gap-2 hover:bg-primary hover:text-primary-foreground hover:border-primary"
              >
                <Printer className="w-4 h-4" />
                طباعة
              </Button>
              <Button
                variant="outline"
                onClick={handleExportPDF}
                className="gap-2 hover:bg-primary hover:text-primary-foreground hover:border-primary"
              >
                <Download className="w-4 h-4" />
                PDF
              </Button>
              <Button
                variant="outline"
                onClick={handleExportExcel}
                className="gap-2 hover:bg-primary hover:text-primary-foreground hover:border-primary"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </Button>
              <Button
                variant="shimmer"
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
        <Card className="glass-card mb-6 animate-fade-in hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
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

              {declaration.archive_number && (
                <div>
                  <label className="text-sm text-muted-foreground">رقم ملف الأرشيف</label>
                  <p className="text-lg font-medium">{declaration.archive_number}</p>
                </div>
              )}

              {declaration.phone && (
                <div>
                  <label className="text-sm text-muted-foreground">رقم الهاتف</label>
                  <p className="text-lg font-medium">{declaration.phone}</p>
                </div>
              )}

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

            {declaration.notes && (
              <div className="mt-6 pt-6 border-t border-border">
                <label className="text-sm text-muted-foreground">ملاحظات</label>
                <p className="text-base mt-2 whitespace-pre-wrap">{declaration.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sender Details Card */}
        <Card className="glass-card animate-fade-in [animation-delay:150ms] hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
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

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
          .glass-card {
            background: white !important;
            border: 1px solid #ddd !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
