import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck, Save, ShieldAlert } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDuplicateRules } from '@/hooks/useDuplicateRules';
import { ALL_DUPLICATE_FIELDS, DEFAULT_DUPLICATE_RULES, type DuplicateField } from '@/utils/boxDuplicateAnalysis';
import { useToast } from '@/hooks/use-toast';

export default function BoxesDuplicateRules() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { rules, loading, saving, saveRules } = useDuplicateRules();
  const { toast } = useToast();
  const [draft, setDraft] = useState(rules);

  useEffect(() => { setDraft(rules); }, [rules]);

  const isAdmin = user?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold">{t('accessDenied')}</h2>
          </Card>
        </main>
      </div>
    );
  }

  const toggleField = (field: DuplicateField) => {
    setDraft((d) => ({
      ...d,
      fields: d.fields.includes(field) ? d.fields.filter((f) => f !== field) : [...d.fields, field],
    }));
  };

  const handleSave = async () => {
    if (draft.fields.length < 2) {
      toast({ title: t('error'), description: t('duplicateRulesMinFields'), variant: 'destructive' });
      return;
    }
    const ok = await saveRules(draft);
    toast({
      title: ok ? t('success') : t('error'),
      description: ok ? t('saved') : t('errorOccurred'),
      variant: ok ? 'default' : 'destructive',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        <PageHeader title={t('duplicateRulesSettings')} subtitle={t('duplicateRulesSettingsDesc')} icon={ShieldCheck} />

        {loading ? (
          <Card className="p-8 text-center mt-4">
            <Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
          </Card>
        ) : (
          <Card className="p-5 mt-4 space-y-5">
            <div>
              <h3 className="font-semibold mb-1">{t('duplicateRulesFieldsTitle')}</h3>
              <p className="text-xs text-muted-foreground mb-3">{t('duplicateRulesFieldsDesc')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ALL_DUPLICATE_FIELDS.map((f) => {
                  const checked = draft.fields.includes(f);
                  return (
                    <label
                      key={f}
                      htmlFor={`fld-${f}`}
                      className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                        checked ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'
                      }`}
                    >
                      <Checkbox id={`fld-${f}`} checked={checked} onCheckedChange={() => toggleField(f)} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{t(`dupField_${f}`)}</div>
                        <div className="text-xs text-muted-foreground">{t(`dupFieldDesc_${f}`)}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
              {draft.fields.length < 2 && (
                <p className="text-xs text-destructive mt-2">{t('duplicateRulesMinFields')}</p>
              )}
            </div>

            <div className="flex items-start justify-between gap-4 p-3 rounded-md border border-border">
              <div>
                <Label htmlFor="block-save" className="font-medium">{t('blockOnSaveTitle')}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">{t('blockOnSaveDesc')}</p>
              </div>
              <Switch
                id="block-save"
                checked={draft.block_on_save}
                onCheckedChange={(v) => setDraft((d) => ({ ...d, block_on_save: v }))}
              />
            </div>

            <div className="flex flex-wrap gap-2 justify-between">
              <Button variant="outline" onClick={() => setDraft(DEFAULT_DUPLICATE_RULES)}>
                {t('resetToDefault')}
              </Button>
              <Button onClick={handleSave} disabled={saving || draft.fields.length < 2}>
                {saving ? <Loader2 className="w-4 h-4 me-1.5 animate-spin" /> : <Save className="w-4 h-4 me-1.5" />}
                {t('save')}
              </Button>
            </div>

            <div className="rounded-md bg-muted/40 p-3 text-xs">
              <div className="font-semibold mb-1">{t('duplicateRulesPreview')}</div>
              <code className="block break-all">{draft.fields.join(' + ') || '—'}</code>
              <div className="text-muted-foreground mt-1">
                {draft.block_on_save ? t('blockOnSaveActive') : t('blockOnSaveInactive')}
              </div>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}