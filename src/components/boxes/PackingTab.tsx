import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBoxReceipts } from '@/hooks/useBoxReceipts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Search, Package, Boxes, Filter } from 'lucide-react';
import { destinationBadgeClass } from './destinationStyles';
import { useToast } from '@/hooks/use-toast';
import { normalizeBoxNo } from '@/utils/boxNumberValidation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * PackingTab — workflow screen between "received" and "shipped".
 * Shows received items (boxed = unassigned to a box, loose = no box at all)
 * and lets admins/managers bulk-assign them to a box and mark them "packed".
 */
export function PackingTab() {
  const { t } = useLanguage();
  const { receipts, loading, bulkUpdateFields } = useBoxReceipts();
  const { user } = useAuth();
  const { toast } = useToast();

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const canPack = isAdmin || isManager;

  const [search, setSearch] = useState('');
  const [destFilter, setDestFilter] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [packDialogOpen, setPackDialogOpen] = useState(false);
  const [boxNoInput, setBoxNoInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /** Items eligible for packing: status=received and not yet 'packed' or 'shipped'. */
  const candidates = useMemo(
    () => receipts.filter((r) => r.status === 'received' || r.status === 'sorted'),
    [receipts]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidates.filter((r) => {
      if (destFilter !== 'all' && r.destination !== destFilter) return false;
      if (!q) return true;
      return (
        r.part_no.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.supplier.toLowerCase().includes(q) ||
        (r.box_no?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [candidates, search, destFilter]);

  const toggle = (id: string) => {
    setSelected((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    if (filtered.every((r) => selected.has(r.id))) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r.id)));
  };

  const handleAssignBox = async () => {
    const normalized = normalizeBoxNo(boxNoInput);
    if (!normalized) {
      toast({ title: t('error'), description: t('boxNoRequired'), variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const ids = Array.from(selected);
      const updated = await bulkUpdateFields(ids, {
        box_no: normalized,
        packing_type: 'boxed',
        status: 'packed',
      });
      if (updated > 0) {
        toast({ title: t('success'), description: `${updated} ${t('itemsPacked')}` });
        setSelected(new Set());
        setBoxNoInput('');
        setPackDialogOpen(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPacked = async () => {
    setSubmitting(true);
    try {
      const ids = Array.from(selected);
      const updated = await bulkUpdateFields(ids, { status: 'packed' });
      if (updated > 0) {
        toast({ title: t('success'), description: `${updated} ${t('itemsPacked')}` });
        setSelected(new Set());
      }
    } finally {
      setSubmitting(false);
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
            placeholder={t('search')}
            className="ps-10"
          />
        </div>
        <Select value={destFilter} onValueChange={setDestFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="w-3.5 h-3.5 me-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all')}</SelectItem>
            <SelectItem value="morocco">{t('dest_morocco')}</SelectItem>
            <SelectItem value="uzbekistan">{t('dest_uzbekistan')}</SelectItem>
            <SelectItem value="unspecified">{t('dest_unspecified')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && canPack && (
        <Card className="p-3 flex flex-wrap items-center gap-2 bg-primary/5 border-primary/30">
          <span className="text-sm font-medium">
            {t('selectedCount').replace('{n}', selected.size.toLocaleString('en-US'))}
          </span>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={() => setPackDialogOpen(true)} className="gap-1.5">
            <Boxes className="w-4 h-4" />
            {t('assignToBox')}
          </Button>
          <Button size="sm" onClick={handleMarkPacked} disabled={submitting} className="gap-1.5">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
            {t('markAsPacked')}
          </Button>
        </Card>
      )}

      {/* Counts */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {t('readyToPack')}: <span className="font-bold tabular-nums">{filtered.length.toLocaleString('en-US')}</span>
        </span>
        {filtered.length > 0 && (
          <button onClick={toggleAll} className="text-primary hover:underline">
            {filtered.every((r) => selected.has(r.id)) ? t('deselectAll') : t('selectAll')}
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          <Package className="w-12 h-12 mx-auto opacity-30 mb-2" />
          {t('noItemsToPack')}
        </Card>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((r) => {
            const isChecked = selected.has(r.id);
            return (
              <Card
                key={r.id}
                className={`p-2.5 flex items-center gap-3 cursor-pointer transition-colors hover:bg-muted/50 ${isChecked ? 'bg-primary/5 border-primary/40' : ''}`}
                onClick={() => canPack && toggle(r.id)}
              >
                {canPack && (
                  <Checkbox checked={isChecked} onCheckedChange={() => toggle(r.id)} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold">{r.part_no}</span>
                    <Badge className={destinationBadgeClass(r.destination)}>
                      {t(`dest_${r.destination}`)}
                    </Badge>
                    {r.box_no && (
                      <Badge variant="outline" className="font-mono text-[10px]">{r.box_no}</Badge>
                    )}
                    <Badge variant="secondary" className="text-[10px]">{t(r.status)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{r.description}</p>
                  <p className="text-[10px] text-muted-foreground">{r.supplier}</p>
                </div>
                <div className="text-end shrink-0">
                  <div className="text-sm font-bold tabular-nums">
                    {r.qty.toLocaleString('en-US')}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{r.unit}</div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Assign-to-box dialog */}
      <Dialog open={packDialogOpen} onOpenChange={setPackDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('assignToBox')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{t('assignToBoxDesc')}</p>
            <Input
              value={boxNoInput}
              onChange={(e) => setBoxNoInput(e.target.value)}
              placeholder="B-01"
              className="text-center font-mono text-lg uppercase"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPackDialogOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleAssignBox} disabled={submitting || !boxNoInput.trim()}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin me-1.5" /> : null}
              {t('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}