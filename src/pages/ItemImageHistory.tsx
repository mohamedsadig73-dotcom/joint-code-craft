import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigation } from '@/components/Navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, History, X } from 'lucide-react';
import { useItemImageHistory } from '@/hooks/useItemImageHistory';
import { ItemImageHistoryList } from '@/components/boxes/items/ItemImageHistoryList';
import { supabase } from '@/integrations/supabase/client';

const ALL = '__all__';
type ActionFilter = 'upload' | 'replace' | 'remove' | typeof ALL;

export default function ItemImageHistory() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [userId, setUserId] = useState<string>(ALL);
  const [actionFilter, setActionFilter] = useState<ActionFilter>(ALL);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [users, setUsers] = useState<Array<{ id: string; username: string }>>([]);

  const { entries, loading } = useItemImageHistory({
    limit: 200,
    userId: userId === ALL ? undefined : userId,
    action: actionFilter === ALL ? undefined : actionFilter,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  });

  // Load distinct users that have appeared in the image history (small list).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username')
        .order('username', { ascending: true })
        .limit(200);
      if (!cancelled && data) setUsers(data);
    })();
    return () => { cancelled = true; };
  }, []);

  const hasFilters = useMemo(
    () => userId !== ALL || actionFilter !== ALL || !!fromDate || !!toDate,
    [userId, actionFilter, fromDate, toDate]
  );

  const clear = () => {
    setUserId(ALL);
    setActionFilter(ALL);
    setFromDate('');
    setToDate('');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8 space-y-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/boxes/items')} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          {t('back')}
        </Button>
        <PageHeader
          title={t('itemImageHistory')}
          subtitle={t('itemImageHistoryDesc')}
          icon={History}
        />

        <Card>
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">{t('filterByUser')}</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('allUsers')}</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('filterByAction')}</Label>
              <Select value={actionFilter} onValueChange={(v) => setActionFilter(v as ActionFilter)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('allActions')}</SelectItem>
                  <SelectItem value="upload">{t('imageAction_upload')}</SelectItem>
                  <SelectItem value="replace">{t('imageAction_replace')}</SelectItem>
                  <SelectItem value="remove">{t('imageAction_remove')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('filterFrom')}</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('filterTo')}</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clear}
                disabled={!hasFilters}
                className="w-full gap-1.5"
              >
                <X className="w-4 h-4" />
                {t('clearFilters')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <ItemImageHistoryList entries={entries} loading={loading} showItem />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
