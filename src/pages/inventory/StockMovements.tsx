import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, ArrowLeftRight, Loader2, FileText, Search } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type MovementType = 'receipt' | 'issue' | 'transfer';
type MovementStatus = 'draft' | 'posted' | 'cancelled';

interface MovementRow {
  id: string;
  movement_no: string;
  movement_type: MovementType;
  movement_date: string;
  status: MovementStatus;
  total_qty: number;
  total_value: number;
  from_warehouse_id: string | null;
  to_warehouse_id: string | null;
  notes: string | null;
  created_at: string;
}

export default function StockMovements() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'all' | MovementType>('all');
  const [rows, setRows] = useState<MovementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from('stock_movements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (tab !== 'all') q = q.eq('movement_type', tab);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    else setRows((data ?? []) as MovementRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.movement_no.toLowerCase().includes(q) ||
        (r.notes ?? '').toLowerCase().includes(q),
    );
  }, [rows, search]);

  const typeLabel = (typ: MovementType) =>
    typ === 'receipt'
      ? t('movementReceipt')
      : typ === 'issue'
        ? t('movementIssue')
        : t('movementTransfer');

  const typeBadge = (typ: MovementType) => {
    const classes: Record<MovementType, string> = {
      receipt: 'bg-emerald-500/15 text-emerald-700 border-emerald-300',
      issue: 'bg-rose-500/15 text-rose-700 border-rose-300',
      transfer: 'bg-amber-500/15 text-amber-700 border-amber-300',
    };
    return (
      <Badge variant="outline" className={classes[typ]}>
        {typeLabel(typ)}
      </Badge>
    );
  };

  const statusBadge = (s: MovementStatus) => {
    if (s === 'posted') return <Badge className="bg-emerald-600">{t('movementPosted')}</Badge>;
    if (s === 'cancelled') return <Badge variant="destructive">{t('movementCancelled')}</Badge>;
    return <Badge variant="secondary">{t('movementDraft')}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        <PageHeader
          title={t('stockMovements')}
          subtitle={t('stockMovementsDesc')}
          icon={ArrowLeftRight}
          actions={
            canManage ? (
              <Button onClick={() => navigate('/inventory/movements/new')}>
                <Plus className="w-4 h-4 me-1.5" />
                {t('newMovement')}
              </Button>
            ) : undefined
          }
        />

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mt-4">
          <TabsList>
            <TabsTrigger value="all">{t('all')}</TabsTrigger>
            <TabsTrigger value="receipt">{t('movementReceipt')}</TabsTrigger>
            <TabsTrigger value="issue">{t('movementIssue')}</TabsTrigger>
            <TabsTrigger value="transfer">{t('movementTransfer')}</TabsTrigger>
          </TabsList>
        </Tabs>

        <Card className="p-4 mt-4">
          <div className="relative max-w-sm mb-4">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('search')}
              className="ps-10"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin me-2" />
              {t('loading')}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{t('noRecordsInv')}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('movementNo')}</TableHead>
                    <TableHead>{t('movementType')}</TableHead>
                    <TableHead>{t('movementDate')}</TableHead>
                    <TableHead>{t('movementQty')}</TableHead>
                    <TableHead>{t('movementValue')}</TableHead>
                    <TableHead>{t('movementStatus')}</TableHead>
                    <TableHead className="text-end">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono font-medium">{r.movement_no}</TableCell>
                      <TableCell>{typeBadge(r.movement_type)}</TableCell>
                      <TableCell>
                        {format(new Date(r.movement_date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>{Number(r.total_qty).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</TableCell>
                      <TableCell>
                        {Number(r.total_value).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell className="text-end">
                        <Button asChild size="sm" variant="ghost">
                          <Link to={`/inventory/movements/${r.id}`}>
                            <FileText className="w-4 h-4 me-1" />
                            {t('view')}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
