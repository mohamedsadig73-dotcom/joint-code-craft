/**
 * ⚠️ TECH DEBT NOTICE
 * This file (895 lines) exceeds the recommended 300-line limit.
 * Planned refactor (post-release):
 * - Extract: LeaveTable, LeaveStats, LeaveFilters, LeaveForm
 * - Extract: useLeaveTracking.ts hook for data/logic
 * - No UI, DB, or logic changes — extraction only
 * Ticket: TECH-DEBT-002
 */
import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { formatDate } from '@/utils/dateUtils';
import { format, addYears, differenceInDays, isAfter, isBefore, isWithinInterval, addDays } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { 
  Plus, 
  CalendarIcon, 
  Download,
  User,
  Users,
  Plane,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  Edit,
  Trash2
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { PageTransition } from '@/components/PageTransition';
import { exportLeaveTrackingToExcel, exportUpcomingLeavesReport, exportOverdueReturnsReport } from '@/utils/leaveTrackingExport';

// Types
interface LeaveTracking {
  id: string;
  employee_name: string;
  employee_id: string;
  job_title: string;
  department: string;
  contract_type: 'employee' | 'worker';
  hire_date: string;
  last_leave_start: string | null;
  last_leave_end: string | null;
  current_leave_start: string | null;
  current_leave_end: string | null;
  expected_return_date: string | null;
  actual_return_date: string | null;
  entitled_days: number;
  used_days: number;
  remaining_balance: number;
  next_leave_due: string | null;
  travel_date: string | null;
  travel_destination: string | null;
  notes: string | null;
  created_at: string;
}

type EmployeeStatus = 'at_work' | 'on_leave' | 'overdue_return' | 'upcoming_leave';

// Calculate employee status based on dates
const calculateStatus = (record: LeaveTracking): EmployeeStatus => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Check if on leave
  if (record.current_leave_start && record.current_leave_end) {
    const leaveStart = new Date(record.current_leave_start);
    const leaveEnd = new Date(record.current_leave_end);
    
    if (isWithinInterval(today, { start: leaveStart, end: leaveEnd })) {
      // Check if overdue (past expected return without actual return)
      if (record.expected_return_date && !record.actual_return_date) {
        const expectedReturn = new Date(record.expected_return_date);
        if (isAfter(today, expectedReturn)) {
          return 'overdue_return';
        }
      }
      return 'on_leave';
    }
  }
  
  // Check for upcoming leave (within 30 days)
  if (record.next_leave_due) {
    const nextLeave = new Date(record.next_leave_due);
    const thirtyDaysFromNow = addDays(today, 30);
    if (isBefore(nextLeave, thirtyDaysFromNow) && isAfter(nextLeave, today)) {
      return 'upcoming_leave';
    }
  }
  
  return 'at_work';
};

// Calculate next leave due date based on contract type
const calculateNextLeaveDue = (lastLeaveEnd: string | null, contractType: 'employee' | 'worker', hireDate: string): Date => {
  if (lastLeaveEnd) {
    const yearsToAdd = contractType === 'employee' ? 1 : 2;
    return addYears(new Date(lastLeaveEnd), yearsToAdd);
  }
  // If no previous leave, calculate from hire date
  const yearsToAdd = contractType === 'employee' ? 1 : 2;
  return addYears(new Date(hireDate), yearsToAdd);
};

