import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Users, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { wmsToast } from '@/lib/wmsToast';
import { UnifiedFilterBar } from '@/components/ui/UnifiedFilterBar';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const JOB_TITLES = ['حارس', 'أمين مخزن', 'عامل', 'مشرف', 'سائق', 'فني', 'محاسب', 'إداري'];

interface MasterEmployee {
  id: string;
  employee_number: string;
  employee_name: string;
  job_title: string;
  department: string | null;
  phone: string | null;
  is_active: boolean;
}

export default function EmployeesManagement() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'ar';
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const [employees, setEmployees] = useState<MasterEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [jobFilter, setJobFilter] = useState<string>('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<MasterEmployee | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    employee_number: '', employee_name: '', job_title: JOB_TITLES[0],
    department: '', phone: '',
  });

  const loadEmployees = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('master_employees')
        .select('*')
        .order('employee_name');
      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      wmsToast.error(t('error'), { description: error.message });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  const openAddDialog = () => {
    setEditingEmployee(null);
    setForm({ employee_number: '', employee_name: '', job_title: JOB_TITLES[0], department: '', phone: '' });
    setShowDialog(true);
  };

  const openEditDialog = (emp: MasterEmployee) => {
    setEditingEmployee(emp);
    setForm({
      employee_number: emp.employee_number,
      employee_name: emp.employee_name,
      job_title: emp.job_title,
      department: emp.department || '',
      phone: emp.phone || '',
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.employee_number || !form.employee_name) {
      wmsToast.error(t('error'), { description: t('fillRequiredFields') });
      return;
    }
    try {
      const payload = {
        employee_number: form.employee_number,
        employee_name: form.employee_name,
        job_title: form.job_title,
        department: form.department || null,
        phone: form.phone || null,
      };

      if (editingEmployee) {
        const { error } = await supabase.from('master_employees').update(payload).eq('id', editingEmployee.id);
        if (error) throw error;
        wmsToast.success(t('success'), { description: t('employeeUpdated') });
      } else {
        const { error } = await supabase.from('master_employees').insert({ ...payload, created_by: user?.id });
        if (error) throw error;
        wmsToast.success(t('success'), { description: t('employeeAdded') });
      }
      setShowDialog(false);
      loadEmployees();
    } catch (error: any) {
      wmsToast.error(t('error'), { description: error.message });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from('master_employees').delete().eq('id', deleteId);
      if (error) throw error;
      setEmployees(prev => prev.filter(e => e.id !== deleteId));
      wmsToast.success(t('success'), { description: t('employeeDeleted') });
    } catch (error: any) {
      wmsToast.error(t('error'), { description: error.message });
    } finally {
      setDeleteId(null);
    }
  };

  const toggleActive = async (emp: MasterEmployee) => {
    try {
      const { error } = await supabase.from('master_employees')
        .update({ is_active: !emp.is_active })
        .eq('id', emp.id);
      if (error) throw error;
      setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, is_active: !e.is_active } : e));
    } catch (error: any) {
      wmsToast.error(t('error'), { description: error.message });
    }
  };

  const filtered = employees.filter(e => {
    const matchSearch = !search ||
      e.employee_name.includes(search) ||
      e.employee_number.includes(search) ||
      e.job_title.includes(search);
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && e.is_active) ||
      (statusFilter === 'inactive' && !e.is_active);
    const matchJob = jobFilter === 'all' || e.job_title === jobFilter;
    return matchSearch && matchStatus && matchJob;
  });

  const activeChips = [
    statusFilter !== 'all' && {
      key: 'status',
      label: `${t('status')}: ${statusFilter === 'active' ? t('active') : t('inactive')}`,
      onRemove: () => setStatusFilter('all'),
    },
    jobFilter !== 'all' && {
      key: 'job',
      label: `${t('jobTitle')}: ${jobFilter}`,
      onRemove: () => setJobFilter('all'),
    },
  ].filter(Boolean) as Array<{ key: string; label: string; onRemove: () => void }>;

  const activeCount = employees.filter(e => e.is_active).length;

  const breadcrumbs = [{ label: t('employeesManagement') }];

  return (
    <div className="min-h-screen pb-24 md:pb-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        <Breadcrumbs items={breadcrumbs} className="mb-4" />

        <PageHeader
          icon={Users}
          title={t('employeesManagement')}
          actions={isAdmin ? (
            <Button onClick={openAddDialog} className="gap-2">
              <UserPlus className="w-4 h-4" />{t('addEmployee')}
            </Button>
          ) : undefined}
        />

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl border border-border/40 bg-card p-4 text-center">
            <p className="text-2xl font-bold text-primary">{employees.length}</p>
            <p className="text-xs text-muted-foreground">{t('totalEmployees')}</p>
          </div>
          <div className="rounded-xl border border-border/40 bg-card p-4 text-center">
            <p className="text-2xl font-bold text-primary">{activeCount}</p>
            <p className="text-xs text-muted-foreground">{t('activeEmployees')}</p>
          </div>
          <div className="rounded-xl border border-border/40 bg-card p-4 text-center col-span-2 sm:col-span-1">
            <p className="text-2xl font-bold text-muted-foreground">{employees.length - activeCount}</p>
            <p className="text-xs text-muted-foreground">{t('inactiveEmployees')}</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-4">
              <UnifiedFilterBar
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder={t('searchEmployees')}
                filters={
                  <>
                    <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                      <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('allStatuses') || t('all')}</SelectItem>
                        <SelectItem value="active">{t('active')}</SelectItem>
                        <SelectItem value="inactive">{t('inactive')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={jobFilter} onValueChange={setJobFilter}>
                      <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder={t('jobTitle')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('all') || 'الكل'}</SelectItem>
                        {JOB_TITLES.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </>
                }
                activeChips={activeChips}
                onReset={() => { setSearch(''); setStatusFilter('all'); setJobFilter('all'); }}
              />
            </div>
            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted/50 animate-pulse rounded" />)}</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('employeeNumber')}</TableHead>
                      <TableHead>{t('employeeName')}</TableHead>
                      <TableHead>{t('jobTitle')}</TableHead>
                      <TableHead>{t('department')}</TableHead>
                      <TableHead>{t('phone')}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                      {isAdmin && <TableHead className="w-24">{t('actions')}</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          {t('noEmployees')}
                        </TableCell>
                      </TableRow>
                    ) : filtered.map(emp => (
                      <TableRow key={emp.id} className={!emp.is_active ? 'opacity-50' : ''}>
                        <TableCell className="font-mono">{emp.employee_number}</TableCell>
                        <TableCell className="font-medium">{emp.employee_name}</TableCell>
                        <TableCell>{emp.job_title}</TableCell>
                        <TableCell>{emp.department || '-'}</TableCell>
                        <TableCell dir="ltr">{emp.phone || '-'}</TableCell>
                        <TableCell>
                          <Badge
                            variant={emp.is_active ? 'default' : 'secondary'}
                            className="cursor-pointer"
                            onClick={() => isAdmin && toggleActive(emp)}
                          >
                            {emp.is_active ? t('active') : t('inactive')}
                          </Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditDialog(emp)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(emp.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEmployee ? t('editEmployee') : t('addEmployee')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('employeeNumber')} *</Label>
                <Input value={form.employee_number} onChange={e => setForm(f => ({ ...f, employee_number: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t('employeeName')} *</Label>
                <Input value={form.employee_name} onChange={e => setForm(f => ({ ...f, employee_name: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('jobTitle')}</Label>
                <Select value={form.job_title} onValueChange={v => setForm(f => ({ ...f, job_title: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {JOB_TITLES.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('department')}</Label>
                <Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('phone')}</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} dir="ltr" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>{t('cancel')}</Button>
            <Button onClick={handleSave}>{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteEmployee')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteEmployeeConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">{t('delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
