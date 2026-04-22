import { useMemo, useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Package, PackageOpen } from 'lucide-react';
import { useAvailableReceipts } from '@/hooks/useContainerItems';
import type { ShippingContainer } from '@/hooks/useContainers';
import { destinationBadgeClass } from '../destinationStyles';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  container: ShippingContainer;
  packingType: 'boxed' | 'loose';
  onAdd: (receiptIds: string[]) => Promise<boolean>;
}

export function AddItemsToContainerDialog({
  open,
  onOpenChange,
  container,
  packingType,
  onAdd,
}: Props) {
  const { t } = useLanguage();
  const isLoose = packingType === 'loose';
  const { available, loading, refetch } = useAvailableReceipts({
    containerId: container.id,
    destination: container.destination,
    packingType,
  });

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setSearch('');
      setSelected(new Set());
      refetch();
    }
  }, [open, refetch]);

  // For boxed: group by box_no so picking a box picks all its items.
  const boxedGroups = useMemo(() => {
    if (isLoose) return [];
    const map = new Map<string, typeof available>();
    for (const r of available) {
      const key = r.box_no || '—';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).map(([box_no, items]) => ({
      box_no,
      items,
      total_qty: items.reduce((s, i) => s + i.qty, 0),
      destination: items[0]?.destination,
      suppliers: Array.from(new Set(items.map((i) => i.supplier))).join(', '),
    }));
  }, [available, isLoose]);

  const filteredLoose = useMemo(() => {
    if (!isLoose) return [];
    const q = search.trim().toLowerCase();
    if (!q) return available;
    return available.filter(
      (r) =>
        r.part_no.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.supplier.toLowerCase().includes(q)
    );
  }, [available, search, isLoose]);

  const filteredBoxedGroups = useMemo(() => {
    if (isLoose) return [];
    const q = search.trim().toLowerCase();
    if (!q) return boxedGroups;
    return boxedGroups.filter(
      (g) =>
        g.box_no.toLowerCase().includes(q) ||
        g.suppliers.toLowerCase().includes(q)
    );
  }, [boxedGroups, search, isLoose]);

  const allVisibleIds = useMemo(() => {
    if (isLoose) return filteredLoose.map((r) => r.id);
    return filteredBoxedGroups.flatMap((g) => g.items.map((i) => i.id));
  }, [isLoose, filteredLoose, filteredBoxedGroups]);

  const allSelected =
    allVisibleIds.length > 0 && allVisibleIds.every((id) => selected.has(id));

  const toggleAll = () => {
    if (allSelected) {
      const next = new Set(selected);
      allVisibleIds.forEach((id) => next.delete(id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      allVisibleIds.forEach((id) => next.add(id));
      setSelected(next);
    }
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleBox = (ids: string[]) => {
    const allIn = ids.every((id) => selected.has(id));
    const next = new Set(selected);
    if (allIn) ids.forEach((id) => next.delete(id));
    else ids.forEach((id) => next.add(id));
    setSelected(next);
  };

  const handleSubmit = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    const ok = await onAdd(Array.from(selected));
    setSubmitting(false);
    if (ok) onOpenChange(false);
  };

  const Icon = isLoose ? PackageOpen : Package;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            {isLoose ? t('availableLooseItems') : t('availableBoxes')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2 flex-1 min-h-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('search')}
                className="ps-10"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleAll}
              disabled={allVisibleIds.length === 0}
            >
              {allSelected ? t('deselectAll') : t('selectAll')}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto rounded-md border border-border min-h-[200px]">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin me-2" />
                {t('loading')}
              </div>
            ) : isLoose ? (
              filteredLoose.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  {t('noAvailableLoose')}
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {filteredLoose.map((r) => {
                    const checked = selected.has(r.id);
                    return (
                      <li
                        key={r.id}
                        className={cn(
                          'flex items-center gap-3 p-2.5 cursor-pointer transition-colors hover:bg-muted/50',
                          checked && 'bg-primary/5'
                        )}
                        onClick={() => toggle(r.id)}
                      >
                        <Checkbox checked={checked} onCheckedChange={() => toggle(r.id)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold">{r.part_no}</span>
                            <Badge className={destinationBadgeClass(r.destination)}>
                              {t(`dest_${r.destination}`)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{r.description}</p>
                          <p className="text-[10px] text-muted-foreground">{r.supplier}</p>
                        </div>
                        <div className="text-end shrink-0">
                          <div className="text-sm font-bold tabular-nums">
                            {r.qty.toLocaleString('en-US')}
                          </div>
                          <div className="text-[10px] text-muted-foreground">{r.unit}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )
            ) : filteredBoxedGroups.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                {t('noAvailableBoxes')}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {filteredBoxedGroups.map((g) => {
                  const ids = g.items.map((i) => i.id);
                  const allIn = ids.every((id) => selected.has(id));
                  return (
                    <li
                      key={g.box_no}
                      className={cn(
                        'flex items-center gap-3 p-2.5 cursor-pointer transition-colors hover:bg-muted/50',
                        allIn && 'bg-primary/5'
                      )}
                      onClick={() => toggleBox(ids)}
                    >
                      <Checkbox checked={allIn} onCheckedChange={() => toggleBox(ids)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-destructive">{g.box_no}</span>
                          {g.destination && (
                            <Badge className={destinationBadgeClass(g.destination)}>
                              {t(`dest_${g.destination}`)}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px]">
                            {g.items.length} {t('items')}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{g.suppliers}</p>
                      </div>
                      <div className="text-end shrink-0">
                        <div className="text-sm font-bold tabular-nums">
                          {g.total_qty.toLocaleString('en-US')}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{t('totalQty')}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2 sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {selected.size > 0
              ? t('selectedCount').replace('{n}', selected.size.toLocaleString('en-US'))
              : t('nothingSelected')}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={selected.size === 0 || submitting}>
              {submitting ? <Loader2 className="w-4 h-4 me-1.5 animate-spin" /> : null}
              {t('addSelected')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}