const LeaveTracking = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<LeaveTracking | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [contractFilter, setContractFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const isRTL = language === 'ar';

  // Form state
  const [formData, setFormData] = useState({
    employee_name: '',
    employee_id: '',
    job_title: '',
    department: '',
    contract_type: 'employee' as 'employee' | 'worker',
    hire_date: undefined as Date | undefined,
    last_leave_start: undefined as Date | undefined,
    last_leave_end: undefined as Date | undefined,
    current_leave_start: undefined as Date | undefined,
    current_leave_end: undefined as Date | undefined,
    expected_return_date: undefined as Date | undefined,
    actual_return_date: undefined as Date | undefined,
    entitled_days: 30,
    used_days: 0,
    travel_date: undefined as Date | undefined,
    travel_destination: '',
    notes: '',
  });

  // Fetch leave tracking records
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['leave-tracking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_tracking')
        .select('*')
        .order('employee_name', { ascending: true });
      
      if (error) throw error;
      return data as LeaveTracking[];
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!data.hire_date) {
        throw new Error('Hire date is required');
      }

      const nextLeaveDue = calculateNextLeaveDue(
        data.last_leave_end ? format(data.last_leave_end, 'yyyy-MM-dd') : null,
        data.contract_type,
        format(data.hire_date, 'yyyy-MM-dd')
      );

      const recordData = {
        employee_name: data.employee_name,
        employee_id: data.employee_id,
        job_title: data.job_title,
        department: data.department,
        contract_type: data.contract_type,
        hire_date: format(data.hire_date, 'yyyy-MM-dd'),
        last_leave_start: data.last_leave_start ? format(data.last_leave_start, 'yyyy-MM-dd') : null,
        last_leave_end: data.last_leave_end ? format(data.last_leave_end, 'yyyy-MM-dd') : null,
        current_leave_start: data.current_leave_start ? format(data.current_leave_start, 'yyyy-MM-dd') : null,
        current_leave_end: data.current_leave_end ? format(data.current_leave_end, 'yyyy-MM-dd') : null,
        expected_return_date: data.expected_return_date ? format(data.expected_return_date, 'yyyy-MM-dd') : null,
        actual_return_date: data.actual_return_date ? format(data.actual_return_date, 'yyyy-MM-dd') : null,
        entitled_days: data.entitled_days,
        used_days: data.used_days,
        next_leave_due: format(nextLeaveDue, 'yyyy-MM-dd'),
        travel_date: data.travel_date ? format(data.travel_date, 'yyyy-MM-dd') : null,
        travel_destination: data.travel_destination || null,
        notes: data.notes || null,
        created_by: user?.id,
      };

      if (editingRecord) {
        const { error } = await supabase
          .from('leave_tracking')
          .update(recordData)
          .eq('id', editingRecord.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('leave_tracking')
          .insert(recordData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-tracking'] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: t('success'), description: editingRecord ? t('recordUpdated') : t('recordCreated') });
    },
    onError: (error) => {
      console.error('Error saving record:', error);
      toast({ title: t('error'), description: t('saveFailed'), variant: 'destructive' });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('leave_tracking')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-tracking'] });
      toast({ title: t('success'), description: t('recordDeleted') });
    },
    onError: () => {
      toast({ title: t('error'), description: t('deleteFailed'), variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({
      employee_name: '',
      employee_id: '',
      job_title: '',
      department: '',
      contract_type: 'employee',
      hire_date: undefined,
      last_leave_start: undefined,
      last_leave_end: undefined,
      current_leave_start: undefined,
      current_leave_end: undefined,
      expected_return_date: undefined,
      actual_return_date: undefined,
      entitled_days: 30,
      used_days: 0,
      travel_date: undefined,
      travel_destination: '',
      notes: '',
    });
    setEditingRecord(null);
  };

  const handleEdit = (record: LeaveTracking) => {
    setEditingRecord(record);
    setFormData({
      employee_name: record.employee_name,
      employee_id: record.employee_id,
      job_title: record.job_title,
      department: record.department,
      contract_type: record.contract_type,
      hire_date: record.hire_date ? new Date(record.hire_date) : undefined,
      last_leave_start: record.last_leave_start ? new Date(record.last_leave_start) : undefined,
      last_leave_end: record.last_leave_end ? new Date(record.last_leave_end) : undefined,
      current_leave_start: record.current_leave_start ? new Date(record.current_leave_start) : undefined,
      current_leave_end: record.current_leave_end ? new Date(record.current_leave_end) : undefined,
      expected_return_date: record.expected_return_date ? new Date(record.expected_return_date) : undefined,
      actual_return_date: record.actual_return_date ? new Date(record.actual_return_date) : undefined,
      entitled_days: record.entitled_days,
      used_days: record.used_days,
      travel_date: record.travel_date ? new Date(record.travel_date) : undefined,
      travel_destination: record.travel_destination || '',
      notes: record.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_name || !formData.employee_id || !formData.department || 
        !formData.job_title || !formData.hire_date) {
      toast({ title: t('error'), description: t('fillAllFields'), variant: 'destructive' });
      return;
    }
    saveMutation.mutate(formData);
  };

  // Get status badge
  const getStatusBadge = (status: EmployeeStatus) => {
    switch (status) {
      case 'at_work':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30"><CheckCircle2 className="w-3 h-3 me-1" />{t('atWork')}</Badge>;
      case 'on_leave':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30"><Plane className="w-3 h-3 me-1" />{t('onLeave')}</Badge>;
      case 'overdue_return':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 me-1" />{t('overdueReturn')}</Badge>;
      case 'upcoming_leave':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30"><Clock className="w-3 h-3 me-1" />{t('upcomingLeave')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Filter records
  const filteredRecords = records.filter(record => {
    const status = calculateStatus(record);
    const matchesSearch = 
      record.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    const matchesContract = contractFilter === 'all' || record.contract_type === contractFilter;
    const matchesDepartment = departmentFilter === 'all' || record.department === departmentFilter;
    return matchesSearch && matchesStatus && matchesContract && matchesDepartment;
  });

  // Calculate stats
  const stats = {
    total: records.length,
    onLeave: records.filter(r => calculateStatus(r) === 'on_leave').length,
    overdueReturn: records.filter(r => calculateStatus(r) === 'overdue_return').length,
    upcoming30: records.filter(r => {
      if (!r.next_leave_due) return false;
      const nextLeave = new Date(r.next_leave_due);
      const today = new Date();
      return differenceInDays(nextLeave, today) <= 30 && differenceInDays(nextLeave, today) >= 0;
    }).length,
    upcoming60: records.filter(r => {
      if (!r.next_leave_due) return false;
      const nextLeave = new Date(r.next_leave_due);
      const today = new Date();
      return differenceInDays(nextLeave, today) <= 60 && differenceInDays(nextLeave, today) >= 0;
    }).length,
    upcoming90: records.filter(r => {
      if (!r.next_leave_due) return false;
      const nextLeave = new Date(r.next_leave_due);
      const today = new Date();
      return differenceInDays(nextLeave, today) <= 90 && differenceInDays(nextLeave, today) >= 0;
    }).length,
  };

  // Get unique departments
  const departments = [...new Set(records.map(r => r.department))];

  // Export handlers
  const handleExportAll = async () => {
    if (records.length === 0) {
      toast({ title: t('error'), description: t('noData'), variant: 'destructive' });
      return;
    }
    await exportLeaveTrackingToExcel(records, language);
    toast({ title: t('success'), description: t('exportSuccess') });
  };

  const handleExportUpcoming = async () => {
    const upcomingRecords = records.filter(r => {
      if (!r.next_leave_due) return false;
      const nextLeave = new Date(r.next_leave_due);
      const today = new Date();
      return differenceInDays(nextLeave, today) <= 90 && differenceInDays(nextLeave, today) >= 0;
    });
    if (upcomingRecords.length === 0) {
      toast({ title: t('error'), description: t('noData'), variant: 'destructive' });
      return;
    }
    await exportUpcomingLeavesReport(upcomingRecords, language);
    toast({ title: t('success'), description: t('exportSuccess') });
  };

  const handleExportOverdue = async () => {
    const overdueRecords = records.filter(r => calculateStatus(r) === 'overdue_return');
    if (overdueRecords.length === 0) {
      toast({ title: t('error'), description: t('noData'), variant: 'destructive' });
      return;
    }
    await exportOverdueReturnsReport(overdueRecords, language);
    toast({ title: t('success'), description: t('exportSuccess') });
  };

  // Date picker component
  const DatePickerField = ({ 
    label, 
    value, 
    onChange, 
    required = false 
  }: { 
    label: string; 
    value: Date | undefined; 
    onChange: (date: Date | undefined) => void;
    required?: boolean;
  }) => (
    <div className="space-y-2">
      <Label>{label} {required && '*'}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}>
            <CalendarIcon className="me-2 h-4 w-4" />
            {value ? format(value, "PPP", { locale: isRTL ? ar : enUS }) : t('selectDate')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={onChange}
            initialFocus
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );

  return (
    <div className="min-h-screen pb-24 md:pb-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navigation />
      <PageTransition>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
           <Breadcrumbs />
          <PageHeader
            icon={CalendarIcon}
            title={t('leaveTracking')}
            subtitle={t('leaveTrackingSubtitle')}
            actions={
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <Download className="w-4 h-4 me-2" />
                    {t('exportExcel')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56" align="end">
                  <div className="space-y-2">
                    <Button variant="ghost" className="w-full justify-start" onClick={handleExportAll}>
                      {t('exportAllTracking')}
                    </Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={handleExportUpcoming}>
                      {t('exportUpcomingLeaves')}
                    </Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={handleExportOverdue}>
                      {t('exportOverdueReturns')}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 me-2" />
                    {t('addEmployee')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingRecord ? t('editEmployee') : t('addEmployee')}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Employee Information */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <User className="w-5 h-5" />
                          {t('employeeInformation')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>{t('employeeName')} *</Label>
                          <Input
                            value={formData.employee_name}
                            onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('employeeId')} *</Label>
                          <Input
                            value={formData.employee_id}
                            onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('jobTitle')} *</Label>
                          <Input
                            value={formData.job_title}
                            onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('department')} *</Label>
                          <Input
                            value={formData.department}
                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('contractType')} *</Label>
                          <Select value={formData.contract_type} onValueChange={(value: 'employee' | 'worker') => setFormData({ ...formData, contract_type: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="employee">{t('employeeContract')}</SelectItem>
                              <SelectItem value="worker">{t('workerContract')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <DatePickerField
                          label={t('hireDate')}
                          value={formData.hire_date}
                          onChange={(date) => setFormData({ ...formData, hire_date: date })}
                          required
                        />
                      </CardContent>
                    </Card>

                    {/* Leave Balance */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{t('leaveBalance')}</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>{t('entitledDays')}</Label>
                          <Input
                            type="number"
                            value={formData.entitled_days}
                            onChange={(e) => setFormData({ ...formData, entitled_days: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('usedDays')}</Label>
                          <Input
                            type="number"
                            value={formData.used_days}
                            onChange={(e) => setFormData({ ...formData, used_days: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('remainingBalance')}</Label>
                          <Input
                            type="number"
                            value={formData.entitled_days - formData.used_days}
                            readOnly
                            className="bg-muted"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Leave History */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{t('leaveHistory')}</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DatePickerField
                          label={t('lastLeaveStart')}
                          value={formData.last_leave_start}
                          onChange={(date) => setFormData({ ...formData, last_leave_start: date })}
                        />
                        <DatePickerField
                          label={t('lastLeaveEnd')}
                          value={formData.last_leave_end}
                          onChange={(date) => setFormData({ ...formData, last_leave_end: date })}
                        />
                      </CardContent>
                    </Card>

                    {/* Current Leave */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{t('currentLeave')}</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <DatePickerField
                          label={t('currentLeaveStart')}
                          value={formData.current_leave_start}
                          onChange={(date) => setFormData({ ...formData, current_leave_start: date })}
                        />
                        <DatePickerField
                          label={t('currentLeaveEnd')}
                          value={formData.current_leave_end}
                          onChange={(date) => setFormData({ ...formData, current_leave_end: date })}
                        />
                        <DatePickerField
                          label={t('expectedReturnDate')}
                          value={formData.expected_return_date}
                          onChange={(date) => setFormData({ ...formData, expected_return_date: date })}
                        />
                        <DatePickerField
                          label={t('actualReturnDate')}
                          value={formData.actual_return_date}
                          onChange={(date) => setFormData({ ...formData, actual_return_date: date })}
                        />
                        <DatePickerField
                          label={t('travelDate')}
                          value={formData.travel_date}
                          onChange={(date) => setFormData({ ...formData, travel_date: date })}
                        />
                        <div className="space-y-2">
                          <Label>{t('travelDestination')}</Label>
                          <Input
                            value={formData.travel_destination}
                            onChange={(e) => setFormData({ ...formData, travel_destination: e.target.value })}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Notes */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{t('notes')}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder={t('enterNotes')}
                          rows={3}
                        />
                      </CardContent>
                    </Card>

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                        {t('cancel')}
                      </Button>
                      <Button type="submit" disabled={saveMutation.isPending}>
                        {saveMutation.isPending ? t('saving') : (editingRecord ? t('update') : t('save'))}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('totalEmployees')}</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500/50" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('currentlyOnLeave')}</p>
                    <p className="text-2xl font-bold text-amber-600">{stats.onLeave}</p>
                  </div>
                  <Plane className="w-8 h-8 text-amber-500/50" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('overdueReturns')}</p>
                    <p className="text-2xl font-bold text-red-600">{stats.overdueReturn}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-500/50" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('upcoming30Days')}</p>
                    <p className="text-2xl font-bold text-green-600">{stats.upcoming30}</p>
                  </div>
                  <Clock className="w-8 h-8 text-green-500/50" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('upcoming60Days')}</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.upcoming60}</p>
                  </div>
                  <Clock className="w-8 h-8 text-purple-500/50" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('upcoming90Days')}</p>
                    <p className="text-2xl font-bold text-cyan-600">{stats.upcoming90}</p>
                  </div>
                  <Clock className="w-8 h-8 text-cyan-500/50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('searchEmployee')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="ps-10"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px]">
                      <Filter className="w-4 h-4 me-2" />
                      <SelectValue placeholder={t('status')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('allStatuses')}</SelectItem>
                      <SelectItem value="at_work">{t('atWork')}</SelectItem>
                      <SelectItem value="on_leave">{t('onLeave')}</SelectItem>
                      <SelectItem value="overdue_return">{t('overdueReturn')}</SelectItem>
                      <SelectItem value="upcoming_leave">{t('upcomingLeave')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={contractFilter} onValueChange={setContractFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder={t('contractType')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('allContracts')}</SelectItem>
                      <SelectItem value="employee">{t('employeeContract')}</SelectItem>
                      <SelectItem value="worker">{t('workerContract')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder={t('department')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('allDepartments')}</SelectItem>
                      {departments.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle>{t('employeeLeaveTracking')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">{t('loading')}</div>
              ) : filteredRecords.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground">{t('noEmployees')}</h3>
                  <p className="text-sm text-muted-foreground">{t('noEmployeesDescription')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('employeeName')}</TableHead>
                        <TableHead>{t('jobTitle')}</TableHead>
                        <TableHead>{t('contractType')}</TableHead>
                        <TableHead>{t('status')}</TableHead>
                        <TableHead>{t('lastLeave')}</TableHead>
                        <TableHead>{t('nextLeaveDue')}</TableHead>
                        <TableHead>{t('remainingBalance')}</TableHead>
                        <TableHead>{t('travelDate')}</TableHead>
                        <TableHead>{t('returnDate')}</TableHead>
                        <TableHead className="text-center">{t('actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.map((record) => {
                        const status = calculateStatus(record);
                        return (
                          <TableRow key={record.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{record.employee_name}</p>
                                <p className="text-sm text-muted-foreground">{record.employee_id}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p>{record.job_title}</p>
                                <p className="text-sm text-muted-foreground">{record.department}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {record.contract_type === 'employee' ? t('employeeContract') : t('workerContract')}
                              </Badge>
                            </TableCell>
                            <TableCell>{getStatusBadge(status)}</TableCell>
                            <TableCell>
                              {record.last_leave_end 
                                ? formatDate(record.last_leave_end)
                                : '-'}
                            </TableCell>
                            <TableCell>
                              {record.next_leave_due 
                                ? formatDate(record.next_leave_due)
                                : '-'}
                            </TableCell>
                            <TableCell>
                              <span className={cn(
                                "font-semibold",
                                record.remaining_balance < 5 ? "text-red-600" : "text-green-600"
                              )}>
                                {record.remaining_balance} {t('days')}
                              </span>
                            </TableCell>
                            <TableCell>
                              {record.travel_date 
                                ? formatDate(record.travel_date)
                                : '-'}
                            </TableCell>
                            <TableCell>
                              {record.expected_return_date 
                                ? formatDate(record.expected_return_date)
                                : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(record)}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => {
                                    if (confirm(t('confirmDeleteEmployee'))) {
                                      deleteMutation.mutate(record.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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

export default LeaveTracking;