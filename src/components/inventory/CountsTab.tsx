import { useEffect, useMemo, useState } from 'react';
import { useStockCounts, useStockCountLines } from '@/hooks/useStockCounts';
import { ClipboardList, Plus, Trash2, Search, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function CountsTab() {
  const { rows, loading, create } = useStockCounts();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [warehouses, setWarehouses] = useState<{ id: string; name_ar: string; code: string }[]>([]);
  const [whId, setWhId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    supabase.from('warehouses').select('id, name_ar, code').eq('is_active', true).then(({ data }) => {
      setWarehouses((data as any) || []);
    });
  }, []);

  if (activeId) return <CountDetail id={activeId} onBack={() => setActiveId(null)} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpenNew(true)} className="gap-2">
          <Plus className="w-4 h-4" />جرد جديد
        </Button>
      </div>

      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">لا توجد عمليات جرد بعد</div>
        ) : (
          rows.map((r) => {
            const wh = warehouses.find((w) => w.id === r.warehouse_id);
            return (
              <Card key={r.id} className="p-4 cursor-pointer hover:bg-muted/30 transition" onClick={() => setActiveId(r.id)}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono font-bold">{r.count_no}</div>
                    <div className="text-sm text-muted-foreground">
                      {wh?.name_ar} • {new Date(r.count_date).toLocaleDateString('en-GB')}
                    </div>
                  </div>
                  <Badge>{r.status}</Badge>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>جرد جديد</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>المخزن</Label>
              <Select value={whId} onValueChange={setWhId}>
                <SelectTrigger><SelectValue placeholder="اختر المخزن" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name_ar} ({w.code})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button className="w-full" disabled={!whId} onClick={async () => {
              const c = await create(whId, notes || undefined);
              if (c) { setOpenNew(false); setActiveId(c.id); setNotes(''); setWhId(''); }
            }}>إنشاء</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CountDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { lines, loading, upsertCount, removeLine } = useStockCountLines(id);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<{ id: string; part_no: string; description: string; name_ar: string | null }[]>([]);
  const [qty, setQty] = useState<Record<string, string>>({});

  useEffect(() => {
    if (search.length < 2) { setItems([]); return; }
    const handle = setTimeout(() => {
      supabase.from('items_master')
        .select('id, part_no, description, name_ar')
        .or(`part_no.ilike.%${search}%,description.ilike.%${search}%,name_ar.ilike.%${search}%,barcode.eq.${search}`)
        .eq('is_active', true)
        .limit(10)
        .then(({ data }) => setItems((data as any) || []));
    }, 250);
    return () => clearTimeout(handle);
  }, [search]);

  const totalVar = useMemo(() => lines.reduce((s, l) => s + Number(l.variance_qty || 0), 0), [lines]);

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} className="gap-2"><ArrowLeft className="w-4 h-4" />رجوع</Button>
      <div className="text-sm text-muted-foreground">
        <ClipboardList className="inline w-4 h-4 me-1" />
        تفاصيل الجرد — عدد البنود: {lines.length} • صافي الفرق: {totalVar}
      </div>

      <Card className="p-3 sticky top-16 z-10 bg-background/95 backdrop-blur">
        <Label className="text-xs">بحث برمز الصنف / الباركود / الاسم</Label>
        <div className="relative mt-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} className="ps-10" placeholder="ابحث للإضافة" autoFocus />
        </div>
        {items.length > 0 && (
          <div className="mt-2 space-y-1 max-h-60 overflow-auto">
            {items.map((it) => (
              <div key={it.id} className="flex items-center gap-2 p-2 border rounded">
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm font-bold">{it.part_no}</div>
                  <div className="text-xs text-muted-foreground truncate">{it.name_ar || it.description}</div>
                </div>
                <Input type="number" inputMode="decimal" className="w-24" placeholder="العدد"
                  value={qty[it.id] ?? ''} onChange={(e) => setQty((p) => ({ ...p, [it.id]: e.target.value }))} />
                <Button size="sm" disabled={!qty[it.id]} onClick={async () => {
                  const ok = await upsertCount(it.id, Number(qty[it.id]) || 0);
                  if (ok) { setQty((p) => ({ ...p, [it.id]: '' })); setSearch(''); toast.success('أُضيف'); }
                }}>إضافة</Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="space-y-2">
        {loading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />) :
          lines.length === 0 ? <div className="text-center py-8 text-muted-foreground">لا توجد بنود — ابحث وأضف للأعلى</div> :
          lines.map((l) => (
            <Card key={l.id} className="p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-mono text-sm font-bold">{l.part_no}</div>
                <div className="text-xs text-muted-foreground truncate">{l.description}</div>
              </div>
              <div className="text-end">
                <div className="text-xs text-muted-foreground">المعدود</div>
                <div className="font-bold">{Number(l.counted_qty)}</div>
              </div>
              <div className="text-end">
                <div className="text-xs text-muted-foreground">الفرق</div>
                <Badge variant={l.variance_qty === 0 ? 'secondary' : (l.variance_qty > 0 ? 'default' : 'destructive')}>
                  {l.variance_qty > 0 ? '+' : ''}{l.variance_qty}
                </Badge>
              </div>
              <Button size="icon" variant="ghost" onClick={() => removeLine(l.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </Card>
          ))
        }
      </div>
    </div>
  );
}
