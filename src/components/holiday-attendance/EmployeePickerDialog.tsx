import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus } from 'lucide-react';

interface MasterEmployee {
  id: string;
  employee_number: string;
  employee_name: string;
  job_title: string;
}

interface EmployeePickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (employees: { employee_number: string; employee_name: string; job_title: string }[]) => void;
  existingNumbers: string[];
}

export function EmployeePickerDialog({ open, onClose, onSelect, existingNumbers }: EmployeePickerDialogProps) {
  const { t } = useLanguage();
  const [masterList, setMasterList] = useState<MasterEmployee[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setSearch('');
    loadMasterEmployees();
  }, [open]);

  const loadMasterEmployees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('master_employees')
        .select('id, employee_number, employee_name, job_title')
        .eq('is_active', true)
        .order('employee_name');
      if (error) throw error;
      setMasterList(data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const filtered = masterList.filter(e =>
    !existingNumbers.includes(e.employee_number) &&
    (e.employee_name.includes(search) || e.employee_number.includes(search) || e.job_title.includes(search))
  );

  const toggleSelect = (num: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(num) ? next.delete(num) : next.add(num);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(e => e.employee_number)));
    }
  };

  const handleConfirm = () => {
    const chosen = masterList.filter(e => selected.has(e.employee_number));
    onSelect(chosen);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            {t('selectEmployees')}
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('searchEmployees')}
            className="ps-9"
          />
        </div>

        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-1">
            <Button variant="ghost" size="sm" onClick={selectAll}>
              {selected.size === filtered.length ? t('clearFilters') : t('selectAll')}
            </Button>
            <Badge variant="secondary">{filtered.length} {t('employeesData')}</Badge>
          </div>
        )}

        <ScrollArea className="h-[300px] border rounded-md">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">{t('loading')}</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">{t('noEmployees')}</div>
          ) : (
            <div className="divide-y">
              {filtered.map(emp => (
                <label
                  key={emp.id}
                  className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={selected.has(emp.employee_number)}
                    onCheckedChange={() => toggleSelect(emp.employee_number)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{emp.employee_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {emp.employee_number} • {emp.job_title}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {t('selected')}: {selected.size}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
            <Button onClick={handleConfirm} disabled={selected.size === 0} className="gap-2">
              <UserPlus className="w-4 h-4" />
              {t('addSelected')} ({selected.size})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
