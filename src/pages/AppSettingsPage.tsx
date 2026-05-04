import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon, Loader2, Save } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useCategories } from '@/hooks/useDataSetup';
import { CategoryTreeSelect } from '@/components/data-setup/CategoryTreeSelect';
import { wmsToast as toast } from '@/lib/wmsToast';

export default function AppSettingsPage() {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const { settings, loading, update, refresh } = useAppSettings();
  const { rows: categories } = useCategories();

  const [categoryRequired, setCategoryRequired] = useState(true);
  const [defaultCategoryId, setDefaultCategoryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (loading) return;
    setCategoryRequired(Boolean(settings['items.category_required']?.required ?? true));
    setDefaultCategoryId((settings['items.default_category_id']?.id ?? null) as string | null);
    setDirty(false);
  }, [loading, settings]);

  const handleSave = async () => {
    setSaving(true);
    const a = await update('items.category_required', { required: categoryRequired });
    const b = await update('items.default_category_id', { id: defaultCategoryId });
    setSaving(false);
    if (a && b) {
      toast.success(isAr ? 'تم حفظ الإعدادات' : 'Settings saved');
      setDirty(false);
      await refresh();
    } else {
      toast.error(isAr ? 'تعذر حفظ بعض الإعدادات (تحقق من صلاحيات المسؤول)' : 'Could not save (admin role required)');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <PageHeader
          title={isAr ? 'إعدادات التطبيق' : 'App Settings'}
          subtitle={isAr ? 'تحكم بسلوك إدخال الأصناف والقيم الافتراضية' : 'Control item entry behaviour and defaults'}
          icon={SettingsIcon}
        />

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>{isAr ? 'إدخال الأصناف' : 'Items Entry'}</CardTitle>
            <CardDescription>
              {isAr
                ? 'هذه الإعدادات تنطبق على جميع المستخدمين عند إنشاء أو تعديل صنف.'
                : 'These settings apply to all users when creating or editing an item.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
                {isAr ? 'تحميل الإعدادات...' : 'Loading settings...'}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-md border p-4">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">
                      {isAr ? 'التصنيف إلزامي' : 'Category required'}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {isAr
                        ? 'منع حفظ الصنف بدون تحديد تصنيف.'
                        : 'Prevent saving an item without selecting a category.'}
                    </p>
                  </div>
                  <Switch
                    checked={categoryRequired}
                    onCheckedChange={(v) => { setCategoryRequired(v); setDirty(true); }}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {isAr ? 'التصنيف الافتراضي' : 'Default category'}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {isAr
                      ? 'يُستخدم تلقائياً عند إنشاء صنف جديد دون تحديد تصنيف.'
                      : 'Used automatically when creating a new item without picking one.'}
                  </p>
                  <CategoryTreeSelect
                    categories={categories}
                    value={defaultCategoryId}
                    onChange={(id) => { setDefaultCategoryId(id); setDirty(true); }}
                  />
                </div>
              </>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} disabled={saving || loading || !dirty}>
                {saving ? <Loader2 className="h-4 w-4 me-1.5 animate-spin" /> : <Save className="h-4 w-4 me-1.5" />}
                {isAr ? 'حفظ الإعدادات' : 'Save settings'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}