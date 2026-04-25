import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { FileText, Search } from 'lucide-react';
import type { BoxReceipt } from '@/hooks/useBoxReceipts';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipts: BoxReceipt[];
  onPick: (invoiceNumber: string) => void;
}

function fmtDate(d: string) {
  if (!d) return '';
  const x = new Date(d);
  return `${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}/${x.getFullYear()}`;
}

export function InvoicePickerDialog({ open, onOpenChange, receipts, onPick }: Props) {
  const { t } = useLanguage();
  const [q, setQ] = useState('');

  // Group receipts by invoice_number (only those that HAVE one)
  const invoices = useMemo(() => {
    const map = new Map<
      string,
      { invoiceNumber: string; supplier: string; date: string; count: number; totalQty: number }
    >();
    for (const r of receipts) {
      const inv = (r.invoice_number ?? '').trim();
      if (!inv) continue;
      const cur = map.get(inv);
      if (cur) {
        cur.count += 1;
        cur.totalQty += r.qty;
        if (r.receipt_date > cur.date) cur.date = r.receipt_date;
      } else {
        map.set(inv, {
          invoiceNumber: inv,
          supplier: r.supplier,
          date: r.receipt_date,
          count: 1,
          totalQty: r.qty,
        });
      }
    }
    const arr = Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
    const needle = q.trim().toLowerCase();
    if (!needle) return arr;
    return arr.filter(
      (i) =>
        i.invoiceNumber.toLowerCase().includes(needle) ||
        i.supplier.toLowerCase().includes(needle)
    );
  }, [receipts, q]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            {t('pickInvoiceToEdit')}
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('search')}
            className="ps-10"
          />
        </div>

        {invoices.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {t('noInvoicesYet')}
          </div>
        ) : (
          <ul className="space-y-2 mt-2">
            {invoices.map((inv) => (
              <li key={inv.invoiceNumber}>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between h-auto py-3 px-4"
                  onClick={() => {
                    onPick(inv.invoiceNumber);
                    onOpenChange(false);
                  }}
                >
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="font-mono font-bold text-sm">{inv.invoiceNumber}</span>
                    <span className="text-xs text-muted-foreground">{inv.supplier}</span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 text-xs text-muted-foreground tabular-nums">
                    <span>{fmtDate(inv.date)}</span>
                    <span>
                      {inv.count} {t('invoiceLines')} · {t('qty')}: {inv.totalQty}
                    </span>
                  </div>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}