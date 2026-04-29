import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { useInvTransactions, useWarehouses, type InvTxnType } from '@/hooks/useInventory';
import { ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, RotateCcw, Loader2, Plus } from 'lucide-react';
import { InventoryTransactionDialog } from './InventoryTransactionDialog';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';

const TYPE_META: Record<InvTxnType, { icon: typeof ArrowDownToLine; color: string }> = {
  in: { icon: ArrowDownToLine, color: 'text-green-600' },
  out: { icon: ArrowUpFromLine, color: 'text-orange-600' },
  transfer: { icon: ArrowLeftRight, color: 'text-blue-600' },
  return: { icon: RotateCcw, color: 'text-purple-600' },
};

export function TransactionsTab() {
  const { t, language } = useLanguage();
  const [filter, setFilter] = useState<'all' | InvTxnType>('all');
  const [dialogType, setDialogType] = useState<InvTxnType | null>(null);

  const { transactions, loading } = useInvTransactions(filter !== 'all' ? { type: filter } : undefined);
  const { warehouses } = useWarehouses();
  const whMap = useMemo(() => new Map(warehouses.map(w => [w.id, w])), [warehouses]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setDialogType('in')} className="gap-1.5"><ArrowDownToLine className="w-4 h-4" /> {t('newReceiptTxn')}</Button>
        <Button onClick={() => setDialogType('out')} variant="secondary" className="gap-1.5"><ArrowUpFromLine className="w-4 h-4" /> {t('newIssueTxn')}</Button>
        <Button onClick={() => setDialogType('transfer')} variant="outline" className="gap-1.5"><ArrowLeftRight className="w-4 h-4" /> {t('newTransferTxn')}</Button>
        <Button onClick={() => setDialogType('return')} variant="outline" className="gap-1.5"><RotateCcw className="w-4 h-4" /> {t('newReturnTxn')}</Button>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList>
          <TabsTrigger value="all">{t('all')}</TabsTrigger>
          <TabsTrigger value="in">{t('receipts')}</TabsTrigger>
          <TabsTrigger value="out">{t('issues')}</TabsTrigger>
          <TabsTrigger value="transfer">{t('transfers')}</TabsTrigger>
          <TabsTrigger value="return">{t('returns')}</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : transactions.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">{t('noTransactions')}</CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {transactions.map(tx => {
            const meta = TYPE_META[tx.txn_type];
            const Icon = meta.icon;
            const fromWh = tx.from_warehouse_id ? whMap.get(tx.from_warehouse_id) : null;
            const toWh = tx.to_warehouse_id ? whMap.get(tx.to_warehouse_id) : null;
            return (
              <Card key={tx.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-muted/40 flex items-center justify-center ${meta.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold text-sm">{tx.txn_no}</span>
                      <Badge variant={tx.status === 'posted' ? 'default' : tx.status === 'draft' ? 'secondary' : 'destructive'}>
                        {t(tx.status)}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(tx.txn_date).toLocaleDateString('en-GB')}
                      {fromWh && <> · {t('from')}: {language === 'ar' ? fromWh.name_ar : fromWh.name_en}</>}
                      {toWh && <> · {t('to')}: {language === 'ar' ? toWh.name_ar : toWh.name_en}</>}
                      {tx.party_name && <> · {tx.party_name}</>}
                    </div>
                    {tx.declaration_id && (
                      <Link
                        to={`/declarations`}
                        className="inline-flex items-center gap-1 mt-1 text-xs text-primary hover:underline"
                      >
                        <FileText className="w-3 h-3" />
                        <span className="font-mono">{tx.declaration_id}</span>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {dialogType && (
        <InventoryTransactionDialog
          open={!!dialogType}
          onOpenChange={(o) => { if (!o) setDialogType(null); }}
          type={dialogType}
        />
      )}
    </div>
  );
}