import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeftRight, CheckCircle2, Loader2, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Header {
  id: string;
  movement_no: string;
  movement_type: 'receipt' | 'issue' | 'transfer';
  movement_date: string;
  status: 'draft' | 'posted' | 'cancelled';
  from_warehouse_id: string | null;
  to_warehouse_id: string | null;
  total_qty: number;
  total_value: number;
  reference_no: string | null;
  notes: string | null;
  created_at: string;
}
interface Line {
  id: string;
  line_no: number;
  qty: number;
  unit_cost: number;
  line_total: number;
  remarks: string | null;
  item_id: string;
  items_master?: { part_no: string; description: string | null } | null;
}

export default function MovementDetails() {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [header, setHeader] = useState<Header | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [warehousesMap, setWarehousesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [h, l, w] = await Promise.all([
      supabase.from('stock_movements').select('*').eq('id', id).single(),
      supabase
        .from('stock_movement_lines')
        .select('*, items_master(part_no, description)')
        .eq('movement_id', id)
        .order('line_no'),
      supabase.from('warehouses').select('id,code,name_ar'),
    ]);
    if (h.error) toast.error(h.error.message);
    else setHeader(h.data as Header);
    if (l.data) setLines(l.data as Line[]);
    if (w.data) {
      const map: Record<string, string> = {};
      (w.data as any[]).forEach((x) => {
        map[x.id] = `${x.code} — ${x.name_ar}`;
      });
      setWarehousesMap(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handlePost = async () => {
    if (!header) return;
    setPosting(true);
    const { error } = await supabase
      .from('stock_movements')
      .update({ status: 'posted' } as any)
      .eq('id', header.id);
    setPosting(false);
    if (error) toast.error(error.message);
    else {
      toast.success(t('movementPostedSuccess'));
      load();
    }
  };

  const typeLabel = (typ: Header['movement_type']) =>
    typ === 'receipt'
      ? t('movementReceipt')
      : typ === 'issue'
        ? t('movementIssue')
        : t('movementTransfer');

  if (loading || !header) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-7xl mx-auto py-12 text-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        <PageHeader
          title={`${typeLabel(header.movement_type)} — ${header.movement_no}`}
          subtitle={t('stockMovementsDesc')}
          icon={ArrowLeftRight}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="w-4 h-4 me-1" />
                {t('print')}
              </Button>
              {header.status === 'draft' && canManage && (
                <Button onClick={handlePost} disabled={posting}>
                  {posting ? (
                    <Loader2 className="w-4 h-4 me-1 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 me-1" />
                  )}
                  {t('postMovement')}
                </Button>
              )}
            </div>
          }
        />

        <Card className="p-4 mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <Field label={t('movementNo')} value={header.movement_no} mono />
          <Field label={t('movementType')} value={typeLabel(header.movement_type)} />
          <Field
            label={t('movementStatus')}
            value={
              header.status === 'posted'
                ? <Badge className="bg-emerald-600">{t('movementPosted')}</Badge>
                : header.status === 'cancelled'
                  ? <Badge variant="destructive">{t('movementCancelled')}</Badge>
                  : <Badge variant="secondary">{t('movementDraft')}</Badge>
            }
          />
          <Field label={t('movementDate')} value={format(new Date(header.movement_date), 'dd/MM/yyyy')} />
          {header.from_warehouse_id && (
            <Field label={t('fromWarehouse')} value={warehousesMap[header.from_warehouse_id] ?? '—'} />
          )}
          {header.to_warehouse_id && (
            <Field label={t('toWarehouse')} value={warehousesMap[header.to_warehouse_id] ?? '—'} />
          )}
          <Field label={t('referenceNo')} value={header.reference_no ?? '—'} />
          <Field
            label={t('totalQty')}
            value={Number(header.total_qty).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
          />
          <Field
            label={t('totalValue')}
            value={Number(header.total_value).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          />
          {header.notes && (
            <div className="sm:col-span-2 lg:col-span-3">
              <div className="text-xs text-muted-foreground mb-1">{t('notes')}</div>
              <div>{header.notes}</div>
            </div>
          )}
        </Card>

        <Card className="p-4 mt-4">
          <h3 className="text-lg font-semibold mb-3">{t('movementLines')}</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>{t('itemLabel')}</TableHead>
                  <TableHead>{t('qtyLabel')}</TableHead>
                  <TableHead>{t('unitCost')}</TableHead>
                  <TableHead>{t('lineTotal')}</TableHead>
                  <TableHead>{t('remarks')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.line_no}</TableCell>
                    <TableCell>
                      <div className="font-mono">{l.items_master?.part_no ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">
                        {l.items_master?.description ?? ''}
                      </div>
                    </TableCell>
                    <TableCell>{Number(l.qty).toLocaleString()}</TableCell>
                    <TableCell>{Number(l.unit_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="font-mono">
                      {Number(l.line_total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{l.remarks ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        <div className="mt-4 flex justify-end">
          <Button variant="ghost" onClick={() => navigate('/inventory/movements')}>
            {t('back')}
          </Button>
        </div>
      </main>
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={mono ? 'font-mono font-medium' : ''}>{value}</div>
    </div>
  );
}
