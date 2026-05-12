import { useMemo, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Search, Settings, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBoxReceipts } from '@/hooks/useBoxReceipts';
import { useDuplicateRules } from '@/hooks/useDuplicateRules';
import { findDuplicateGroups } from '@/utils/boxDuplicateAnalysis';
import { destinationBadgeClass } from '@/components/boxes/destinationStyles';
import { Link } from 'react-router-dom';

export default function BoxesDuplicatesReport() {
  const { t } = useLanguage();
  const { receipts, loading } = useBoxReceipts();
  const { rules, loading: rulesLoading } = useDuplicateRules();
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  const groups = useMemo(() => findDuplicateGroups(receipts, rules), [receipts, rules]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) =>
      g.part_no.toLowerCase().includes(q) ||
      (g.box_no ?? '').toLowerCase().includes(q) ||
      (g.supplier ?? '').toLowerCase().includes(q) ||
      (g.invoice_number ?? '').toLowerCase().includes(q)
    );
  }, [groups, search]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(t('duplicatesReport'));
      ws.columns = [
        { header: t('partNo'), key: 'part_no', width: 22 },
        { header: t('boxNo'), key: 'box_no', width: 14 },
        { header: t('destination'), key: 'destination', width: 16 },
        { header: t('supplier'), key: 'supplier', width: 24 },
        { header: t('invoiceNumber'), key: 'invoice_number', width: 18 },
        { header: t('serial'), key: 'serial', width: 10 },
        { header: t('qty'), key: 'qty', width: 10 },
        { header: t('description'), key: 'description', width: 30 },
        { header: t('date'), key: 'date', width: 14 },
      ];
      filtered.forEach((g) => {
        g.receipts.forEach((r) => {
          ws.addRow({
            part_no: r.part_no,
            box_no: r.box_no ?? '—',
            destination: r.destination,
            supplier: r.supplier,
            invoice_number: r.invoice_number ?? '—',
            serial: `#${r.serial_no}`,
            qty: r.qty,
            description: r.description,
            date: r.receipt_date,
          });
        });
      });
      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `duplicates-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const isLoading = loading || rulesLoading;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        <PageHeader title={t('duplicatesReport')} subtitle={t('duplicatesReportDesc')} icon={AlertTriangle} />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Card className="px-3 py-2 text-xs">
            <span className="text-muted-foreground me-2">{t('duplicateRulesActive')}:</span>
            <span className="font-mono font-semibold">{rules.fields.join(' + ')}</span>
          </Card>
          <Button variant="outline" size="sm" asChild>
            <Link to="/boxes/duplicate-rules" className="gap-1.5">
              <Settings className="w-4 h-4" />
              {t('duplicateRulesSettings')}
            </Link>
          </Button>
          <div className="flex-1" />
          <Button size="sm" onClick={handleExport} disabled={exporting || filtered.length === 0}>
            {exporting ? <Loader2 className="w-4 h-4 me-1.5 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 me-1.5" />}
            {t('exportExcel')}
          </Button>
        </div>

        <div className="mt-3 relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`${t('partNo')} / ${t('boxNo')} / ${t('supplier')} / ${t('invoiceNumber')}`}
            className="ps-10"
          />
        </div>

        {isLoading ? (
          <Card className="p-8 text-center mt-4">
            <Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center mt-4 border-success/40 bg-success/5">
            <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-2" />
            <div className="font-semibold">{t('noDuplicatesFound')}</div>
          </Card>
        ) : (
          <div className="space-y-3 mt-4">
            {filtered.map((g) => (
              <Card key={g.key} className="p-4 border-warning/40">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <div className="text-sm flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold">{g.part_no}</span>
                    <span className="text-muted-foreground">·</span>
                    <Badge variant="outline">{t('boxNo')}: {g.box_no ?? '—'}</Badge>
                    <Badge className={destinationBadgeClass(g.destination)}>{t(`dest_${g.destination}`)}</Badge>
                    {g.supplier && <Badge variant="secondary">{g.supplier}</Badge>}
                    {g.invoice_number && <Badge variant="outline">{t('invoiceNumber')}: {g.invoice_number}</Badge>}
                  </div>
                  <Badge variant="destructive">
                    {g.receipts.length} × {t('qty')} {g.totalQty.toLocaleString('en-US')}
                  </Badge>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('serial')}</TableHead>
                        <TableHead>{t('supplier')}</TableHead>
                        <TableHead>{t('invoiceNumber')}</TableHead>
                        <TableHead className="text-end">{t('qty')}</TableHead>
                        <TableHead>{t('date')}</TableHead>
                        <TableHead>{t('description')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {g.receipts.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-xs">#{r.serial_no}</TableCell>
                          <TableCell className="text-xs">{r.supplier}</TableCell>
                          <TableCell className="text-xs">{r.invoice_number ?? '—'}</TableCell>
                          <TableCell className="text-end tabular-nums">{r.qty.toLocaleString('en-US')}</TableCell>
                          <TableCell className="text-xs">{r.receipt_date}</TableCell>
                          <TableCell className="text-xs max-w-[260px] truncate">{r.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}