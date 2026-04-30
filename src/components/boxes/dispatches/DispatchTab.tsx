import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBoxDispatches } from '@/hooks/useBoxDispatches';
import { useBoxReceipts } from '@/hooks/useBoxReceipts';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tabs, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  Plus, Search, Loader2, Send, CheckCircle2, XCircle, Eye, FileText, Trash2,
} from 'lucide-react';
import { CreateDispatchDialog } from './CreateDispatchDialog';
import { destinationBadgeClass } from '../destinationStyles';

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelled: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
};

export function DispatchTab() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { dispatches, items, loading, approveDispatch, cancelDispatch, deleteDispatch } = useBoxDispatches();
  const { receipts } = useBoxReceipts();

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const canManage = isAdmin || isManager;

  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'approved' | 'cancelled'>('all');
  const [viewing, setViewing] = useState<string | null>(null);
  const [confirmApprove, setConfirmApprove] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const receiptMap = useMemo(() => new Map(receipts.map((r) => [r.id, r])), [receipts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return dispatches.filter((d) => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (!q) return true;
      return (
        d.dispatch_no.toLowerCase().includes(q) ||
        d.department_name.toLowerCase().includes(q) ||
        d.signer_name.toLowerCase().includes(q) ||
        (d.shipping_company?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [dispatches, search, statusFilter]);

  const counts = useMemo(() => {
    const c = { draft: 0, approved: 0, cancelled: 0 };
    for (const d of dispatches) c[d.status as keyof typeof c]++;
    return c;
  }, [dispatches]);

  const viewedDispatch = viewing ? dispatches.find((d) => d.id === viewing) : null;
  const viewedItems = viewing ? items.filter((i) => i.dispatch_id === viewing) : [];

  const handleApprove = async () => {
    if (!confirmApprove) return;
    setBusy(true);
    try {
      await approveDispatch(confirmApprove);
      setConfirmApprove(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchDispatches')}
            className="ps-10"
          />
        </div>
        {canManage && (
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="w-4 h-4" />
            {t('newDispatch')}
          </Button>
        )}
      </div>

      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="all">{t('all')} ({dispatches.length})</TabsTrigger>
          <TabsTrigger value="draft">{t('draft')} ({counts.draft})</TabsTrigger>
          <TabsTrigger value="approved">{t('approved')} ({counts.approved})</TabsTrigger>
          <TabsTrigger value="cancelled">{t('cancelled')} ({counts.cancelled})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          <Send className="w-12 h-12 mx-auto opacity-30 mb-2" />
          {t('noDispatches')}
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((d) => {
            const lineCount = items.filter((i) => i.dispatch_id === d.id).length;
            return (
              <Card key={d.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Send className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold text-sm">{d.dispatch_no}</span>
                      <Badge className={STATUS_BADGE[d.status]}>{t(d.status)}</Badge>
                      <Badge className={destinationBadgeClass(d.destination)}>{t(`dest_${d.destination}`)}</Badge>
                      <Badge variant="outline" className="text-[10px]">{lineCount} {t('items')}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      <span className="font-medium text-foreground">{d.department_name}</span>
                      {' · '}{t('signer')}: {d.signer_name}
                      {d.shipping_company && <> · {t('shippingCompany')}: {d.shipping_company}</>}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(d.dispatch_date).toLocaleDateString('en-GB')}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => setViewing(d.id)} title={t('view')}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    {canManage && d.status === 'draft' && (
                      <>
                        <Button size="icon" variant="ghost" onClick={() => setConfirmApprove(d.id)} title={t('approve')} className="text-emerald-600 hover:text-emerald-700">
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => cancelDispatch(d.id)} title={t('cancel')} className="text-rose-600 hover:text-rose-700">
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    {isAdmin && (
                      <Button size="icon" variant="ghost" onClick={() => deleteDispatch(d.id)} title={t('delete')} className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <CreateDispatchDialog open={createOpen} onOpenChange={setCreateOpen} />

      {/* Approve confirm */}
      <AlertDialog open={!!confirmApprove} onOpenChange={(o) => !o && setConfirmApprove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('approveDispatch')}</AlertDialogTitle>
            <AlertDialogDescription>{t('approveDispatchDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin me-1.5" /> : null}
              {t('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View dispatch sheet */}
      <Sheet open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <SheetContent side={language === 'ar' ? 'left' : 'right'} className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {viewedDispatch?.dispatch_no}
            </SheetTitle>
          </SheetHeader>
          {viewedDispatch && (
            <div className="space-y-4 mt-4">
              <Card className="p-3 space-y-2 text-sm">
                <Row label={t('dispatchDate')} value={new Date(viewedDispatch.dispatch_date).toLocaleDateString('en-GB')} />
                <Row label={t('beneficiaryDepartment')} value={viewedDispatch.department_name} />
                <Row label={t('signerName')} value={viewedDispatch.signer_name} />
                {viewedDispatch.signer_title && <Row label={t('signerTitle')} value={viewedDispatch.signer_title} />}
                {viewedDispatch.shipping_company && <Row label={t('shippingCompany')} value={viewedDispatch.shipping_company} />}
                <Row label={t('destination')} value={t(`dest_${viewedDispatch.destination}`)} />
                <Row label={t('status')} value={t(viewedDispatch.status)} />
                {viewedDispatch.notes && <Row label={t('notes')} value={viewedDispatch.notes} />}
              </Card>
              <div>
                <h4 className="text-sm font-bold mb-2">{t('itemsToDispatch')} ({viewedItems.length})</h4>
                <div className="space-y-1.5">
                  {viewedItems.map((it) => {
                    const r = receiptMap.get(it.receipt_id);
                    return (
                      <Card key={it.id} className="p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-xs font-bold">{r?.part_no ?? '-'}</span>
                              {r?.box_no && <Badge variant="outline" className="font-mono text-[10px]">{r.box_no}</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{r?.description}</p>
                          </div>
                          <div className="text-end shrink-0">
                            <div className="text-sm font-bold tabular-nums">
                              {it.qty_dispatched.toLocaleString('en-US')}
                            </div>
                            <div className="text-[10px] text-muted-foreground">{r?.unit}</div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-muted-foreground min-w-[120px]">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}