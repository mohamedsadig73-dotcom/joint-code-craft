import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Shield, 
  FileCheck, 
  Thermometer, 
  UserCheck, 
  AlertTriangle,
  CheckCircle,
  Plus,
  Download,
  Clock,
  FileText,
  Lock,
  Eye,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';

interface ComplianceLog {
  id: string;
  log_type: string;
  title: string;
  description: string | null;
  severity: string;
  created_at: string;
  resolved_at: string | null;
}

interface HACCPCheck {
  id: string;
  check_point: string;
  check_type: string;
  temperature_reading: number | null;
  humidity_reading: number | null;
  is_compliant: boolean;
  deviation_notes: string | null;
  corrective_action: string | null;
  verification_date: string;
  next_check_due: string | null;
}

interface GDPRRequest {
  id: string;
  request_type: string;
  requester_email: string;
  requester_name: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  processed_at: string | null;
  due_date: string | null;
}

const severityColors: Record<string, string> = {
  info: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  critical: 'bg-red-500/10 text-red-500 border-red-500/20',
  resolved: 'bg-green-500/10 text-green-500 border-green-500/20',
};

const gdprStatusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  processing: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  completed: 'bg-green-500/10 text-green-500 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
};

export default function WMSCompliance() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [complianceLogs, setComplianceLogs] = useState<ComplianceLog[]>([]);
  const [haccpChecks, setHaccpChecks] = useState<HACCPCheck[]>([]);
  const [gdprRequests, setGdprRequests] = useState<GDPRRequest[]>([]);
  const [isHACCPDialogOpen, setIsHACCPDialogOpen] = useState(false);
  const [isGDPRDialogOpen, setIsGDPRDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [haccpForm, setHaccpForm] = useState({
    check_point: '',
    check_type: 'ccp',
    temperature_reading: '',
    humidity_reading: '',
    is_compliant: true,
    deviation_notes: '',
    corrective_action: '',
  });

  const [gdprForm, setGdprForm] = useState({
    request_type: 'data_export',
    requester_email: '',
    requester_name: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [logsRes, haccpRes, gdprRes] = await Promise.all([
        supabase
          .from('compliance_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('haccp_checks')
          .select('*')
          .order('verification_date', { ascending: false })
          .limit(50),
        supabase
          .from('gdpr_requests')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      setComplianceLogs(logsRes.data || []);
      setHaccpChecks(haccpRes.data || []);
      setGdprRequests(gdprRes.data || []);
    } catch (error: any) {
      console.error('Error loading compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHACCPSubmit = async () => {
    if (!haccpForm.check_point) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى إدخال نقطة الفحص' : 'Please enter check point',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('haccp_checks').insert({
        check_point: haccpForm.check_point,
        check_type: haccpForm.check_type,
        temperature_reading: haccpForm.temperature_reading ? parseFloat(haccpForm.temperature_reading) : null,
        humidity_reading: haccpForm.humidity_reading ? parseFloat(haccpForm.humidity_reading) : null,
        is_compliant: haccpForm.is_compliant,
        deviation_notes: haccpForm.deviation_notes || null,
        corrective_action: haccpForm.corrective_action || null,
        verified_by: user?.id,
        next_check_due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      if (error) throw error;

      // Log compliance event
      await supabase.from('compliance_logs').insert({
        log_type: 'haccp',
        title: `HACCP Check: ${haccpForm.check_point}`,
        description: haccpForm.is_compliant ? 'Compliant' : 'Non-compliant - ' + haccpForm.deviation_notes,
        severity: haccpForm.is_compliant ? 'info' : 'warning',
        created_by: user?.id,
      });

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' ? 'تم تسجيل فحص HACCP' : 'HACCP check recorded',
      });

      setIsHACCPDialogOpen(false);
      resetHACCPForm();
      loadData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGDPRSubmit = async () => {
    if (!gdprForm.requester_email) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى إدخال البريد الإلكتروني' : 'Please enter email',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('gdpr_requests').insert({
        request_type: gdprForm.request_type,
        requester_email: gdprForm.requester_email,
        requester_name: gdprForm.requester_name || null,
        notes: gdprForm.notes || null,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      });

      if (error) throw error;

      // Log GDPR event
      await supabase.from('compliance_logs').insert({
        log_type: 'gdpr',
        title: `GDPR Request: ${gdprForm.request_type}`,
        description: `Request from ${gdprForm.requester_email}`,
        severity: 'info',
        created_by: user?.id,
      });

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' ? 'تم تسجيل طلب GDPR' : 'GDPR request recorded',
      });

      setIsGDPRDialogOpen(false);
      resetGDPRForm();
      loadData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const updateGDPRStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('gdpr_requests')
        .update({ 
          status, 
          processed_at: status !== 'pending' ? new Date().toISOString() : null,
          processed_by: user?.id,
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' ? 'تم تحديث الحالة' : 'Status updated',
      });

      loadData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
      });
    }
  };

  const resetHACCPForm = () => {
    setHaccpForm({
      check_point: '',
      check_type: 'ccp',
      temperature_reading: '',
      humidity_reading: '',
      is_compliant: true,
      deviation_notes: '',
      corrective_action: '',
    });
  };

  const resetGDPRForm = () => {
    setGdprForm({
      request_type: 'data_export',
      requester_email: '',
      requester_name: '',
      notes: '',
    });
  };

  const generateComplianceReport = () => {
    const report = {
      generated_at: new Date().toISOString(),
      haccp_checks: haccpChecks.length,
      compliant_checks: haccpChecks.filter(c => c.is_compliant).length,
      gdpr_requests: gdprRequests.length,
      pending_gdpr: gdprRequests.filter(r => r.status === 'pending').length,
      compliance_rate: haccpChecks.length > 0 
        ? Math.round((haccpChecks.filter(c => c.is_compliant).length / haccpChecks.length) * 100)
        : 100,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();

    toast({
      title: language === 'ar' ? 'تم بنجاح' : 'Success',
      description: language === 'ar' ? 'تم تحميل التقرير' : 'Report downloaded',
    });
  };

  const complianceRate = haccpChecks.length > 0 
    ? Math.round((haccpChecks.filter(c => c.is_compliant).length / haccpChecks.length) * 100)
    : 100;

  const canManage = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div className="min-h-screen">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6" />
              {language === 'ar' ? 'الامتثال واللوائح' : 'Compliance & Regulations'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'HACCP / FDA / GDPR' : 'HACCP / FDA / GDPR Compliance'}
            </p>
          </div>

          <Button onClick={generateComplianceReport} className="gap-2">
            <Download className="w-4 h-4" />
            {language === 'ar' ? 'تقرير الامتثال' : 'Compliance Report'}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'نسبة الامتثال' : 'Compliance Rate'}
                  </p>
                  <p className="text-2xl font-bold">{complianceRate}%</p>
                </div>
              </div>
              <Progress value={complianceRate} className="mt-3" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <FileCheck className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'فحوصات HACCP' : 'HACCP Checks'}
                  </p>
                  <p className="text-2xl font-bold">{haccpChecks.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <Lock className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'طلبات GDPR' : 'GDPR Requests'}
                  </p>
                  <p className="text-2xl font-bold">{gdprRequests.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-yellow-500/10">
                  <AlertTriangle className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'انتظار المعالجة' : 'Pending'}
                  </p>
                  <p className="text-2xl font-bold">
                    {gdprRequests.filter(r => r.status === 'pending').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="haccp" className="space-y-4">
          <TabsList>
            <TabsTrigger value="haccp" className="gap-2">
              <Thermometer className="w-4 h-4" />
              HACCP
            </TabsTrigger>
            <TabsTrigger value="gdpr" className="gap-2">
              <Lock className="w-4 h-4" />
              GDPR
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <FileText className="w-4 h-4" />
              {language === 'ar' ? 'السجلات' : 'Logs'}
            </TabsTrigger>
          </TabsList>

          {/* HACCP Tab */}
          <TabsContent value="haccp">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{language === 'ar' ? 'فحوصات HACCP' : 'HACCP Checks'}</CardTitle>
                  <CardDescription>
                    {language === 'ar' ? 'نقاط التحكم الحرجة' : 'Hazard Analysis Critical Control Points'}
                  </CardDescription>
                </div>
                {canManage && (
                  <Dialog open={isHACCPDialogOpen} onOpenChange={setIsHACCPDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="gap-2">
                        <Plus className="w-4 h-4" />
                        {language === 'ar' ? 'فحص جديد' : 'New Check'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {language === 'ar' ? 'تسجيل فحص HACCP' : 'Record HACCP Check'}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>{language === 'ar' ? 'نقطة الفحص' : 'Check Point'} *</Label>
                          <Input
                            value={haccpForm.check_point}
                            onChange={(e) => setHaccpForm({ ...haccpForm, check_point: e.target.value })}
                            placeholder={language === 'ar' ? 'مثال: ثلاجة التخزين الرئيسية' : 'e.g., Main Storage Cooler'}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>{language === 'ar' ? 'نوع الفحص' : 'Check Type'}</Label>
                          <Select
                            value={haccpForm.check_type}
                            onValueChange={(v) => setHaccpForm({ ...haccpForm, check_type: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ccp">CCP - Critical Control Point</SelectItem>
                              <SelectItem value="oprp">OPRP - Operational PRP</SelectItem>
                              <SelectItem value="prp">PRP - Prerequisite Program</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>{language === 'ar' ? 'درجة الحرارة (°C)' : 'Temperature (°C)'}</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={haccpForm.temperature_reading}
                              onChange={(e) => setHaccpForm({ ...haccpForm, temperature_reading: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>{language === 'ar' ? 'الرطوبة (%)' : 'Humidity (%)'}</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={haccpForm.humidity_reading}
                              onChange={(e) => setHaccpForm({ ...haccpForm, humidity_reading: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>{language === 'ar' ? 'الحالة' : 'Status'}</Label>
                          <Select
                            value={haccpForm.is_compliant ? 'compliant' : 'non-compliant'}
                            onValueChange={(v) => setHaccpForm({ ...haccpForm, is_compliant: v === 'compliant' })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="compliant">
                                {language === 'ar' ? 'متوافق' : 'Compliant'}
                              </SelectItem>
                              <SelectItem value="non-compliant">
                                {language === 'ar' ? 'غير متوافق' : 'Non-Compliant'}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {!haccpForm.is_compliant && (
                          <>
                            <div className="space-y-2">
                              <Label>{language === 'ar' ? 'ملاحظات الانحراف' : 'Deviation Notes'}</Label>
                              <Textarea
                                value={haccpForm.deviation_notes}
                                onChange={(e) => setHaccpForm({ ...haccpForm, deviation_notes: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>{language === 'ar' ? 'الإجراء التصحيحي' : 'Corrective Action'}</Label>
                              <Textarea
                                value={haccpForm.corrective_action}
                                onChange={(e) => setHaccpForm({ ...haccpForm, corrective_action: e.target.value })}
                              />
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsHACCPDialogOpen(false)}>
                          {language === 'ar' ? 'إلغاء' : 'Cancel'}
                        </Button>
                        <Button onClick={handleHACCPSubmit} disabled={saving}>
                          {saving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ' : 'Save')}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'ar' ? 'نقطة الفحص' : 'Check Point'}</TableHead>
                        <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الحرارة' : 'Temp'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                        <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {haccpChecks.map((check) => (
                        <TableRow key={check.id}>
                          <TableCell className="font-medium">{check.check_point}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{check.check_type.toUpperCase()}</Badge>
                          </TableCell>
                          <TableCell>
                            {check.temperature_reading !== null ? `${check.temperature_reading}°C` : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge className={check.is_compliant ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}>
                              {check.is_compliant 
                                ? (language === 'ar' ? 'متوافق' : 'Compliant')
                                : (language === 'ar' ? 'غير متوافق' : 'Non-Compliant')
                              }
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(check.verification_date), 'yyyy-MM-dd HH:mm')}
                          </TableCell>
                        </TableRow>
                      ))}
                      {haccpChecks.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            {language === 'ar' ? 'لا توجد فحوصات' : 'No checks recorded'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* GDPR Tab */}
          <TabsContent value="gdpr">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{language === 'ar' ? 'طلبات GDPR' : 'GDPR Requests'}</CardTitle>
                  <CardDescription>
                    {language === 'ar' ? 'طلبات حماية البيانات الشخصية' : 'General Data Protection Regulation Requests'}
                  </CardDescription>
                </div>
                {canManage && (
                  <Dialog open={isGDPRDialogOpen} onOpenChange={setIsGDPRDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="gap-2">
                        <Plus className="w-4 h-4" />
                        {language === 'ar' ? 'طلب جديد' : 'New Request'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {language === 'ar' ? 'تسجيل طلب GDPR' : 'Record GDPR Request'}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>{language === 'ar' ? 'نوع الطلب' : 'Request Type'}</Label>
                          <Select
                            value={gdprForm.request_type}
                            onValueChange={(v) => setGdprForm({ ...gdprForm, request_type: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="data_export">
                                {language === 'ar' ? 'تصدير البيانات' : 'Data Export'}
                              </SelectItem>
                              <SelectItem value="data_deletion">
                                {language === 'ar' ? 'حذف البيانات' : 'Data Deletion'}
                              </SelectItem>
                              <SelectItem value="data_rectification">
                                {language === 'ar' ? 'تصحيح البيانات' : 'Data Rectification'}
                              </SelectItem>
                              <SelectItem value="consent_withdrawal">
                                {language === 'ar' ? 'سحب الموافقة' : 'Consent Withdrawal'}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>{language === 'ar' ? 'البريد الإلكتروني' : 'Email'} *</Label>
                          <Input
                            type="email"
                            value={gdprForm.requester_email}
                            onChange={(e) => setGdprForm({ ...gdprForm, requester_email: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>{language === 'ar' ? 'الاسم' : 'Name'}</Label>
                          <Input
                            value={gdprForm.requester_name}
                            onChange={(e) => setGdprForm({ ...gdprForm, requester_name: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
                          <Textarea
                            value={gdprForm.notes}
                            onChange={(e) => setGdprForm({ ...gdprForm, notes: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsGDPRDialogOpen(false)}>
                          {language === 'ar' ? 'إلغاء' : 'Cancel'}
                        </Button>
                        <Button onClick={handleGDPRSubmit} disabled={saving}>
                          {saving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ' : 'Save')}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                        <TableHead>{language === 'ar' ? 'البريد' : 'Email'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                        <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gdprRequests.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell>
                            <Badge variant="outline">
                              {req.request_type.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>{req.requester_email}</TableCell>
                          <TableCell>
                            <Badge className={gdprStatusColors[req.status]}>
                              {req.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(req.created_at), 'yyyy-MM-dd')}
                          </TableCell>
                          <TableCell>
                            {canManage && req.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateGDPRStatus(req.id, 'processing')}
                                >
                                  {language === 'ar' ? 'معالجة' : 'Process'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => updateGDPRStatus(req.id, 'completed')}
                                >
                                  {language === 'ar' ? 'اكتمال' : 'Complete'}
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {gdprRequests.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            {language === 'ar' ? 'لا توجد طلبات' : 'No requests'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'سجلات الامتثال' : 'Compliance Logs'}</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                        <TableHead>{language === 'ar' ? 'العنوان' : 'Title'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الأهمية' : 'Severity'}</TableHead>
                        <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {complianceLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Badge variant="outline">{log.log_type.toUpperCase()}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{log.title}</TableCell>
                          <TableCell>
                            <Badge className={severityColors[log.severity]}>
                              {log.severity}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm')}
                          </TableCell>
                        </TableRow>
                      ))}
                      {complianceLogs.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            {language === 'ar' ? 'لا توجد سجلات' : 'No logs'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}