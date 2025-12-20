import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Activity, 
  Search, 
  Download,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  RotateCcw,
  ClipboardCheck,
  Package
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type TransactionType = Database['public']['Enums']['wms_transaction_type'];

interface Transaction {
  id: string;
  transaction_type: TransactionType;
  product_id: string;
  from_location_id: string | null;
  to_location_id: string | null;
  quantity: number;
  lot_number: string | null;
  serial_number: string | null;
  reference_type: string | null;
  reference_id: string | null;
  reason: string | null;
  performed_at: string;
  product?: {
    sku: string;
    name: string;
  };
  from_location?: {
    code: string;
  };
  to_location?: {
    code: string;
  };
  performer?: {
    username: string;
  };
}

const transactionTypes: { value: TransactionType; label: { ar: string; en: string }; icon: any; color: string }[] = [
  { value: 'receive', label: { ar: 'استلام', en: 'Receive' }, icon: ArrowDownToLine, color: 'bg-green-500' },
  { value: 'putaway', label: { ar: 'تخزين', en: 'Put Away' }, icon: Package, color: 'bg-blue-500' },
  { value: 'pick', label: { ar: 'التقاط', en: 'Pick' }, icon: ArrowUpFromLine, color: 'bg-orange-500' },
  { value: 'pack', label: { ar: 'تعبئة', en: 'Pack' }, icon: Package, color: 'bg-purple-500' },
  { value: 'ship', label: { ar: 'شحن', en: 'Ship' }, icon: ArrowUpFromLine, color: 'bg-red-500' },
  { value: 'transfer', label: { ar: 'نقل', en: 'Transfer' }, icon: ArrowLeftRight, color: 'bg-cyan-500' },
  { value: 'adjustment', label: { ar: 'تسوية', en: 'Adjustment' }, icon: ClipboardCheck, color: 'bg-yellow-500' },
  { value: 'cycle_count', label: { ar: 'جرد', en: 'Cycle Count' }, icon: ClipboardCheck, color: 'bg-indigo-500' },
  { value: 'return', label: { ar: 'إرجاع', en: 'Return' }, icon: RotateCcw, color: 'bg-pink-500' },
];

export default function WMSTransactions() {
  const { language } = useLanguage();
  const { toast } = useToast();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('wms_transactions')
        .select(`
          *,
          product:wms_products(sku, name),
          from_location:wms_locations!wms_transactions_from_location_id_fkey(code),
          to_location:wms_locations!wms_transactions_to_location_id_fkey(code),
          performer:profiles!wms_transactions_performed_by_fkey(username)
        `)
        .order('performed_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setTransactions(data as any || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const getTransactionTypeInfo = (type: TransactionType) => {
    return transactionTypes.find(t => t.value === type) || transactionTypes[0];
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = 
      tx.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.product?.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.lot_number && tx.lot_number.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = typeFilter === 'all' || tx.transaction_type === typeFilter;
    
    const matchesDate = !dateFilter || 
      new Date(tx.performed_at).toDateString() === new Date(dateFilter).toDateString();
    
    return matchesSearch && matchesType && matchesDate;
  });

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Product', 'SKU', 'From', 'To', 'Quantity', 'Lot', 'Reason'];
    const rows = filteredTransactions.map(tx => [
      new Date(tx.performed_at).toLocaleString(),
      tx.transaction_type,
      tx.product?.name,
      tx.product?.sku,
      tx.from_location?.code || '',
      tx.to_location?.code || '',
      tx.quantity,
      tx.lot_number || '',
      tx.reason || ''
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({
      title: language === 'ar' ? 'تم التصدير' : 'Exported',
      description: language === 'ar' ? 'تم تصدير الحركات بنجاح' : 'Transactions exported successfully',
    });
  };

  // Stats
  const todayCount = transactions.filter(tx => 
    new Date(tx.performed_at).toDateString() === new Date().toDateString()
  ).length;
  const receiveCount = transactions.filter(tx => tx.transaction_type === 'receive').length;
  const shipCount = transactions.filter(tx => tx.transaction_type === 'ship').length;

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="w-6 h-6" />
              {language === 'ar' ? 'سجل الحركات' : 'Transaction History'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'عرض جميع حركات المخزون' : 'View all inventory movements'}
            </p>
          </div>

          <Button variant="outline" className="gap-2" onClick={exportToCSV}>
            <Download className="w-4 h-4" />
            {language === 'ar' ? 'تصدير CSV' : 'Export CSV'}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'حركات اليوم' : "Today's Transactions"}</p>
                  <p className="text-2xl font-bold">{todayCount}</p>
                </div>
                <Activity className="w-8 h-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي الاستلام' : 'Total Receives'}</p>
                  <p className="text-2xl font-bold text-green-600">{receiveCount}</p>
                </div>
                <ArrowDownToLine className="w-8 h-8 text-green-500/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي الشحن' : 'Total Shipments'}</p>
                  <p className="text-2xl font-bold text-orange-600">{shipCount}</p>
                </div>
                <ArrowUpFromLine className="w-8 h-8 text-orange-500/60" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={language === 'ar' ? 'بحث بالمنتج أو الدفعة...' : 'Search by product or lot...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-10"
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={language === 'ar' ? 'نوع الحركة' : 'Transaction Type'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'ar' ? 'جميع الأنواع' : 'All Types'}</SelectItem>
              {transactionTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>{type.label[language]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-[180px]"
          />
        </div>

        {/* Transactions Table */}
        <Card className="glass-card">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-4">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{language === 'ar' ? 'لا توجد حركات' : 'No transactions found'}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                    <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                    <TableHead>{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                    <TableHead>{language === 'ar' ? 'من' : 'From'}</TableHead>
                    <TableHead>{language === 'ar' ? 'إلى' : 'To'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الدفعة' : 'Lot'}</TableHead>
                    <TableHead>{language === 'ar' ? 'بواسطة' : 'By'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => {
                    const typeInfo = getTransactionTypeInfo(tx.transaction_type);
                    const Icon = typeInfo.icon;
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm">
                          {new Date(tx.performed_at).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', {
                            dateStyle: 'short',
                            timeStyle: 'short'
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${typeInfo.color} gap-1`}>
                            <Icon className="w-3 h-3" />
                            {typeInfo.label[language]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{tx.product?.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{tx.product?.sku}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {tx.from_location?.code || '-'}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {tx.to_location?.code || '-'}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {tx.quantity}
                        </TableCell>
                        <TableCell className="text-sm">
                          {tx.lot_number || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {tx.performer?.username || '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
