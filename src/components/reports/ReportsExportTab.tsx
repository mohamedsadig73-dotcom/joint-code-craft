import { memo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileSpreadsheet, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay } from 'date-fns';
import { statusLabels, statusLabelsEn } from '@/constants/statusLabels';
import { toGregorianDate } from '@/utils/dateUtils';
import { exportDeclarationsToExcel } from '@/utils/excelExport';
import { exportDeclarationsToPDFSecure } from '@/utils/pdfExportSecure';

interface Props {
  dateFrom: Date;
  dateTo: Date;
  totalDeclarations: number;
}

export const ReportsExportTab = memo(function ReportsExportTab({ dateFrom, dateTo, totalDeclarations }: Props) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const isAr = language === 'ar';
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  const fetchAndFormat = async () => {
    const from = startOfDay(dateFrom).toISOString();
    const to = endOfDay(dateTo).toISOString();
    const { data, error } = await supabase.from('declarations')
      .select('*, sender:profiles!sender_id(username)')
      .is('deleted_at', null)
      .gte('created_at', from)
      .lte('created_at', to)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const labels = isAr ? statusLabels : statusLabelsEn;
    return (data || []).map(d => ({
      id: d.id, type: d.type,
      sender: (d.sender as any)?.username || t('unknown'),
      status: labels[d.status] || d.status,
      created_at: toGregorianDate(d.created_at),
    }));
  };

  const handleExport = async (type: 'excel' | 'pdf') => {
    setExporting(type);
    try {
      const formatted = await fetchAndFormat();
      if (type === 'excel') {
        await exportDeclarationsToExcel(formatted, isAr ? 'تقرير_الإقرارات' : 'Declarations_Report');
      } else {
        await exportDeclarationsToPDFSecure(formatted, 'Declarations Report');
      }
      toast({ title: t('success'), description: t('exportSuccess') });
    } catch (error: any) {
      toast({ variant: 'destructive', title: t('error'), description: error.message });
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="w-5 h-5 text-primary" />{t('exportOptions')}
          </CardTitle>
          <CardDescription>
            {isAr
              ? `تصدير ${totalDeclarations} إقرار من ${format(dateFrom, 'yyyy-MM-dd')} إلى ${format(dateTo, 'yyyy-MM-dd')}`
              : `Export ${totalDeclarations} declarations from ${format(dateFrom, 'yyyy-MM-dd')} to ${format(dateTo, 'yyyy-MM-dd')}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Excel Card */}
            <button
              onClick={() => handleExport('excel')}
              disabled={exporting !== null}
              className="group relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-border hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all duration-200 disabled:opacity-50"
            >
              <div className="p-4 rounded-2xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                {exporting === 'excel' ? <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /> : <FileSpreadsheet className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />}
              </div>
              <div className="text-center">
                <p className="font-semibold">{isAr ? 'تصدير Excel' : 'Export Excel'}</p>
                <p className="text-xs text-muted-foreground mt-1">{isAr ? 'ملف جدول بيانات .xlsx' : 'Spreadsheet .xlsx file'}</p>
              </div>
              <Badge variant="secondary" className="text-xs">{totalDeclarations} {isAr ? 'سجل' : 'records'}</Badge>
            </button>

            {/* PDF Card */}
            <button
              onClick={() => handleExport('pdf')}
              disabled={exporting !== null}
              className="group relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-border hover:border-red-500/50 hover:bg-red-500/5 transition-all duration-200 disabled:opacity-50"
            >
              <div className="p-4 rounded-2xl bg-red-500/10 group-hover:bg-red-500/20 transition-colors">
                {exporting === 'pdf' ? <Loader2 className="w-8 h-8 text-red-600 animate-spin" /> : <FileText className="w-8 h-8 text-red-600 dark:text-red-400" />}
              </div>
              <div className="text-center">
                <p className="font-semibold">{isAr ? 'تصدير PDF' : 'Export PDF'}</p>
                <p className="text-xs text-muted-foreground mt-1">{isAr ? 'تقرير رسمي .pdf' : 'Official report .pdf'}</p>
              </div>
              <Badge variant="secondary" className="text-xs">{totalDeclarations} {isAr ? 'سجل' : 'records'}</Badge>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
