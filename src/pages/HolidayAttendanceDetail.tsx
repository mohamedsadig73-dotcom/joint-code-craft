import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Save, Plus, Trash2, Printer, Users, ClipboardList, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { HolidayPrintPreview } from '@/components/holiday-attendance/HolidayPrintPreview';
import { EmployeePickerDialog } from '@/components/holiday-attendance/EmployeePickerDialog';



interface SheetData {
  id?: string;
  warehouse_name: string;
  warehouse_number: string;
  holiday_name: string;
  period_start: string;
  period_end: string;
  month_year: string;
}

interface WorkRecord {
  id?: string;
  serial_number: number;
  work_type: string;
  work_date: string;
  employee_names: string;
  notes: string;
}

interface Employee {
  id?: string;
  employee_number: string;
  employee_name: string;
  job_title: string;
  total_days: number;
}

const DEFAULT_WORK_TYPES = ['دخول أغراض', 'خروج أغراض', 'صيانة'];
const JOB_TITLES = ['حارس', 'أمين مخزن', 'عامل', 'مشرف'];

export default function HolidayAttendanceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const isRTL = language === 'ar';
  const isNew = id === 'new';
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const [sheet, setSheet] = useState<SheetData>({
    warehouse_name: '', warehouse_number: '', holiday_name: '',
    period_start: '', period_end: '', month_year: '',
  });
  const [workRecords, setWorkRecords] = useState<WorkRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [showEmployeePicker, setShowEmployeePicker] = useState(false);
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);
  const [deleteEmployeeId, setDeleteEmployeeId] = useState<string | null>(null);
  const [workTypes, setWorkTypes] = useState<string[]>(DEFAULT_WORK_TYPES);
  const [newWorkType, setNewWorkType] = useState('');

  const loadData = useCallback(async () => {
    if (isNew) return;
    try {
      const [sheetRes, recordsRes, employeesRes] = await Promise.all([
        supabase.from('holiday_sheets').select('*').eq('id', id).single(),
        supabase.from('holiday_work_records').select('*').eq('sheet_id', id).order('serial_number'),
        supabase.from('holiday_employees').select('*').eq('sheet_id', id).order('employee_number'),
      ]);
      if (sheetRes.error) throw sheetRes.error;
      setSheet(sheetRes.data);
      setWorkRecords(recordsRes.data || []);
      setEmployees(employeesRes.data || []);
      // Merge custom work types from existing records
      const existingTypes = (recordsRes.data || []).map((r: any) => r.work_type).filter(Boolean);
      setWorkTypes(prev => [...new Set([...prev, ...existingTypes])]);
    } catch (error: any) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [id, isNew, t, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveSheet = async () => {
    if (!sheet.warehouse_name || !sheet.holiday_name || !sheet.period_start || !sheet.period_end) {
      toast({ title: t('error'), description: t('fillRequiredFields'), variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        const { data, error } = await supabase.from('holiday_sheets').insert({
          ...sheet, created_by: user?.id,
        }).select().single();
        if (error) throw error;
        toast({ title: t('success'), description: t('sheetCreated') });
        navigate(`/holiday-attendance/${data.id}`, { replace: true });
      } else {
        const { error } = await supabase.from('holiday_sheets')
          .update({ ...sheet, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
        toast({ title: t('success'), description: t('sheetUpdated') });
      }
    } catch (error: any) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const addWorkRecord = async () => {
    if (isNew) { toast({ title: t('error'), description: t('saveSheetFirst'), variant: 'destructive' }); return; }
    try {
      const nextSerial = workRecords.length > 0 ? Math.max(...workRecords.map(r => r.serial_number)) + 1 : 1;
      const { data, error } = await supabase.from('holiday_work_records').insert({
        sheet_id: id, serial_number: nextSerial, work_type: workTypes[0], work_date: '', employee_names: '', notes: '',
      }).select().single();
      if (error) throw error;
      setWorkRecords([...workRecords, data]);
    } catch (error: any) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    }
  };

  const updateWorkRecord = async (recordId: string, field: string, value: string) => {
    try {
      const { error } = await supabase.from('holiday_work_records').update({ [field]: value }).eq('id', recordId);
      if (error) throw error;
      setWorkRecords(prev => prev.map(r => r.id === recordId ? { ...r, [field]: value } : r));
    } catch (error: any) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    }
  };

  const deleteWorkRecord = async () => {
    if (!deleteRecordId) return;
    try {
      const { error } = await supabase.from('holiday_work_records').delete().eq('id', deleteRecordId);
      if (error) throw error;
      setWorkRecords(prev => prev.filter(r => r.id !== deleteRecordId));
    } catch (error: any) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    } finally {
      setDeleteRecordId(null);
    }
  };

  const addEmployeesFromPicker = async (pickedEmployees: { employee_number: string; employee_name: string; job_title: string }[]) => {
    if (isNew || pickedEmployees.length === 0) return;
    try {
      const inserts = pickedEmployees.map(e => ({
        sheet_id: id!, employee_number: e.employee_number, employee_name: e.employee_name,
        job_title: e.job_title, total_days: 0,
      }));
      const { data, error } = await supabase.from('holiday_employees').insert(inserts).select();
      if (error) throw error;
      setEmployees(prev => [...prev, ...(data || [])]);
      toast({ title: t('success'), description: `${pickedEmployees.length} ${t('employeesData')}` });
    } catch (error: any) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    }
  };

  const addEmployee = async () => {
    if (isNew) { toast({ title: t('error'), description: t('saveSheetFirst'), variant: 'destructive' }); return; }
    try {
      const { data, error } = await supabase.from('holiday_employees').insert({
        sheet_id: id, employee_number: '', employee_name: '', job_title: JOB_TITLES[0], total_days: 0,
      }).select().single();
      if (error) throw error;
      setEmployees([...employees, data]);
    } catch (error: any) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    }
  };

  const updateEmployee = async (empId: string, field: string, value: string | number) => {
    try {
      const { error } = await supabase.from('holiday_employees').update({ [field]: value }).eq('id', empId);
      if (error) throw error;
      setEmployees(prev => prev.map(e => e.id === empId ? { ...e, [field]: value } : e));
    } catch (error: any) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    }
  };

  const deleteEmployee = async () => {
    if (!deleteEmployeeId) return;
    try {
      const { error } = await supabase.from('holiday_employees').delete().eq('id', deleteEmployeeId);
      if (error) throw error;
      setEmployees(prev => prev.filter(e => e.id !== deleteEmployeeId));
    } catch (error: any) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    } finally {
      setDeleteEmployeeId(null);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-20 px-4 max-w-7xl mx-auto">
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 bg-muted/50 animate-pulse rounded-lg" />)}</div>
      </main>
    </div>
  );

  if (showPrint) {
    return <HolidayPrintPreview sheet={sheet} workRecords={workRecords} employees={employees} onClose={() => setShowPrint(false)} />;
  }

  const breadcrumbs = [
    { label: t('holidayAttendance'), href: '/holiday-attendance' },
    { label: isNew ? t('newSheet') : sheet.warehouse_name || t('sheetDetails') },
  ];

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navigation />
      <main className="pt-20 pb-24 md:pb-8 px-4 sm:px-6 max-w-7xl mx-auto">
        <Breadcrumbs items={breadcrumbs} className="mb-4" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold">{isNew ? t('newSheet') : t('sheetDetails')}</h1>
          {!isNew && (
            <Button onClick={() => setShowPrint(true)} variant="outline" className="gap-2">
              <Printer className="w-4 h-4" />
              {t('printPreview')}
            </Button>
          )}
        </div>

        <Tabs defaultValue="info" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info" className="gap-2"><Settings className="w-4 h-4" />{t('sheetInfo')}</TabsTrigger>
            <TabsTrigger value="records" className="gap-2" disabled={isNew}><ClipboardList className="w-4 h-4" />{t('workRecords')}</TabsTrigger>
            <TabsTrigger value="employees" className="gap-2" disabled={isNew}><Users className="w-4 h-4" />{t('employeesData')}</TabsTrigger>
          </TabsList>

          {/* Sheet Info Tab */}
          <TabsContent value="info">
            <Card>
              <CardHeader><CardTitle>{t('sheetInfo')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('warehouseName')} *</Label>
                    <Input value={sheet.warehouse_name} onChange={e => setSheet(s => ({...s, warehouse_name: e.target.value}))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('warehouseNumber')} *</Label>
                    <Input value={sheet.warehouse_number} onChange={e => setSheet(s => ({...s, warehouse_number: e.target.value}))} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>{t('holidayName')} *</Label>
                    <Input value={sheet.holiday_name} onChange={e => setSheet(s => ({...s, holiday_name: e.target.value}))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('periodStart')} *</Label>
                    <Input type="date" value={sheet.period_start} onChange={e => setSheet(s => ({...s, period_start: e.target.value}))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('periodEnd')} *</Label>
                    <Input type="date" value={sheet.period_end} onChange={e => setSheet(s => ({...s, period_end: e.target.value}))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('monthYear')}</Label>
                    <Input value={sheet.month_year} onChange={e => setSheet(s => ({...s, month_year: e.target.value}))} placeholder={t('monthYearPlaceholder')} />
                  </div>
                </div>

                {/* Work Types Management */}
                {isAdmin && (
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-base font-semibold">{t('workTypes')}</Label>
                    <div className="flex flex-wrap gap-2">
                      {workTypes.map(wt => (
                        <div key={wt} className="flex items-center gap-1 bg-muted rounded-full px-3 py-1 text-sm">
                          <span>{wt}</span>
                          {!DEFAULT_WORK_TYPES.includes(wt) && (
                            <button
                              onClick={() => setWorkTypes(prev => prev.filter(t2 => t2 !== wt))}
                              className="text-destructive hover:text-destructive/80 ms-1"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newWorkType}
                        onChange={e => setNewWorkType(e.target.value)}
                        placeholder={t('addWorkType')}
                        className="max-w-xs"
                        onKeyDown={e => {
                          if (e.key === 'Enter' && newWorkType.trim()) {
                            if (!workTypes.includes(newWorkType.trim())) {
                              setWorkTypes(prev => [...prev, newWorkType.trim()]);
                            }
                            setNewWorkType('');
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (newWorkType.trim() && !workTypes.includes(newWorkType.trim())) {
                            setWorkTypes(prev => [...prev, newWorkType.trim()]);
                          }
                          setNewWorkType('');
                        }}
                        disabled={!newWorkType.trim()}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {isAdmin && (
                  <Button onClick={handleSaveSheet} disabled={saving} className="gap-2">
                    <Save className="w-4 h-4" />
                    {saving ? t('saving') : t('save')}
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Work Records Tab */}
          <TabsContent value="records">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('workRecords')}</CardTitle>
                {isAdmin && (
                  <Button onClick={addWorkRecord} size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />{t('addRecord')}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">{t('serial')}</TableHead>
                        <TableHead>{t('workType')}</TableHead>
                        <TableHead>{t('workDescription')}</TableHead>
                        <TableHead>{t('workDate')}</TableHead>
                        <TableHead>{t('presentEmployees')}</TableHead>
                        {isAdmin && <TableHead className="w-16">{t('actions')}</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workRecords.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{t('noRecords')}</TableCell></TableRow>
                      ) : workRecords.map(record => (
                        <TableRow key={record.id}>
                          <TableCell className="font-mono">{record.serial_number}</TableCell>
                          <TableCell>
                            {isAdmin ? (
                              <Select value={record.work_type} onValueChange={v => updateWorkRecord(record.id!, 'work_type', v)}>
                                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {workTypes.map(wt => <SelectItem key={wt} value={wt}>{wt}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            ) : record.work_type}
                          </TableCell>
                          <TableCell>
                            {isAdmin ? (
                              <Input value={record.work_date} onChange={e => updateWorkRecord(record.id!, 'work_date', e.target.value)}
                                placeholder="17-23/03/2026" className="w-40" />
                            ) : record.work_date}
                          </TableCell>
                          <TableCell>
                            {isAdmin ? (
                              <Textarea value={record.employee_names} onChange={e => updateWorkRecord(record.id!, 'employee_names', e.target.value)}
                                placeholder={t('enterEmployeeNames')} className="min-w-[200px] min-h-[60px]" />
                            ) : <span className="whitespace-pre-wrap">{record.employee_names}</span>}
                          </TableCell>
                          {isAdmin && (
                            <TableCell>
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteRecordId(record.id!)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('employeesData')}</CardTitle>
                {isAdmin && (
                  <div className="flex gap-2">
                    <Button onClick={() => setShowEmployeePicker(true)} size="sm" className="gap-2">
                      <Users className="w-4 h-4" />{t('selectEmployees')}
                    </Button>
                    <Button onClick={addEmployee} size="sm" variant="outline" className="gap-2">
                      <Plus className="w-4 h-4" />{t('addManually')}
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('employeeNumber')}</TableHead>
                        <TableHead>{t('employeeName')}</TableHead>
                        <TableHead>{t('jobTitle')}</TableHead>
                        <TableHead>{t('totalWorkDays')}</TableHead>
                        {isAdmin && <TableHead className="w-16">{t('actions')}</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{t('noEmployees')}</TableCell></TableRow>
                      ) : employees.map(emp => (
                        <TableRow key={emp.id}>
                          <TableCell>
                            {isAdmin ? (
                              <Input value={emp.employee_number} onChange={e => updateEmployee(emp.id!, 'employee_number', e.target.value)} className="w-24" />
                            ) : emp.employee_number}
                          </TableCell>
                          <TableCell>
                            {isAdmin ? (
                              <Input value={emp.employee_name} onChange={e => updateEmployee(emp.id!, 'employee_name', e.target.value)} className="w-40" />
                            ) : emp.employee_name}
                          </TableCell>
                          <TableCell>
                            {isAdmin ? (
                              <Select value={emp.job_title} onValueChange={v => updateEmployee(emp.id!, 'job_title', v)}>
                                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {JOB_TITLES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            ) : emp.job_title}
                          </TableCell>
                          <TableCell>
                            {isAdmin ? (
                              <Input type="number" min={0} value={emp.total_days} onChange={e => updateEmployee(emp.id!, 'total_days', parseInt(e.target.value) || 0)} className="w-20" />
                            ) : emp.total_days}
                          </TableCell>
                          {isAdmin && (
                            <TableCell>
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteEmployeeId(emp.id!)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                      {employees.length > 0 && (
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell colSpan={3} className="text-end">{t('total')}</TableCell>
                          <TableCell>{employees.reduce((sum, e) => sum + (e.total_days || 0), 0)}</TableCell>
                          {isAdmin && <TableCell />}
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <AlertDialog open={!!deleteRecordId} onOpenChange={() => setDeleteRecordId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t('deleteRecord')}</AlertDialogTitle><AlertDialogDescription>{t('deleteRecordConfirm')}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{t('cancel')}</AlertDialogCancel><AlertDialogAction onClick={deleteWorkRecord} className="bg-destructive text-destructive-foreground">{t('delete')}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!deleteEmployeeId} onOpenChange={() => setDeleteEmployeeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t('deleteEmployee')}</AlertDialogTitle><AlertDialogDescription>{t('deleteEmployeeConfirm')}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{t('cancel')}</AlertDialogCancel><AlertDialogAction onClick={deleteEmployee} className="bg-destructive text-destructive-foreground">{t('delete')}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <EmployeePickerDialog
        open={showEmployeePicker}
        onClose={() => setShowEmployeePicker(false)}
        onSelect={addEmployeesFromPicker}
        existingNumbers={employees.map(e => e.employee_number)}
      />
    </div>
  );
}
