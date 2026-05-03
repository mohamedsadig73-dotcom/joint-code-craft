import { ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Trash2, Plus, Search } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export interface FieldDef {
  key: string;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'date' | 'number' | 'textarea';
  required?: boolean;
  placeholder?: string;
}

interface Props<T extends { id: string; is_active?: boolean }> {
  rows: T[];
  loading: boolean;
  fields: FieldDef[];
  columns: { key: string; label: string }[];
  onCreate: (payload: Partial<T>) => Promise<boolean>;
  onUpdate: (id: string, payload: Partial<T>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  searchKeys?: string[];
  emptyText?: string;
  extraRowContent?: (row: T) => ReactNode;
  hideActiveToggle?: boolean;
}

export function SimpleCrudTable<T extends { id: string; is_active?: boolean }>({
  rows, loading, fields, columns, onCreate, onUpdate, onDelete, searchKeys = [], emptyText, hideActiveToggle,
}: Props<T>) {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return searchKeys.some((k) => String((r as any)[k] ?? '').toLowerCase().includes(q));
  });

  const openNew = () => {
    setEditing(null);
    const init: Record<string, any> = { is_active: true };
    fields.forEach((f) => (init[f.key] = ''));
    setForm(init);
    setOpen(true);
  };

  const openEdit = (row: T) => {
    setEditing(row);
    const init: Record<string, any> = { is_active: (row as any).is_active ?? true };
    fields.forEach((f) => (init[f.key] = (row as any)[f.key] ?? ''));
    setOpen(true);
    setForm(init);
  };

  const submit = async () => {
    const payload: any = {};
    for (const f of fields) {
      const v = form[f.key];
      if (f.required && (!v || String(v).trim() === '')) {
        return;
      }
      payload[f.key] = v === '' ? null : v;
    }
    if (!hideActiveToggle) payload.is_active = !!form.is_active;
    const ok = editing ? await onUpdate(editing.id, payload) : await onCreate(payload);
    if (ok) setOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className={`absolute top-2.5 ${isRTL ? 'right-2' : 'left-2'} h-4 w-4 text-muted-foreground`} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search')}
            className={isRTL ? 'pr-8' : 'pl-8'}
          />
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 me-1" />
          {t('add')}
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => <TableHead key={c.key}>{c.label}</TableHead>)}
              {!hideActiveToggle && <TableHead>{t('status')}</TableHead>}
              <TableHead className="w-[120px]">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={columns.length + 2} className="text-center text-muted-foreground py-6">…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={columns.length + 2} className="text-center text-muted-foreground py-6">{emptyText ?? t('noData')}</TableCell></TableRow>
            ) : filtered.map((row) => (
              <TableRow key={row.id}>
                {columns.map((c) => <TableCell key={c.key}>{String((row as any)[c.key] ?? '—')}</TableCell>)}
                {!hideActiveToggle && (
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded ${(row as any).is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}>
                      {(row as any).is_active ? t('active') : t('inactive')}
                    </span>
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(row)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => onDelete(row.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t('edit') : t('add')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 max-h-[60vh] overflow-y-auto">
            {fields.map((f) => (
              <div key={f.key} className="grid gap-1">
                <Label>{f.label}{f.required && <span className="text-destructive"> *</span>}</Label>
                {f.type === 'textarea' ? (
                  <textarea
                    className="rounded-md border bg-background px-3 py-2 text-sm min-h-[70px]"
                    value={form[f.key] ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                  />
                ) : (
                  <Input
                    type={f.type ?? 'text'}
                    value={form[f.key] ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                  />
                )}
              </div>
            ))}
            {!hideActiveToggle && (
              <div className="flex items-center gap-2">
                <Switch checked={!!form.is_active} onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))} />
                <Label>{t('active')}</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('cancel')}</Button>
            <Button onClick={submit}>{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}