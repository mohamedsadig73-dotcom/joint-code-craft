import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { exportDeclarationsToExcel } from '@/utils/excelExport';
import { exportDeclarationsToPDF } from '@/utils/pdfExport';
import { Declaration } from '@/types/declarations';
import { statusLabels } from '@/constants/statusLabels';

interface ExportToolbarProps {
  declarations: Declaration[];
  totalCount?: number;
  disabled?: boolean;
}

export function ExportToolbar({ declarations, totalCount, disabled }: ExportToolbarProps) {
  const { t, language } = useLanguage();
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  const prepareExportData = () => {
    return declarations.map((dec) => ({
      id: dec.id,
      type: dec.type,
      sender: dec.sender?.username || t('unknown'),
      status: language === 'ar' ? statusLabels[dec.status] || dec.status : dec.status,
      created_at: new Date(dec.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US'),
    }));
  };

  const handleExcelExport = async () => {
    if (declarations.length === 0) {
      toast({
        title: t('error'),
        description: t('noDataToExport'),
        variant: 'destructive',
      });
      return;
    }

    setExporting('excel');
    try {
      const data = prepareExportData();
      const fileName = exportDeclarationsToExcel(data, 'declarations');
      toast({
        title: t('success'),
        description: `${t('exportedSuccessfully')}: ${fileName}`,
      });
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setExporting(null);
    }
  };

  const handlePdfExport = async () => {
    if (declarations.length === 0) {
      toast({
        title: t('error'),
        description: t('noDataToExport'),
        variant: 'destructive',
      });
      return;
    }

    setExporting('pdf');
    try {
      const data = prepareExportData();
      const doc = exportDeclarationsToPDF(data, t('declarationsReport'));
      const timestamp = new Date().toISOString().split('T')[0];
      doc.save(`declarations_${timestamp}.pdf`);
      toast({
        title: t('success'),
        description: t('exportedSuccessfully'),
      });
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setExporting(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={disabled || exporting !== null}
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">{t('export')}</span>
          {totalCount !== undefined && totalCount > 0 && (
            <span className="text-xs text-muted-foreground">({totalCount})</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem 
          onClick={handleExcelExport}
          disabled={exporting !== null}
          className="gap-2 cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 text-green-600" />
          {t('exportToExcel')}
          {exporting === 'excel' && <Loader2 className="w-3 h-3 animate-spin ms-auto" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={handlePdfExport}
          disabled={exporting !== null}
          className="gap-2 cursor-pointer"
        >
          <FileText className="w-4 h-4 text-red-600" />
          {t('exportToPDF')}
          {exporting === 'pdf' && <Loader2 className="w-3 h-3 animate-spin ms-auto" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
