import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navigation } from '@/components/Navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Search, Calendar, Users, FileText, Trash2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/utils/dateUtils';
import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';

export default function HolidayAttendance() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isRTL = language === 'ar';
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const [sheets, setSheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadSheets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('holiday_sheets')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSheets(data || []);
    } catch (error: any) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => { loadSheets(); }, [loadSheets]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from('holiday_sheets').delete().eq('id', deleteId);
      if (error) throw error;
      toast({ title: t('success'), description: t('deletedSuccessfully') });
      loadSheets();
    } catch (error: any) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    } finally {
      setDeleteId(null);
    }
  };

  const filtered = sheets.filter(s =>
    s.warehouse_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.holiday_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.warehouse_number?.includes(search)
  );

  const breadcrumbs = [
    { label: t('holidayAttendance') }
  ];

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navigation />
      <main className="pt-20 pb-24 md:pb-8 px-4 sm:px-6 max-w-7xl mx-auto">
        <Breadcrumbs items={breadcrumbs} className="mb-4" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('holidayAttendance')}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t('holidayAttendanceDesc')}</p>
          </div>
          {isAdmin && (
            <Button onClick={() => navigate('/holiday-attendance/new')} className="gap-2">
              <Plus className="w-4 h-4" />
              {t('newSheet')}
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="ps-10"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-primary/10 rounded-lg p-2">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{sheets.length}</p>
                <p className="text-xs text-muted-foreground">{t('totalSheets')}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sheets list */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted/50 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t('noSheetsFound')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(sheet => (
              <Card key={sheet.id} className="hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => navigate(`/holiday-attendance/${sheet.id}`)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground truncate">
                          {sheet.warehouse_name} ({sheet.warehouse_number})
                        </h3>
                      </div>
                      <p className="text-sm text-primary font-medium mb-1">{sheet.holiday_name}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(sheet.period_start)} - {formatDate(sheet.period_end)}
                        </span>
                        {sheet.month_year && (
                          <span>{sheet.month_year}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); navigate(`/holiday-attendance/${sheet.id}`); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {isAdmin && (
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={e => { e.stopPropagation(); setDeleteId(sheet.id); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <DeleteConfirmationDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t('deleteSheet')}
        description={t('deleteSheetConfirm')}
      />
    </div>
  );
}
