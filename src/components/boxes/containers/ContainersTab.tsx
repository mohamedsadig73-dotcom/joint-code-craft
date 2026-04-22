import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Plus, Search, Ship, Pencil, Trash2, Eye, Package, PackageOpen } from 'lucide-react';
import { useContainers, type ShippingContainer } from '@/hooks/useContainers';
import { ContainerFormDialog } from './ContainerFormDialog';
import { destinationBadgeClass } from '../destinationStyles';
import { BOX_DESTINATIONS } from '@/utils/boxNumberValidation';
import { cn } from '@/lib/utils';

const CONTAINER_STATUSES: ShippingContainer['status'][] = ['preparing', 'sealed', 'shipped', 'delivered'];

function statusBadgeClass(status: ShippingContainer['status']) {
  switch (status) {
    case 'preparing':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
    case 'sealed':
      return 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300';
    case 'shipped':
      return 'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300';
    case 'delivered':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
    default:
      return '';
  }
}

function formatDate(d: string | null) {
  if (!d) return '—';
  const date = new Date(d);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

export function ContainersTab() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { containers, summary, loading, createContainer, updateContainer, deleteContainer } = useContainers();

  const [search, setSearch] = useState('');
  const [destFilter, setDestFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editing, setEditing] = useState<ShippingContainer | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState<ShippingContainer | null>(null);

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const canManage = isAdmin || isManager;

  const summaryByContainer = useMemo(() => {
    const map = new Map<string, (typeof summary)[number]>();
    for (const s of summary) {
      if (s.container_id) map.set(s.container_id, s);
    }
    return map;
  }, [summary]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return containers.filter((c) => {
      if (destFilter !== 'all' && c.destination !== destFilter) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.container_no.toLowerCase().includes(q) ||
        c.shipping_company.toLowerCase().includes(q)
      );
    });
  }, [containers, search, destFilter, statusFilter]);

  const handleAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const handleEdit = (c: ShippingContainer) => {
    setEditing(c);
    setFormOpen(true);
  };
  const handleSubmit = (values: Parameters<typeof createContainer>[0]) =>
    editing ? updateContainer(editing.id, values) : createContainer(values);
  const handleDeleteConfirm = async () => {
    if (!toDelete) return;
    await deleteContainer(toDelete.id);
    setToDelete(null);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('containerNo') + ' / ' + t('shippingCompany')}
            className="ps-10"
          />
        </div>
        <Select value={destFilter} onValueChange={setDestFilter}>
          <SelectTrigger className="w-full md:w-44"><SelectValue placeholder={t('destination')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all')}</SelectItem>
            {BOX_DESTINATIONS.map((d) => <SelectItem key={d} value={d}>{t(`dest_${d}`)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-44"><SelectValue placeholder={t('status')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all')}</SelectItem>
            {CONTAINER_STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`containerStatus_${s}`)}</SelectItem>)}
          </SelectContent>
        </Select>
        {canManage && (
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 me-1.5" />
            {t('newContainer')}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin me-2" />
          {t('loading')}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Ship className="w-12 h-12 mx-auto opacity-30 mb-2" />
          <p className="text-sm text-muted-foreground">{t('noContainersYet')}</p>
          {canManage && (
            <Button onClick={handleAdd} className="mt-4" size="sm">
              <Plus className="w-4 h-4 me-1.5" />
              {t('newContainer')}
            </Button>
          )}
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>{t('containerNo')}</TableHead>
                    <TableHead>{t('shippingCompany')}</TableHead>
                    <TableHead>{t('destination')}</TableHead>
                    <TableHead className="text-center">
                      <div className="inline-flex items-center gap-1">
                        <Package className="w-3.5 h-3.5" />
                        {t('boxesCount')}
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="inline-flex items-center gap-1">
                        <PackageOpen className="w-3.5 h-3.5" />
                        {t('looseCount')}
                      </div>
                    </TableHead>
                    <TableHead className="text-center">{t('totalQty')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('shippedDate')}</TableHead>
                    <TableHead className="w-32 text-center">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c, idx) => {
                    const s = summaryByContainer.get(c.id);
                    const locked = c.status === 'sealed' || c.status === 'shipped' || c.status === 'delivered';
                    return (
                      <TableRow key={c.id} className="hover:bg-muted/40">
                        <TableCell className="text-center text-muted-foreground text-xs">{idx + 1}</TableCell>
                        <TableCell className="font-mono font-bold text-sm">{c.container_no}</TableCell>
                        <TableCell className="text-sm">{c.shipping_company}</TableCell>
                        <TableCell>
                          <Badge className={destinationBadgeClass(c.destination)}>
                            {t(`dest_${c.destination}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-bold tabular-nums">
                          {(s?.boxes_count ?? 0).toLocaleString('en-US')}
                        </TableCell>
                        <TableCell className="text-center font-bold tabular-nums">
                          {(s?.loose_count ?? 0).toLocaleString('en-US')}
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          {(s?.total_qty ?? 0).toLocaleString('en-US')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusBadgeClass(c.status)}>
                            {t(`containerStatus_${c.status}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground tabular-nums">
                          {formatDate(c.shipped_date)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-1">
                            <Button asChild size="icon" variant="ghost" className="h-7 w-7">
                              <Link to={`/boxes/container/${c.id}`}>
                                <Eye className="w-3.5 h-3.5" />
                              </Link>
                            </Button>
                            {canManage && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => handleEdit(c)}
                                  disabled={locked}
                                  title={locked ? t('containerLocked') : t('edit')}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                {isAdmin && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-destructive"
                                    onClick={() => setToDelete(c)}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((c) => {
              const s = summaryByContainer.get(c.id);
              return (
                <Card key={c.id} className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-sm">{c.container_no}</div>
                      <div className="text-xs text-muted-foreground truncate">{c.shipping_company}</div>
                    </div>
                    <Badge variant="outline" className={cn('text-[10px]', statusBadgeClass(c.status))}>
                      {t(`containerStatus_${c.status}`)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">{t('boxesCount')}: </span>
                      <span className="font-bold">{(s?.boxes_count ?? 0).toLocaleString('en-US')}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('looseCount')}: </span>
                      <span className="font-bold">{(s?.loose_count ?? 0).toLocaleString('en-US')}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('totalQty')}: </span>
                      <span className="font-bold">{(s?.total_qty ?? 0).toLocaleString('en-US')}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <Badge className={destinationBadgeClass(c.destination)}>{t(`dest_${c.destination}`)}</Badge>
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/boxes/container/${c.id}`}>
                        <Eye className="w-3.5 h-3.5 me-1.5" />
                        {t('containerDetails')}
                      </Link>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <ContainerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSubmit={handleSubmit}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteContainer')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteContainerConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}