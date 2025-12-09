import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { toGregorianDateLong, toGregorianDateTime, sortArchiveNumbers } from '@/utils/dateUtils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Calendar, User, FileText, Clock, Archive, Save, CheckCircle2, Circle, Info, History } from 'lucide-react';

interface ArchiveFile {
  id: string;
  archive_number: string;
  description: string | null;
}

interface DeclarationDetails {
  id: string;
  type: 'دخول' | 'خروج';
  status: 'draft' | 'pending_warehouse_signature' | 'warehouse_signed' | 'sent_to_admin_office' | 'received_by_admin_office' | 'returned_to_warehouse' | 'archived' | 'rejected';
  archive_number: string | null;
  archive_file_id: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sender_id: string;
  sender: {
    username: string;
    email: string;
  };
  archive_file?: ArchiveFile;
}

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
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedArchiveFileId, setSelectedArchiveFileId] = useState<string>('');
  const [archiveFiles, setArchiveFiles] = useState<ArchiveFile[]>([]);
  const [editingArchive, setEditingArchive] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    loadAllData();
  }, [id]);

  useEffect(() => {
    if (declaration) {
      setSelectedArchiveFileId(declaration.archive_file_id || '');
    }
  }, [declaration]);

  const loadAllData = async () => {
    try {
      const [declarationResult, historyResult, archiveFilesResult] = await Promise.all([
        supabase
          .from('declarations')
          .select(`
            *,
            sender:profiles!sender_id(username, email),
            archive_file:archive_files!archive_file_id(id, archive_number, description)
          `)
          .eq('id', id)
          .maybeSingle(),
        supabase
          .from('declaration_status_history')
          .select(`
            *,
            changer:profiles!declaration_status_history_changed_by_fkey(username, email)
          `)
          .eq('declaration_id', id)
          .order('changed_at', { ascending: false }),
        supabase
          .from('archive_files')
          .select('id, archive_number, description'),
      ]);

      if (declarationResult.error) throw declarationResult.error;

      if (!declarationResult.data) {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'الإقرار غير موجود',
        });
        navigate('/');
        return;
      }

      setDeclaration(declarationResult.data as any);
      setHistory(historyResult.data as any || []);
      setArchiveFiles(sortArchiveNumbers(archiveFilesResult.data || []));
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

  const handleArchiveFileUpdate = async () => {
    if (!declaration) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('declarations')
        .update({ archive_file_id: selectedArchiveFileId || null })
        .eq('id', declaration.id);

      if (error) throw error;

      toast({
        title: 'تم بنجاح',
        description: 'تم تحديث ملف الأرشفة',
      });

      await loadAllData();
      setEditingArchive(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: error.message || 'فشل تحديث ملف الأرشفة',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusUpdate = async (newStatus: typeof declaration.status) => {
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
      await loadAllData(); // Reload to get updated history
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
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-12 w-full mb-6" />
          <div className="grid gap-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
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
        {/* Breadcrumbs */}
        <Breadcrumbs />

        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="gap-2 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            العودة للوحة التحكم
          </Button>
          
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">تفاصيل الإقرار</h1>
              <p className="text-muted-foreground font-mono">{declaration.id}</p>
            </div>
            <Badge className={statusColors[declaration.status]}>
              {statusLabels[declaration.status]}
            </Badge>
          </div>
        </div>

        {/* Tabs: Details + Timeline */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="details" className="gap-2">
              <Info className="w-4 h-4" />
              التفاصيل
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2">
              <History className="w-4 h-4" />
              المسار ({history.length})
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            {/* Main Details Card */}
            <Card className="glass-card">
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
                      {toGregorianDateLong(declaration.created_at)}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      آخر تحديث
                    </label>
                    <p className="text-lg">
                      {toGregorianDateLong(declaration.updated_at)}
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <Label className="flex items-center gap-2 mb-2">
                      <Archive className="w-4 h-4" />
                      ملف الأرشفة
                    </Label>
                    {canUpdateStatus ? (
                      <div className="flex gap-2">
                        <Select
                          value={selectedArchiveFileId}
                          onValueChange={setSelectedArchiveFileId}
                          disabled={updating || !editingArchive}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="اختر ملف الأرشفة" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">بدون ملف أرشفة</SelectItem>
                            {archiveFiles.map((file) => (
                              <SelectItem key={file.id} value={file.id}>
                                {file.archive_number} {file.description ? `- ${file.description}` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                              onClick={handleArchiveFileUpdate}
                              disabled={updating}
                            >
                              <Save className="w-4 h-4 me-2" />
                              حفظ
                            </Button>
                            <Button
                              onClick={() => {
                                setSelectedArchiveFileId(declaration.archive_file_id || '');
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
                        {declaration.archive_file 
                          ? `${declaration.archive_file.archive_number}${declaration.archive_file.description ? ` - ${declaration.archive_file.description}` : ''}`
                          : 'لم يتم تحديد ملف أرشفة'}
                      </p>
                    )}
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
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-6">
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
                    <div className="absolute end-4 top-0 bottom-0 w-0.5 bg-border/50" />

                    {/* Timeline Items */}
                    <div className="space-y-6">
                      {history.map((entry, index) => {
                        const isFirst = index === 0;
                        
                        return (
                          <div key={entry.id} className="relative pe-12">
                            {/* Timeline Dot */}
                            <div className="absolute end-0 top-1 w-8 h-8 rounded-full bg-background border-2 border-primary flex items-center justify-center">
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
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
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

                                  <div className="text-start ms-4">
                                    <div className="text-sm font-medium">
                                      {toGregorianDateTime(entry.changed_at)}
                                    </div>
                                  </div>
                                </div>
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
