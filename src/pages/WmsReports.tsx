import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/ui/PageHeader';
import { Navigation } from '@/components/Navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStockSummary, useLowStock } from '@/hooks/useWmsReports';
import { useInvCustody, useInvTransactions } from '@/hooks/useInventory';
import { useItemsMaster } from '@/hooks/useItemsMaster';
import { useWarehouses } from '@/hooks/useInventory';
import { BarChart3, Download, AlertTriangle, Package, UserCheck, FileText, Loader2 } from 'lucide-react';
import { exportStockReport, exportCustodyReport, exportMovementsReport, exportLowStockReport } from '@/utils/wmsExcelExport';
import { useToast } from '@/hooks/use-toast';

export default function WmsReports() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { rows: stockRows, loading: stockLoading } = useStockSummary();
  const { items: lowStock, loading: lowLoading } = useLowStock();
  const { custody, loading: custLoading } = useInvCustody();
  const { transactions, loading: txnLoading } = useInvTransactions();
  const { items } = useItemsMaster();
  const { warehouses } = useWarehouses();
  const [tab, setTab] = useState<'stock' | 'low' | 'custody' | 'movements'>('stock');
  const [search, setSearch] = useState('');

  const itemMap = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);
  const whMap = useMemo(() => new Map(warehouses.map(w => [w.id, w])), [warehouses]);

  const filteredStock = useMemo(() => {
    if (!search) return stockRows;
    const q = search.toLowerCase();
    return stockRows.filter(r => r.part_no.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
  }, [stockRows, search]);

  const handleExportStock = async () => {
    try {
      await exportStockReport(filteredStock.map(r => ({
        part_no: r.part_no,
        description: r.description,
        unit: r.unit,
        warehouse_code: r.warehouse_code,
        warehouse_name: language === 'ar' ? r.warehouse_name_ar : r.warehouse_name_en,
        location_code: r.location_code,
        qty: Number(r.qty),
        min_qty: r.min_qty != null ? Number(r.min_qty) : null,
      })), language as 'ar' | 'en');
      toast({ title: t('success'), description: t('reportExported') });
    } catch (e) {
      toast({ title: t('error'), description: String(e), variant: 'destructive' });
    }
  };

  const handleExportLow = async () => {
    await exportLowStockReport(lowStock.map(r => ({
      part_no: r.part_no, description: r.description,
      total_qty: Number(r.total_qty), min_qty: Number(r.min_qty),
    })), language as 'ar' | 'en');
    toast({ title: t('success'), description: t('reportExported') });
  };

  const handleExportCustody = async () => {
    await exportCustodyReport(custody.map(c => {
      const item = itemMap.get(c.item_id);
      return {
        party_type: c.party_type,
        party_name: c.party_name,
        party_ref: c.party_ref,
        part_no: item?.part_no ?? '',
        description: item?.description ?? '',
        qty: Number(c.qty),
        last_movement_at: c.last_movement_at,
      };
    }), language as 'ar' | 'en');
    toast({ title: t('success'), description: t('reportExported') });
  };

  const handleExportMovements = async () => {
    await exportMovementsReport(transactions.map(tx => {
      const fromWh = tx.from_warehouse_id ? whMap.get(tx.from_warehouse_id) : null;
      const toWh = tx.to_warehouse_id ? whMap.get(tx.to_warehouse_id) : null;
      return {
        txn_no: tx.txn_no,
        txn_type: tx.txn_type,
        txn_date: tx.txn_date,
        status: tx.status,
        declaration_id: tx.declaration_id,
        from_warehouse: fromWh ? (language === 'ar' ? fromWh.name_ar : fromWh.name_en) : '',
        to_warehouse: toWh ? (language === 'ar' ? toWh.name_ar : toWh.name_en) : '',
        party_name: tx.party_name ?? '',
        notes: tx.notes ?? '',
      };
    }), language as 'ar' | 'en');
    toast({ title: t('success'), description: t('reportExported') });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        <PageHeader title={t('wmsReports')} subtitle={t('wmsReportsDesc')} icon={BarChart3} />

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="grid w-full grid-cols-4 max-w-3xl">
            <TabsTrigger value="stock" className="gap-1.5"><Package className="w-4 h-4" /><span className="hidden sm:inline">{t('stockReport')}</span></TabsTrigger>
            <TabsTrigger value="low" className="gap-1.5"><AlertTriangle className="w-4 h-4" /><span className="hidden sm:inline">{t('lowStockAlerts')}</span></TabsTrigger>
            <TabsTrigger value="custody" className="gap-1.5"><UserCheck className="w-4 h-4" /><span className="hidden sm:inline">{t('custodyReport')}</span></TabsTrigger>
            <TabsTrigger value="movements" className="gap-1.5"><FileText className="w-4 h-4" /><span className="hidden sm:inline">{t('movementsReport')}</span></TabsTrigger>
          </TabsList>

          {/* Stock */}
          <TabsContent value="stock" className="mt-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('searchItems')} className="flex-1" />
              <Button onClick={handleExportStock} disabled={stockLoading || !filteredStock.length} className="gap-1.5">
                <Download className="w-4 h-4" /> {t('exportExcel')}
              </Button>
            </div>
            {stockLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : (
              <Card><CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="p-2 text-start">{t('partNo')}</th>
                      <th className="p-2 text-start">{t('description')}</th>
                      <th className="p-2 text-start">{t('warehouse')}</th>
                      <th className="p-2 text-end">{t('qty')}</th>
                      <th className="p-2 text-end">{t('minQty')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStock.slice(0, 200).map((r, i) => {
                      const low = r.min_qty != null && r.min_qty > 0 && r.qty < r.min_qty;
                      return (
                        <tr key={`${r.item_id}-${r.warehouse_id}-${r.location_id ?? 'none'}-${i}`} className={low ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                          <td className="p-2 font-mono">{r.part_no}</td>
                          <td className="p-2 truncate max-w-xs">{r.description}</td>
                          <td className="p-2">{language === 'ar' ? r.warehouse_name_ar : r.warehouse_name_en}</td>
                          <td className="p-2 text-end tabular-nums font-semibold">{r.qty}</td>
                          <td className="p-2 text-end tabular-nums text-muted-foreground">{r.min_qty ?? '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredStock.length > 200 && (
                  <div className="p-2 text-center text-xs text-muted-foreground">{t('showing200OfX').replace('{x}', String(filteredStock.length))}</div>
                )}
              </CardContent></Card>
            )}
          </TabsContent>

          {/* Low Stock */}
          <TabsContent value="low" className="mt-4 space-y-3">
            <Button onClick={handleExportLow} disabled={lowLoading || !lowStock.length} className="gap-1.5">
              <Download className="w-4 h-4" /> {t('exportExcel')}
            </Button>
            {lowLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : lowStock.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">{t('noLowStock')}</CardContent></Card>
            ) : (
              <div className="grid gap-2">
                {lowStock.map(item => (
                  <Card key={item.item_id}>
                    <CardContent className="p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-mono font-semibold">{item.part_no}</div>
                        <div className="text-sm text-muted-foreground truncate">{item.description}</div>
                      </div>
                      <div className="text-end shrink-0">
                        <div className="text-2xl font-bold text-red-600 tabular-nums">{item.total_qty}</div>
                        <div className="text-xs text-muted-foreground">{t('min')}: {item.min_qty}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Custody */}
          <TabsContent value="custody" className="mt-4 space-y-3">
            <Button onClick={handleExportCustody} disabled={custLoading || !custody.length} className="gap-1.5">
              <Download className="w-4 h-4" /> {t('exportExcel')}
            </Button>
            {custLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : custody.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">{t('noCustody')}</CardContent></Card>
            ) : (
              <Card><CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="p-2 text-start">{t('partyName')}</th>
                      <th className="p-2 text-start">{t('partNo')}</th>
                      <th className="p-2 text-start">{t('description')}</th>
                      <th className="p-2 text-end">{t('qty')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {custody.map(c => {
                      const item = itemMap.get(c.item_id);
                      return (
                        <tr key={c.id}>
                          <td className="p-2">{c.party_name}</td>
                          <td className="p-2 font-mono">{item?.part_no ?? '—'}</td>
                          <td className="p-2 truncate max-w-xs">{item?.description ?? ''}</td>
                          <td className="p-2 text-end tabular-nums font-semibold">{c.qty}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent></Card>
            )}
          </TabsContent>

          {/* Movements */}
          <TabsContent value="movements" className="mt-4 space-y-3">
            <Button onClick={handleExportMovements} disabled={txnLoading || !transactions.length} className="gap-1.5">
              <Download className="w-4 h-4" /> {t('exportExcel')}
            </Button>
            {txnLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : (
              <Card><CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="p-2 text-start">{t('invReference')}</th>
                      <th className="p-2 text-start">{t('type')}</th>
                      <th className="p-2 text-start">{t('invDate')}</th>
                      <th className="p-2 text-start">{t('declarationNo')}</th>
                      <th className="p-2 text-start">{t('partyName')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.slice(0, 200).map(tx => (
                      <tr key={tx.id}>
                        <td className="p-2 font-mono">{tx.txn_no}</td>
                        <td className="p-2">{t(tx.txn_type === 'in' ? 'newReceiptTxn' : tx.txn_type === 'out' ? 'newIssueTxn' : tx.txn_type)}</td>
                        <td className="p-2">{new Date(tx.txn_date).toLocaleDateString('en-GB')}</td>
                        <td className="p-2 font-mono text-xs">{tx.declaration_id ?? '—'}</td>
                        <td className="p-2">{tx.party_name ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent></Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}