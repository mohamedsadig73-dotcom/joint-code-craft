import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Search, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  useReferenceTable,
  type ReferenceTableName,
  type ReferenceRow,
} from '@/hooks/useReferenceTable';
import { ReferenceFormDialog, type ExtraField } from './ReferenceFormDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  table: ReferenceTableName;
  titleKey: string;
  addLabelKey: string;
  editLabelKey: string;
  extraFields?: ExtraField[];
  /** Optional list of extra columns to render in the table */
  extraColumns?: { name: string; labelKey: string }[];
}

export function ReferenceCrudTab({
  table,
  titleKey,
  addLabelKey,
  editLabelKey,
  extraFields = [],
  extraColumns = [],
}: Props) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { rows, loading, create, update, remove } = useReferenceTable(table);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ReferenceRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const canManage = user?.role === 'admin' || user?.role === 'manager';
  const canDelete = user?.role === 'admin';

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.name_ar.toLowerCase().includes(q) ||
        (r.name_en ?? '').toLowerCase().includes(q),
    );
  }, [rows, search]);

  const handleSubmit = async (payload: Partial<ReferenceRow>) => {
    if (editing) return update(editing.id, payload);
    return create(payload);
  };

  return (
    <Card className="p-4">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search')}
            className="ps-10"
          />
        </div>
        {canManage && (
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 me-1.5" />
            {t(addLabelKey)}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin me-2" />
          {t('loading')}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">{t('noRecordsInv')}</div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('codeInv')}</TableHead>
                <TableHead>{t('nameArInv')}</TableHead>
                <TableHead>{t('nameEnInv')}</TableHead>
                {extraColumns.map((c) => (
                  <TableHead key={c.name}>{t(c.labelKey)}</TableHead>
                ))}
                <TableHead>{t('activeStatus')}</TableHead>
                <TableHead className="text-end">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono font-medium">{r.code}</TableCell>
                  <TableCell>{r.name_ar}</TableCell>
                  <TableCell dir="ltr" className="text-start">
                    {r.name_en ?? '—'}
                  </TableCell>
                  {extraColumns.map((c) => (
                    <TableCell key={c.name}>{(r[c.name] as string) ?? '—'}</TableCell>
                  ))}
                  <TableCell>
                    {r.is_active ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20">
                        {t('active')}
                      </Badge>
                    ) : (
                      <Badge variant="outline">{t('inactive')}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex justify-end gap-1">
                      {canManage && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditing(r);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(r.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ReferenceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={t(editing ? editLabelKey : addLabelKey)}
        initial={editing}
        extraFields={extraFields}
        onSubmit={handleSubmit}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('confirmDeleteRecord')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (deleteId) await remove(deleteId);
                setDeleteId(null);
              }}
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Suppress unused-var warnings for prop titleKey when caller passes label-only context */}
      <span className="hidden">{titleKey}</span>
    </Card>
  );
}