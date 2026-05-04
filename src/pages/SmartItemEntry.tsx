import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, CheckCircle2, Sparkles, Loader2, RefreshCw, Wand2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  useUomDictionary, useItemCategories, useFindSimilarItems,
  generateInternalRef, type SimilarItem,
} from '@/hooks/useNamingSystem';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

function useDebounced<T>(value: T, delay = 400): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

export default function SmartItemEntry() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isAr = language === 'ar';

  const { data: uoms } = useUomDictionary();
  const { mainCategories, subCategories } = useItemCategories();
  const findSimilar = useFindSimilarItems();
  const { user } = useAuth() as any;
  const isPrivileged = user?.role === 'admin' || user?.role === 'manager';

  const [categoryId, setCategoryId] = useState<string>('');
  const [subCategoryId, setSubCategoryId] = useState<string>('');
  const [uomDictId, setUomDictId] = useState<string>('');
  const [brand, setBrand] = useState('');
  const [spec, setSpec] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [partNo, setPartNo] = useState('');
  const [description, setDescription] = useState('');
  const [internalRef, setInternalRef] = useState<string | null>(null);
  const [refLoading, setRefLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [similar, setSimilar] = useState<SimilarItem[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [acceptedDuplicate, setAcceptedDuplicate] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

  const subCats = useMemo(
    () => (categoryId ? subCategories(categoryId) : []),
    [categoryId, subCategories],
  );

  // Reset sub-category when parent changes
  useEffect(() => { setSubCategoryId(''); setInternalRef(null); }, [categoryId]);
  useEffect(() => { setInternalRef(null); }, [subCategoryId]);

  // Auto-generate internal_ref preview when category picked
  const previewRef = async () => {
    const cat = mainCategories.find((c) => c.id === categoryId);
    if (!cat) return;
    const sub = subCats.find((s) => s.id === subCategoryId);
    setRefLoading(true);
    const ref = await generateInternalRef(cat.code, sub?.code ?? null);
    setInternalRef(ref);
    setRefLoading(false);
  };

  // Auto-build standardized name from parts
  const standardizedName = useMemo(() => {
    const uom = uoms.find((u) => u.id === uomDictId);
    const parts = [
      brand?.trim().toUpperCase(),
      uom?.code,
      spec?.trim(),
      nameAr?.trim() || nameEn?.trim(),
    ].filter(Boolean);
    return parts.join(' - ');
  }, [brand, spec, nameAr, nameEn, uomDictId, uoms]);

  // QR preview payload (mirrors DB trigger format)
  const qrPreview = useMemo(() => {
    if (!internalRef && !partNo) return '';
    return `ITEM:${internalRef ?? partNo}|PN:${partNo}`;
  }, [internalRef, partNo]);

  const handleAiSuggest = async () => {
    if (aiBusy) return;
    if (!partNo && !nameAr && !brand) {
      toast({
        title: isAr ? 'يلزم إدخال بيانات' : 'Need input',
        description: isAr ? 'أدخل رقم القطعة أو الاسم أو الماركة' : 'Enter part no, name, or brand',
        variant: 'destructive',
      });
      return;
    }
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-item-details', {
        body: {
          part_no: partNo, name_ar: nameAr, name_en: nameEn, brand,
          categories: mainCategories.map((c) => ({ code: c.code, name_ar: c.name_ar, name_en: c.name_en })),
        },
      });
      if (error) throw error;
      const s = data as {
        name_en?: string; name_ar?: string;
        description_en?: string; description_ar?: string;
        category_code?: string | null;
      };
      // Safety net: enforce SHORT canonical names client-side even if AI
      // ignores the prompt and returns a long descriptive sentence.
      const sanitizeName = (raw?: string): string => {
        if (!raw) return '';
        let v = raw.trim();
        // Cut at first sentence-breaking punctuation
        v = v.split(/[،,:.;\(\)\[\]]/)[0].trim();
        // Drop trailing digits/part numbers tokens
        const words = v.split(/\s+/).filter(w => !/^\d+$/.test(w));
        // Hard cap at 4 words
        return words.slice(0, 4).join(' ').trim();
      };
      // Names: short canonical labels only
      const cleanAr = sanitizeName(s.name_ar);
      const cleanEn = sanitizeName(s.name_en);
      if (cleanAr && !nameAr) setNameAr(cleanAr);
      if (cleanEn && !nameEn) setNameEn(cleanEn);
      // Description: longer text, kept separate
      if (!description && (s.description_ar || s.description_en)) {
        setDescription(isAr
          ? (s.description_ar || s.description_en || '')
          : (s.description_en || s.description_ar || ''));
      }
      if (s.category_code) {
        const matched = mainCategories.find((c) => c.code === s.category_code);
        if (matched) setCategoryId(matched.id);
      }
      toast({ title: isAr ? 'تم الاقتراح' : 'Suggested', description: isAr ? 'تم تعبئة الحقول' : 'Fields populated' });
    } catch (e: any) {
      const status = e?.context?.status;
      const msg = status === 429
        ? (isAr ? 'تجاوز حد الاستخدام' : 'Rate limit exceeded')
        : status === 402
        ? (isAr ? 'يلزم شحن رصيد الذكاء الاصطناعي' : 'AI credits required')
        : (e?.message || 'Failed');
      toast({ title: isAr ? 'فشل الاقتراح' : 'Suggest failed', description: msg, variant: 'destructive' });
    } finally {
      setAiBusy(false);
    }
  };

  // Live fuzzy match
  const debouncedName = useDebounced(nameAr || nameEn, 500);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!debouncedName || debouncedName.trim().length < 3) {
        setSimilar([]); return;
      }
      setSimilarLoading(true);
      const res = await findSimilar(debouncedName, categoryId || null, 0.45, 5);
      if (!cancelled) { setSimilar(res); setAcceptedDuplicate(false); }
      setSimilarLoading(false);
    })();
    return () => { cancelled = true; };
  }, [debouncedName, categoryId, findSimilar]);

  // Quality score (preview, mirrors DB function)
  const qualityScore = useMemo(() => {
    let s = 0;
    if (nameAr || nameEn) s += 20;
    if (categoryId) s += 15;
    if (subCategoryId) s += 15;
    if (uomDictId) s += 15;
    if (brand) s += 10;
    if (spec) s += 10;
    if (partNo) s += 10;
    if (description && description.length > 10) s += 5;
    return Math.min(100, s);
  }, [nameAr, nameEn, categoryId, subCategoryId, uomDictId, brand, spec, partNo, description]);

  const blocking = similar.some((s) => s.similarity >= 0.85) && !acceptedDuplicate;
  const canSubmit =
    !!categoryId && !!uomDictId && !!partNo && (!!nameAr || !!nameEn) && !blocking;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const cat = mainCategories.find((c) => c.id === categoryId);
    const sub = subCats.find((s) => s.id === subCategoryId);
    const ref = internalRef ?? (cat ? await generateInternalRef(cat.code, sub?.code ?? null) : null);
    const uom = uoms.find((u) => u.id === uomDictId);

    const payload: any = {
      part_no: partNo.trim(),
      name_ar: nameAr.trim() || null,
      name_en: nameEn.trim() || null,
      description: description.trim() || standardizedName,
      brand: brand.trim() || null,
      spec: spec.trim() || null,
      category_id: categoryId,
      sub_category_id: subCategoryId || null,
      uom_dict_id: uomDictId,
      default_unit: (uom?.code || 'PCS') as any,
      internal_ref: ref,
      naming_quality_score: qualityScore,
      approval_status: isPrivileged ? 'approved' : 'pending',
      is_active: isPrivileged,
    };

    const { data, error } = await supabase
      .from('items_master')
      .insert(payload)
      .select('id')
      .single();

    setSubmitting(false);
    if (error) {
      toast({
        title: isAr ? 'فشل الحفظ' : 'Save failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: isAr ? 'تم الحفظ' : 'Saved',
      description: isAr ? `تم إنشاء الصنف ${ref ?? ''}` : `Item created ${ref ?? ''}`,
    });
    navigate(`/boxes/items/${data.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-6 space-y-6">
        <PageHeader
          title={isAr ? 'إدخال صنف ذكي' : 'Smart Item Entry'}
          subtitle={isAr
            ? 'توليد تلقائي للاسم الموحد والكود الداخلي + كشف فوري للمكررات'
            : 'Auto-generate standardized name & internal ref + live duplicate detection'}
          icon={Sparkles}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Form */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader><CardTitle>{isAr ? 'التصنيف' : 'Classification'}</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>{isAr ? 'التصنيف الرئيسي *' : 'Main Category *'}</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger><SelectValue placeholder={isAr ? 'اختر' : 'Select'} /></SelectTrigger>
                    <SelectContent>
                      {mainCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.code} — {isAr ? c.name_ar : (c.name_en || c.name_ar)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>{isAr ? 'تصنيف فرعي' : 'Sub-Category'}</Label>
                  <Select value={subCategoryId} onValueChange={setSubCategoryId} disabled={!categoryId}>
                    <SelectTrigger><SelectValue placeholder={isAr ? 'اختر' : 'Select'} /></SelectTrigger>
                    <SelectContent>
                      {subCats.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.code} — {isAr ? c.name_ar : (c.name_en || c.name_ar)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>{isAr ? 'وحدة القياس *' : 'Unit of Measure *'}</Label>
                  <Select value={uomDictId} onValueChange={setUomDictId}>
                    <SelectTrigger><SelectValue placeholder={isAr ? 'اختر' : 'Select'} /></SelectTrigger>
                    <SelectContent>
                      {uoms.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.code} — {isAr ? u.name_ar : (u.name_en || u.name_ar)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 flex items-end gap-2">
                  <div className="flex-1">
                    <Label>{isAr ? 'الكود الداخلي' : 'Internal Ref'}</Label>
                    <Input readOnly value={internalRef ?? ''} placeholder="CAT-SUB-00001" />
                  </div>
                  <Button type="button" variant="outline" size="icon"
                    disabled={!categoryId || refLoading} onClick={previewRef}>
                    {refLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>{isAr ? 'بيانات الصنف' : 'Item Details'}</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2 flex justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={handleAiSuggest} disabled={aiBusy}>
                    {aiBusy ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Wand2 className="w-4 h-4 me-2" />}
                    {isAr ? 'اقتراح بالذكاء الاصطناعي' : 'AI Suggest'}
                  </Button>
                </div>
                <div className="space-y-1">
                  <Label>{isAr ? 'رقم القطعة *' : 'Part No *'}</Label>
                  <Input value={partNo} onChange={(e) => setPartNo(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>{isAr ? 'الماركة' : 'Brand'}</Label>
                  <Input value={brand} onChange={(e) => setBrand(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>{isAr ? 'الاسم بالعربية' : 'Arabic Name'}</Label>
                  <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl" />
                </div>
                <div className="space-y-1">
                  <Label>{isAr ? 'الاسم بالإنجليزية' : 'English Name'}</Label>
                  <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>{isAr ? 'المواصفات (مقاس/لون/قدرة)' : 'Specification (size/color/power)'}</Label>
                  <Input value={spec} onChange={(e) => setSpec(e.target.value)} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>{isAr ? 'وصف إضافي' : 'Additional Description'}</Label>
                  <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
              </CardContent>
            </Card>

            {/* Live duplicate alert */}
            {similarLoading && (
              <Alert><Loader2 className="w-4 h-4 animate-spin" />
                <AlertDescription>{isAr ? 'جارٍ البحث عن مكررات...' : 'Searching for duplicates...'}</AlertDescription>
              </Alert>
            )}
            {!similarLoading && similar.length > 0 && (
              <Alert variant={blocking ? 'destructive' : 'default'}>
                <AlertTriangle className="w-4 h-4" />
                <AlertTitle>
                  {blocking
                    ? (isAr ? 'مكرر محتمل عالي التشابه' : 'High-similarity duplicate detected')
                    : (isAr ? 'أصناف مشابهة موجودة' : 'Similar items exist')}
                </AlertTitle>
                <AlertDescription className="space-y-2">
                  <ul className="text-sm space-y-1 mt-2">
                    {similar.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-2">
                        <span>
                          {s.internal_ref ? <Badge variant="outline" className="me-2">{s.internal_ref}</Badge> : null}
                          {isAr ? (s.name_ar || s.name_en) : (s.name_en || s.name_ar)}
                        </span>
                        <Badge variant={s.similarity >= 0.85 ? 'destructive' : 'secondary'}>
                          {Math.round(s.similarity * 100)}%
                        </Badge>
                      </li>
                    ))}
                  </ul>
                  {blocking && (
                    <Button size="sm" variant="outline" onClick={() => setAcceptedDuplicate(true)}>
                      {isAr ? 'متابعة على أي حال' : 'Continue anyway'}
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Side panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>{isAr ? 'الاسم الموحد (معاينة)' : 'Standardized Name (preview)'}</CardTitle></CardHeader>
              <CardContent>
                <div className="rounded-md bg-muted p-3 text-sm font-mono break-words min-h-12">
                  {standardizedName || (isAr ? 'سيتم البناء تلقائياً...' : 'Auto-built as you type...')}
                </div>
              </CardContent>
            </Card>
            {qrPreview && (
              <Card>
                <CardHeader><CardTitle>{isAr ? 'رمز QR (معاينة)' : 'QR Code (preview)'}</CardTitle></CardHeader>
                <CardContent className="flex flex-col items-center gap-2">
                  <div className="bg-white p-2 rounded">
                    <QRCodeSVG value={qrPreview} size={128} />
                  </div>
                  <code className="text-[10px] text-muted-foreground break-all text-center">{qrPreview}</code>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader><CardTitle>{isAr ? 'جودة البيانات' : 'Data Quality'}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{isAr ? 'النتيجة' : 'Score'}</span>
                  <Badge variant={qualityScore >= 80 ? 'default' : qualityScore >= 50 ? 'secondary' : 'destructive'}>
                    {qualityScore}/100
                  </Badge>
                </div>
                <Progress value={qualityScore} />
                {qualityScore >= 80 && (
                  <div className="flex items-center gap-1 text-xs text-emerald-600">
                    <CheckCircle2 className="w-3 h-3" /> {isAr ? 'جودة ممتازة' : 'Excellent quality'}
                  </div>
                )}
              </CardContent>
            </Card>

            <Button className="w-full" disabled={!canSubmit || submitting} onClick={handleSubmit}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin me-2" />}
              {isAr ? 'حفظ الصنف' : 'Save Item'}
            </Button>
            {!canSubmit && (
              <p className="text-xs text-muted-foreground">
                {blocking
                  ? (isAr ? 'يجب التعامل مع المكرر أولاً' : 'Resolve the duplicate warning first')
                  : (isAr ? 'أكمل الحقول المطلوبة (*)' : 'Complete the required fields (*)')}
              </p>
            )}
            {canSubmit && !isPrivileged && (
              <p className="text-xs text-amber-600">
                {isAr ? 'سيتم إرسال الصنف للاعتماد قبل التفعيل' : 'Item will be sent for approval before activation'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}