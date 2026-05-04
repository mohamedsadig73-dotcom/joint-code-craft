import { useEffect, useState, useCallback } from 'react';
import { Navigation } from '@/components/Navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ShieldCheck, Check, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface PendingItem {
  id: string;
  part_no: string;
  description: string;
  name_ar: string | null;
  approval_status: 'draft' | 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
}

export default function ItemApprovals({ embedded = false }: { embedded?: boolean } = {}) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [rows, setRows] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('items_master')
      .select('id, part_no, description, name_ar, approval_status, rejection_reason, created_at')
      .eq('approval_status', tab)
      .order('created_at', { ascending: false })
      .limit(200);
    setRows((data as any) || []);
    setLoading(false);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const decide = async (id: string, decision: 'approved' | 'rejected') => {
    const reason = decision === 'rejected' ? (window.prompt('سبب الرفض / Reason') || '') : null;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('items_master').update({
      approval_status: decision,
      approved_by: user?.id,
      approved_at: new Date().toISOString(),
      rejection_reason: reason,
      is_active: decision === 'approved',
    }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(decision === 'approved' ? '✓' : '✕');
    load();
  };

  const body = (
    <>
      {!embedded && (
        <PageHeader title="اعتماد الأصناف" subtitle="مراجعة وموافقة الأصناف الجديدة" icon={ShieldCheck} />
      )}

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mt-4">
          <TabsList>
            <TabsTrigger value="pending"><Clock className="w-4 h-4 me-1.5" />قيد الانتظار</TabsTrigger>
            <TabsTrigger value="approved"><Check className="w-4 h-4 me-1.5" />معتمد</TabsTrigger>
            <TabsTrigger value="rejected"><X className="w-4 h-4 me-1.5" />مرفوض</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4 space-y-2">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)
            ) : rows.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">لا توجد عناصر</div>
            ) : (
              rows.map(r => (
                <Card key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm font-bold">{r.part_no}</div>
                    <div className="text-sm text-muted-foreground">{r.name_ar || r.description}</div>
                    {r.rejection_reason && (
                      <div className="text-xs text-destructive mt-1">سبب الرفض: {r.rejection_reason}</div>
                    )}
                  </div>
                  {tab === 'pending' && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => decide(r.id, 'approved')}><Check className="w-4 h-4 me-1" />اعتماد</Button>
                      <Button size="sm" variant="destructive" onClick={() => decide(r.id, 'rejected')}><X className="w-4 h-4 me-1" />رفض</Button>
                    </div>
                  )}
                  {tab !== 'pending' && (
                    <Badge variant={tab === 'approved' ? 'default' : 'destructive'}>
                      {tab === 'approved' ? 'معتمد' : 'مرفوض'}
                    </Badge>
                  )}
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
    </>
  );

  if (embedded) return body;
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        {body}
      </main>
    </div>
  );
}