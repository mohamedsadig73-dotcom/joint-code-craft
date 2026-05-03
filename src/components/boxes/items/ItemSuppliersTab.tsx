import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/contexts/LanguageContext';
import { useItemSuppliers, useSuppliersList } from '@/hooks/useItemRelations';
import { Trash2, Plus, Star } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function ItemSuppliersTab({ itemId }: { itemId: string }) {
  const { t } = useLanguage();
  const { links, upsert, remove } = useItemSuppliers(itemId);
  const suppliers = useSuppliersList();
  const [supplierId, setSupplierId] = useState('');
  const [supplierItemCode, setSupplierItemCode] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [preferred, setPreferred] = useState(false);

  const handleAdd = async () => {
    if (!supplierId) return;
    const ok = await upsert({ item_id: itemId, supplier_id: supplierId, supplier_item_code: supplierItemCode || null, purchase_price: price, is_preferred: preferred });
    if (ok) { setSupplierId(''); setSupplierItemCode(''); setPrice(0); setPreferred(false); }
  };

  const supplierName = (id: string) => {
    const s = suppliers.find((x) => x.id === id);
    return s ? `${s.code} — ${s.name_ar}` : id;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 rounded-md border p-3">
        <Select value={supplierId} onValueChange={setSupplierId}>
          <SelectTrigger><SelectValue placeholder={t('selectSupplier')} /></SelectTrigger>
          <SelectContent>
            {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.code} — {s.name_ar}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder={t('supplierItemCode')} value={supplierItemCode} onChange={(e) => setSupplierItemCode(e.target.value)} />
        <Input type="number" min={0} placeholder={t('purchasePrice')} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
        <div className="flex items-center gap-2"><Switch checked={preferred} onCheckedChange={setPreferred} /><span className="text-sm">{t('preferred')}</span></div>
        <Button onClick={handleAdd} disabled={!supplierId}><Plus className="w-4 h-4 me-1.5" />{t('add')}</Button>
      </div>

      {links.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">{t('noSuppliersLinked')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('supplier')}</TableHead>
              <TableHead>{t('supplierItemCode')}</TableHead>
              <TableHead>{t('purchasePrice')}</TableHead>
              <TableHead>{t('preferred')}</TableHead>
              <TableHead className="text-end">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{supplierName(l.supplier_id)}</TableCell>
                <TableCell>{l.supplier_item_code ?? '—'}</TableCell>
                <TableCell>{Number(l.purchase_price).toFixed(2)}</TableCell>
                <TableCell>{l.is_preferred && <Star className="w-4 h-4 text-secondary" />}</TableCell>
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