import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Database, Loader2, RefreshCw, Search, ShieldAlert, Trash2, Merge, FileDown,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBoxReceipts, type BoxReceipt } from '@/hooks/useBoxReceipts';
import { findDuplicateGroups, countMergedRecords } from '@/utils/boxDuplicateAnalysis';
import { downloadBoxesTotalsPdf } from '@/utils/boxesTotalsPdf';
import { destinationBadgeClass, statusBadgeClass } from '@/components/boxes/destinationStyles';
import { BOX_DESTINATIONS } from '@/utils/boxNumberValidation';
import { MergeReceiptsDialog } from '@/components/boxes/MergeReceiptsDialog';
import { useToast } from '@/hooks/use-toast';

export default function BoxesDataAdmin() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { receipts, loading, refetch, deleteReceipt } = useBoxReceipts();

  const [search, setSearch] = useState('');
  const [destFilter, setDestFilter] = useState('all');
  const [boxFilter, setBoxFilter] = useState('all');
  const [showDeleted, setShowDeleted] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mergeOpen, setMergeOpen] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  const groups = useMemo(() => findDuplicateGroups(receipts), [receipts]);
  const mergedCount = useMemo(() => countMergedRecords(receipts), [receipts]);

  const allBoxes = useMemo(() => {
    const set = new Set<string>();
    for (const r of receipts) if (r.box_no) set.add(r.box_no);
    return Array.from(set).sort();
  }, [receipts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return receipts.filter((r) => {
      if (!showDeleted && r.deleted_at) return false;
      if (destFilter !== 'all' && r.destination !== destFilter) return false;
      if (boxFilter !== 'all' && r.box_no !== boxFilter) return false;
      if (!q) return true;
      return (
        String(r.serial_no).includes(q) ||
        r.part_no.toLowerCase().includes(q) ||
        r.supplier.toLowerCase().includes(q) ||
        (r.box_no?.toLowerCase().includes(q) ?? false) ||
        r.description.toLowerCase().includes(q)
      );
    });
  }, [receipts, search, destFilter, boxFilter, showDeleted]);

  const selectedReceipts = useMemo(
    () => receipts.filter((r) => selected.has(r.id)),
    [receipts, selected]
  );

  if (!isAdmin && !isManager) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="p-8 text-center">
            <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">{t('accessDenied') || 'Access Denied'}</h2>
          </Card>
        </main>
      </div>
    );
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMergeGroup = (ids: string[]) => {
    setSelected(new Set(ids));
    setMergeOpen(true);
  };

  const handleDelete = async (r: BoxReceipt) => {
    if (r.deleted_at) return;
    await deleteReceipt(r.id);
  };

  const handlePdf = async () => {
    setPdfBusy(true);
    try {
      await downloadBoxesTotalsPdf(receipts, language);
      toast({ title: t('success'), description: t('downloadPdfReport') });
    } catch (e) {
      toast({ title: t('error'), description: (e as Error).message, variant: 'destructive' });
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        <PageHeader title={t('receiptsDataAdmin')} subtitle={t('receiptsDataAdminDesc')} icon={Database} />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <Card className="p-3 text-center">
            <div className="text-xs text-muted-foreground">{t('totalItems')}</div>
            <div className="text-xl font-bold tabular-nums">
              {receipts.filter((r) => !r.deleted_at).length.toLocaleString('en-US')}
            </div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-xs text-muted-foreground">{t('duplicates')}</div>
            <div className={`text-xl font-bold tabular-nums ${groups.length > 0 ? 'text-warning' : 'text-success'}`}>
              {groups.length.toLocaleString('en-US')}
            </div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-xs text-muted-foreground">{t('mergedRecordsCount').replace(' on file', '').replace('{count}', '').trim() || 'Merged'}</div>
            <div className="text-xl font-bold tabular-nums">{mergedCount.toLocaleString('en-US')}</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-xs text-muted-foreground">{t('deletedSoft')}</div>
            <div className="text-xl font-bold tabular-nums">
              {receipts.filter((r) => r.deleted_at).length.toLocaleString('en-US')}
            </div>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`${t('serial')} / ${t('partNo')} / ${t('boxNo')}`}
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
          <Select value={boxFilter} onValueChange={setBoxFilter}>
            <SelectTrigger className="w-full md:w-40"><SelectValue placeholder={t('boxNo')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all')}</SelectItem>
              {allBoxes.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setShowDeleted((v) => !v)}>
            <Checkbox checked={showDeleted} className="me-2 pointer-events-none" />
            {t('showDeleted')}
          </Button>
          <Button variant="outline" onClick={refetch} disabled={loading}>
            <RefreshCw className={`w-4 h-4 me-1.5 ${loading ? 'animate-spin' : ''}`} />
            {t('refreshChecks')}
          </Button>
          <Button onClick={handlePdf} disabled={pdfBusy}>
            {pdfBusy ? <Loader2 className="w-4 h-4 me-1.5 animate-spin" /> : <FileDown className="w-4 h-4 me-1.5" />}
            {t('downloadPdfReport')}
          </Button>
        </div>

        {/* Duplicate groups summary */}
        {groups.length > 0 && (
          <Card className="p-4 mt-4 border-warning/40 bg-warning/5">
            <div className="font-semibold text-sm mb-2">
              {t('duplicatesFound').replace('{count}', String(groups.length))}
            </div>
            <div className="space-y-2">
              {groups.slice(0, 8).map((g) => (
                <div key={g.key} className="flex items-center justify-between gap-2 p-2 rounded border border-border bg-card">
                  <div className="text-xs min-w-0 flex-1">
                    <span className="font-mono font-bold">{g.part_no}</span> · {g.box_no ?? '—'} ·{' '}
                    <Badge className={destinationBadgeClass(g.destination)}>{t(`dest_${g.destination}`)}</Badge>
                    <span className="text-muted-foreground ms-2">
                      ({g.receipts.length} × {t('qty')} {g.totalQty.toLocaleString('en-US')})
                    </span>
                  </div>
                  <Button size="sm" onClick={() => handleMergeGroup(g.receipts.map((r) => r.id))}>
                    <Merge className="w-3.5 h-3.5 me-1" />
                    {t('mergeIntoOne')}
                  </Button>
                </div>
              ))}
              {groups.length > 8 && (
                <div className="text-xs text-muted-foreground">+{groups.length - 8}…</div>
              )}
            </div>
          </Card>
        )}

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="mt-4 flex items-center justify-between p-3 rounded-md bg-muted">
            <div className="text-sm">
              {selected.size} {t('rowsImported').replace('imported', 'selected')}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>
                {t('cancel')}
              </Button>
              <Button size="sm" onClick={() => setMergeOpen(true)} disabled={selected.size < 2}>
                <Merge className="w-3.5 h-3.5 me-1" />
                {t('mergeSelected')}
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        <Card className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>{t('serial')}</TableHead>
                <TableHead>{t('partNo')}</TableHead>
                <TableHead>{t('supplier')}</TableHead>
                <TableHead>{t('boxNo')}</TableHead>
                <TableHead>{t('destination')}</TableHead>
                <TableHead className="text-end">{t('qty')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead className="text-end"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin inline me-2" />
                    {t('loading')}
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {t('noReceiptsYet')}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id} className={r.deleted_at ? 'opacity-50' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(r.id)}
                        onCheckedChange={() => toggle(r.id)}
                        disabled={!!r.deleted_at}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">#{r.serial_no}</TableCell>
                    <TableCell className="font-mono text-xs">{r.part_no}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{r.supplier}</TableCell>
                    <TableCell>{r.box_no ?? '—'}</TableCell>
                    <TableCell>
                      <Badge className={destinationBadgeClass(r.destination)}>
                        {t(`dest_${r.destination}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end tabular-nums">{r.qty.toLocaleString('en-US')}</TableCell>
                    <TableCell>
                      {r.deleted_at ? (
                        <Badge variant="outline" className="text-xs">{t('deletedSoft')}</Badge>
                      ) : (
                        <Badge className={statusBadgeClass(r.status)}>{t(`boxStatus_${r.status}`)}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-end">
                      {!r.deleted_at && isAdmin && (
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(r)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </main>

      <MergeReceiptsDialog
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        receipts={selectedReceipts}
        onMerged={() => setSelected(new Set())}
      />
    </div>
  );
}