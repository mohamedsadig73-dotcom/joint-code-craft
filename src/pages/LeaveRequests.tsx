import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { formatDate } from '@/utils/dateUtils';
import { format, differenceInDays, addDays } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { 
  Plus, 
  CalendarIcon, 
  FileSpreadsheet, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Download,
  User,
  Building,
  Phone
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { PageTransition } from '@/components/PageTransition';
import { exportLeaveRequestsToExcel } from '@/utils/leaveExcelExport';

interface LeaveRequest {
  id: string;
  employee_name: string;
  employee_id: string;
  department: string;
  job_title: string;
  hire_date: string;
  original_balance: number;
  current_remaining_balance: number;
  start_date_gregorian: string;
  end_date_gregorian: string;
  days_requested: number;
  expected_return_date: string;
  reason: string | null;
  deputy_name: string | null;
  deputy_department: string | null;
  deputy_contact: string | null;
  previously_used_days: number;
  expected_remaining_balance: number;
  months_of_service: number;
  request_status: string;
  manager_approved: boolean | null;
  hr_approved: boolean | null;
  created_at: string;
}

const LeaveRequests = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const isRTL = language === 'ar';
  // Form state
  const [formData, setFormData] = useState({
    employee_name: '',
    employee_id: '',
    department: '',
    job_title: '',
    hire_date: undefined as Date | undefined,
    original_balance: 21,
    current_remaining_balance: 21,
    previously_used_days: 0,
    start_date: undefined as Date | undefined,
    end_date: undefined as Date | undefined,
    reason: '',
    deputy_name: '',
    deputy_department: '',
    deputy_contact: '',
  });

  // Fetch leave requests
  const { data: leaveRequests = [], isLoading } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as LeaveRequest[];
    },
  });

  // Create leave request mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!data.start_date || !data.end_date || !data.hire_date) {
        throw new Error('Please fill all required dates');
      }

      const daysRequested = differenceInDays(data.end_date, data.start_date) + 1;
      const expectedReturnDate = addDays(data.end_date, 1);

      const { error } = await supabase.from('leave_requests').insert({
        employee_name: data.employee_name,
        employee_id: data.employee_id,
        department: data.department,
        job_title: data.job_title,
        hire_date: format(data.hire_date, 'yyyy-MM-dd'),
        original_balance: data.original_balance,
        current_remaining_balance: data.current_remaining_balance,
        previously_used_days: data.previously_used_days,
        start_date_gregorian: format(data.start_date, 'yyyy-MM-dd'),
        end_date_gregorian: format(data.end_date, 'yyyy-MM-dd'),
        days_requested: daysRequested,
        expected_return_date: format(expectedReturnDate, 'yyyy-MM-dd'),
        reason: data.reason || null,
        deputy_name: data.deputy_name || null,
        deputy_department: data.deputy_department || null,
        deputy_contact: data.deputy_contact || null,
        created_by: user?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: t('success'), description: t('leaveRequestCreated') });
    },
    onError: (error) => {
      console.error('Error creating leave request:', error);
      toast({ title: t('error'), description: t('leaveRequestCreationFailed'), variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({
      employee_name: '',
      employee_id: '',
      department: '',
      job_title: '',
      hire_date: undefined,
      original_balance: 21,
      current_remaining_balance: 21,
      previously_used_days: 0,
      start_date: undefined,
      end_date: undefined,
      reason: '',
      deputy_name: '',
      deputy_department: '',
      deputy_contact: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_name || !formData.employee_id || !formData.department || 
        !formData.job_title || !formData.hire_date || !formData.start_date || !formData.end_date) {
      toast({ title: t('error'), description: t('fillAllFields'), variant: 'destructive' });
      return;
    }
    createMutation.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30"><Clock className="w-3 h-3 mr-1" />{t('pending')}</Badge>;
      case 'rejected_less_than_6_months':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />{t('rejectedLessThan6Months')}</Badge>;
      case 'rejected_insufficient_balance':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />{t('rejectedInsufficientBalance')}</Badge>;
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />{t('approved')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleExportExcel = () => {
    if (leaveRequests.length === 0) {
      toast({ title: t('error'), description: t('noData'), variant: 'destructive' });
      return;
    }
    exportLeaveRequestsToExcel(leaveRequests, language);
    toast({ title: t('success'), description: t('exportSuccess') });
  };

  // Calculate days requested when dates change
  const daysRequested = formData.start_date && formData.end_date 
    ? differenceInDays(formData.end_date, formData.start_date) + 1 
    : 0;

  const expectedRemainingBalance = formData.original_balance - formData.previously_used_days - daysRequested;

  return (
    <div className="min-h-screen" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navigation />
      <PageTransition>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs />
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold gradient-text">{t('leaveRequests')}</h1>
              <p className="text-muted-foreground mt-1">{t('leaveRequestsSubtitle')}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportExcel}>
                <Download className="w-4 h-4 mr-2" />
                {t('exportExcel')}
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('newLeaveRequest')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{t('annualLeaveRequestForm')}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Employee Information Section */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <User className="w-5 h-5" />
                          {t('employeeInformation')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t('employeeName')} / Full Name *</Label>
                          <Input
                            value={formData.employee_name}
                            onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('employeeId')} / Employee ID *</Label>
                          <Input
                            value={formData.employee_id}
                            onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('department')} / Department *</Label>
                          <Input
                            value={formData.department}
                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('jobTitle')} / Job Title *</Label>
                          <Input
                            value={formData.job_title}
                            onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('hireDate')} / Hire Date *</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.hire_date && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.hire_date ? format(formData.hire_date, "PPP", { locale: isRTL ? ar : enUS }) : t('selectDate')}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={formData.hire_date}
                                onSelect={(date) => setFormData({ ...formData, hire_date: date })}
                                initialFocus
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-2">
                          <Label>{t('originalBalance')} / Original Balance (Days)</Label>
                          <Input
                            type="number"
                            value={formData.original_balance}
                            onChange={(e) => setFormData({ ...formData, original_balance: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('previouslyUsedDays')} / Previously Used Days</Label>
                          <Input
                            type="number"
                            value={formData.previously_used_days}
                            onChange={(e) => setFormData({ ...formData, previously_used_days: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('currentRemainingBalance')} / Current Balance</Label>
                          <Input
                            type="number"
                            value={formData.original_balance - formData.previously_used_days}
                            readOnly
                            className="bg-muted"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Request Details Section */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <CalendarIcon className="w-5 h-5" />
                          {t('requestDetails')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t('leaveStartDate')} / Start Date *</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.start_date && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.start_date ? format(formData.start_date, "PPP", { locale: isRTL ? ar : enUS }) : t('selectDate')}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={formData.start_date}
                                onSelect={(date) => setFormData({ ...formData, start_date: date })}
                                initialFocus
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-2">
                          <Label>{t('leaveEndDate')} / End Date *</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.end_date && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.end_date ? format(formData.end_date, "PPP", { locale: isRTL ? ar : enUS }) : t('selectDate')}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={formData.end_date}
                                onSelect={(date) => setFormData({ ...formData, end_date: date })}
                                initialFocus
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-2">
                          <Label>{t('daysRequested')} / Days Requested</Label>
                          <Input
                            type="number"
                            value={daysRequested}
                            readOnly
                            className="bg-muted font-semibold"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('expectedRemainingBalance')} / Expected Remaining</Label>
                          <Input
                            type="number"
                            value={expectedRemainingBalance}
                            readOnly
                            className={cn("font-semibold", expectedRemainingBalance < 5 ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-600")}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Reason Section */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{t('leaveReason')} / Reason (Optional)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          value={formData.reason}
                          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                          placeholder={t('enterLeaveReason')}
                          rows={2}
                        />
                      </CardContent>
                    </Card>

                    {/* Deputy Section */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Building className="w-5 h-5" />
                          {t('deputyInformation')} / Substitute
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>{t('deputyName')} / Deputy Name</Label>
                          <Input
                            value={formData.deputy_name}
                            onChange={(e) => setFormData({ ...formData, deputy_name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('deputyDepartment')} / Department</Label>
                          <Input
                            value={formData.deputy_department}
                            onChange={(e) => setFormData({ ...formData, deputy_department: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('deputyContact')} / Contact</Label>
                          <Input
                            value={formData.deputy_contact}
                            onChange={(e) => setFormData({ ...formData, deputy_contact: e.target.value })}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Warning Notice */}
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                        <div className="text-sm text-amber-800 dark:text-amber-200">
                          <p className="font-semibold mb-1">{t('importantNotice')}</p>
                          <p>{t('leaveWarningMessage')}</p>
                          <p className="mt-1 text-xs opacity-80">
                            Annual leave is granted only after completing 6 months of employment, and the remaining balance must not be less than 5 days after deducting the requested period.
                          </p>
                        </div>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        {t('cancel')}
                      </Button>
                      <Button type="submit" disabled={createMutation.isPending}>
                        {createMutation.isPending ? t('creating') : t('submitRequest')}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('totalRequests')}</p>
                    <p className="text-2xl font-bold">{leaveRequests.length}</p>
                  </div>
                  <FileSpreadsheet className="w-8 h-8 text-primary opacity-80" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('pendingRequests')}</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {leaveRequests.filter(r => r.request_status === 'pending').length}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-amber-500 opacity-80" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('approvedRequests')}</p>
                    <p className="text-2xl font-bold text-green-600">
                      {leaveRequests.filter(r => r.request_status === 'approved').length}
                    </p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-green-500 opacity-80" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('rejectedRequests')}</p>
                    <p className="text-2xl font-bold text-destructive">
                      {leaveRequests.filter(r => r.request_status.startsWith('rejected')).length}
                    </p>
                  </div>
                  <XCircle className="w-8 h-8 text-destructive opacity-80" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Requests Table */}
          <Card>
            <CardHeader>
              <CardTitle>{t('allLeaveRequests')}</CardTitle>
              <CardDescription>{t('allLeaveRequestsDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : leaveRequests.length === 0 ? (
                <div className="text-center py-12">
                  <FileSpreadsheet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{t('noLeaveRequests')}</h3>
                  <p className="text-muted-foreground mb-4">{t('noLeaveRequestsDescription')}</p>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('newLeaveRequest')}
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('employeeName')}</TableHead>
                        <TableHead>{t('employeeId')}</TableHead>
                        <TableHead>{t('department')}</TableHead>
                        <TableHead>{t('leaveStartDate')}</TableHead>
                        <TableHead>{t('leaveEndDate')}</TableHead>
                        <TableHead>{t('daysRequested')}</TableHead>
                        <TableHead>{t('remainingBalance')}</TableHead>
                        <TableHead>{t('status')}</TableHead>
                        <TableHead>{t('createdDate')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaveRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">{request.employee_name}</TableCell>
                          <TableCell>{request.employee_id}</TableCell>
                          <TableCell>{request.department}</TableCell>
                          <TableCell>{formatDate(request.start_date_gregorian)}</TableCell>
                          <TableCell>{formatDate(request.end_date_gregorian)}</TableCell>
                          <TableCell className="font-semibold">{request.days_requested}</TableCell>
                          <TableCell className={cn("font-semibold", request.expected_remaining_balance < 5 ? "text-destructive" : "text-green-600")}>
                            {request.expected_remaining_balance}
                          </TableCell>
                          <TableCell>{getStatusBadge(request.request_status)}</TableCell>
                          <TableCell>{formatDate(request.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </PageTransition>
    </div>
  );
};

export default LeaveRequests;
