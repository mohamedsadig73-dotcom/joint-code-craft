import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/contexts/LanguageContext';
import { useItemWarehouses } from '@/hooks/useItemRelations';
import { useWarehouses } from '@/hooks/useInventory';
import { Trash2, Plus, Star } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function ItemWarehousesTab({ itemId }: { itemId: string }) {
  const { t, language } = useLanguage();
  const { links, upsert, remove } = useItemWarehouses(itemId);
  const { warehouses } = useWarehouses();
  const [whId, setWhId] = useState('');
  const [minQty, setMinQty] = useState<number>(0);
  const [maxQty, setMaxQty] = useState<string>('');
  const [isDefault, setIsDefault] = useState(false);

  const handleAdd = async () => {
    if (!whId) return;
    const ok = await upsert({
      item_id: itemId, warehouse_id: whId,
      min_qty: minQty, max_qty: maxQty === '' ? null : Number(maxQty),
      is_default: isDefault,
    });
    if (ok) { setWhId(''); setMinQty(0); setMaxQty(''); setIsDefault(false); }
  };

  const whName = (id: string) => {
    const w = warehouses.find((x) => x.id === id);
    if (!w) return id;
    return `${w.code} — ${language === 'ar' ? w.name_ar : w.name_en}`;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 rounded-md border p-3">
        <Select value={whId} onValueChange={setWhId}>
          <SelectTrigger><SelectValue placeholder={t('selectWarehouse')} /></SelectTrigger>
          <SelectContent>
            {warehouses.filter(w => w.is_active).map((w) => (
              <SelectItem key={w.id} value={w.id}>{w.code} — {language === 'ar' ? w.name_ar : w.name_en}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="number" min={0} placeholder={t('minQty')} value={minQty} onChange={(e) => setMinQty(Number(e.target.value))} />
        <Input type="number" min={0} placeholder={t('maxQty')} value={maxQty} onChange={(e) => setMaxQty(e.target.value)} />
        <div className="flex items-center gap-2"><Switch checked={isDefault} onCheckedChange={setIsDefault} /><span className="text-sm">{t('defaultWarehouse')}</span></div>
        <Button onClick={handleAdd} disabled={!whId}><Plus className="w-4 h-4 me-1.5" />{t('add')}</Button>
      </div>

      {links.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">{t('noWarehousesLinked')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('warehouse')}</TableHead>
              <TableHead>{t('minQty')}</TableHead>
              <TableHead>{t('maxQty')}</TableHead>
              <TableHead>{t('defaultWarehouse')}</TableHead>
              <TableHead className="text-end">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{whName(l.warehouse_id)}</TableCell>
                <TableCell>{l.min_qty ?? 0}</TableCell>
                <TableCell>{l.max_qty ?? '—'}</TableCell>
                <TableCell>{l.is_default && <Star className="w-4 h-4 text-secondary" />}</TableCell>
                <TableCell className="text-end">
                  <Button size="sm" variant="ghost" onClick={() => remove(l.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}