import { useEffect, useMemo, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Tag, Ruler, FolderTree, ShieldCheck, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUomDictionary, useItemCategories, useNamingRules } from '@/hooks/useNamingSystem';
import { supabase } from '@/integrations/supabase/client';

export default function ItemNamingSystem() {
  const { t, language } = useLanguage();
  const { data: uoms } = useUomDictionary();
  const { data: cats, mainCategories, subCategories } = useItemCategories();
  const { rules } = useNamingRules();
  const [stats, setStats] = useState({ total: 0, withRef: 0, withCat: 0, avgScore: 0 });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('items_master')
        .select('internal_ref, category_id, naming_quality_score', { count: 'exact' })
        .limit(5000);
      if (data) {
        const total = data.length;
        const withRef = data.filter((r: any) => !!r.internal_ref).length;
        const withCat = data.filter((r: any) => !!r.category_id).length;
        const sum = data.reduce((a: number, r: any) => a + (r.naming_quality_score ?? 0), 0);
        setStats({ total, withRef, withCat, avgScore: total ? Math.round(sum / total) : 0 });
      }
    })();
  }, []);

  const formatRule = useMemo(() => {
    try {
      return typeof rules.format === 'string' ? rules.format : JSON.stringify(rules.format);
    } catch {
      return '[BRAND]-[UOM]-[SPEC]-[ITEM_NAME]-[CAT]';
    }
  }, [rules]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <PageHeader
          title={t('namingSystemTitle')}
          description={t('namingSystemDesc')}
          icon={Tag}
        />

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <KpiCard label={t('totalItems')} value={stats.total.toLocaleString('en-US')} />
          <KpiCard label={t('withInternalRef')} value={`${stats.withRef.toLocaleString('en-US')}`} sub={pct(stats.withRef, stats.total)} />
          <KpiCard label={t('categorized')} value={`${stats.withCat.toLocaleString('en-US')}`} sub={pct(stats.withCat, stats.total)} />
          <KpiCard label={t('avgQualityScore')} value={`${stats.avgScore}/100`} accent />
        </div>

        <Tabs defaultValue="format" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="format"><Sparkles className="w-4 h-4 me-2" />{t('namingFormat')}</TabsTrigger>
            <TabsTrigger value="uom"><Ruler className="w-4 h-4 me-2" />{t('uomDictionary')}</TabsTrigger>
            <TabsTrigger value="categories"><FolderTree className="w-4 h-4 me-2" />{t('categoryTree')}</TabsTrigger>
            <TabsTrigger value="rules"><ShieldCheck className="w-4 h-4 me-2" />{t('validationRules')}</TabsTrigger>
          </TabsList>

          <TabsContent value="format" className="mt-4">
            <Card>
              <CardHeader><CardTitle>{t('standardNamingFormat')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-muted font-mono text-center text-lg" dir="ltr">
                  {formatRule}
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <ExampleBox title={t('exampleTv')} code="ELEC-تلفزيون-63بوصة-PCS-Samsung" />
                  <ExampleBox title={t('exampleDecor')} code="FUR-DEC-00184-SZ" />
                </div>
                <div className="text-sm text-muted-foreground leading-7">
                  <p>• {t('namingTip1')}</p>
                  <p>• {t('namingTip2')}</p>
                  <p>• {t('namingTip3')}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="uom" className="mt-4">
            <Card>
              <CardHeader><CardTitle>{t('uomDictionary')} ({uoms.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {uoms.map((u) => (
                    <div key={u.id} className="p-3 rounded-lg border border-border/40 bg-card/50 text-center">
                      <Badge variant="outline" className="font-mono mb-2">{u.code}</Badge>
                      <div className="text-sm">{language === 'ar' ? u.name_ar : u.name_en}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="mt-4">
            <Card>
              <CardHeader><CardTitle>{t('categoryTree')} ({cats.length})</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {mainCategories.map((m) => (
                  <div key={m.id} className="border-s-2 border-primary/30 ps-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="font-mono">{m.code}</Badge>
                      <span className="font-semibold">{language === 'ar' ? m.name_ar : m.name_en}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      {subCategories(m.id).map((s) => (
                        <span key={s.id} className="px-2 py-1 rounded bg-muted/50">
                          <span className="font-mono text-xs me-1">{s.code}</span>
                          {language === 'ar' ? s.name_ar : s.name_en}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules" className="mt-4">
            <Card>
              <CardHeader><CardTitle>{t('validationRules')}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(rules).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between p-3 rounded border border-border/40">
                      <div>
                        <div className="font-medium font-mono text-sm">{k}</div>
                        <div className="text-xs text-muted-foreground">{ruleLabel(k, language)}</div>
                      </div>
                      <Badge variant="secondary" className="font-mono">{String(typeof v === 'string' ? v : JSON.stringify(v))}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function pct(n: number, d: number) {
  if (!d) return '0%';
  return `${Math.round((n / d) * 100)}%`;
}

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <Card className={accent ? 'border-primary/30' : ''}>
      <CardContent className="pt-6">
        <div className="text-xs text-muted-foreground mb-1">{label}</div>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function ExampleBox({ title, code }: { title: string; code: string }) {
  return (
    <div className="p-3 rounded-lg border border-border/40 bg-muted/30">
      <div className="text-xs text-muted-foreground mb-1">{title}</div>
      <div className="font-mono text-sm" dir="ltr">{code}</div>
    </div>
  );
}

function ruleLabel(key: string, lang: 'ar' | 'en'): string {
  const map: Record<string, { ar: string; en: string }> = {
    format: { ar: 'الصيغة القياسية لاسم الصنف', en: 'Standard item-name format' },
    fuzzy_threshold: { ar: 'عتبة التشابه لاكتشاف المكررات', en: 'Similarity threshold for duplicates' },
    require_approval_for_new: { ar: 'اشتراط الاعتماد للأصناف الجديدة', en: 'Require approval for new items' },
    arabic_required: { ar: 'الاسم العربي إلزامي', en: 'Arabic name required' },
    english_required: { ar: 'الاسم الإنجليزي اختياري/إلزامي', en: 'English name required' },
  };
  return map[key]?.[lang] ?? key;
}