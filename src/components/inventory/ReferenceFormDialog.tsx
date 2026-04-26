import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ReferenceRow } from '@/hooks/useReferenceTable';

export interface ExtraField {
  name: string;
  labelKey: string;
  type?: 'text' | 'date' | 'textarea' | 'number';
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  initial?: Partial<ReferenceRow> | null;
  extraFields?: ExtraField[];
  onSubmit: (payload: Partial<ReferenceRow>) => Promise<boolean>;
}

export function ReferenceFormDialog({
  open,
  onOpenChange,
  title,
  initial,
  extraFields = [],
  onSubmit,
}: Props) {
  const { t } = useLanguage();
  const [code, setCode] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCode((initial?.code as string) ?? '');
    setNameAr((initial?.name_ar as string) ?? '');
    setNameEn((initial?.name_en as string) ?? '');
    setIsActive(initial?.is_active ?? true);
    const next: Record<string, string> = {};
    extraFields.forEach((f) => {
      next[f.name] = (initial?.[f.name] as string) ?? '';
    });
    setExtra(next);
  }, [open, initial, extraFields]);

  const handleSubmit = async () => {
    if (!code.trim() || !nameAr.trim()) return;
    setSubmitting(true);
    const payload: Partial<ReferenceRow> = {
      code: code.trim(),
      name_ar: nameAr.trim(),
      name_en: nameEn.trim() || null,
      is_active: isActive,
    };
    extraFields.forEach((f) => {
      const v = extra[f.name];
      if (v !== undefined && v !== '') {
        (payload as Record<string, unknown>)[f.name] =
          f.type === 'number' ? Number(v) : v;
      } else {
        (payload as Record<string, unknown>)[f.name] = null;
      }
    });
    const ok = await onSubmit(payload);
    setSubmitting(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ref-code">{t('codeInv')}</Label>
              <Input id="ref-code" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="space-y-1.5 flex items-end justify-end gap-2">
              <Label className="me-2">{t('activeStatus')}</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ref-name-ar">{t('nameArInv')}</Label>
            <Input id="ref-name-ar" value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ref-name-en">{t('nameEnInv')}</Label>
            <Input id="ref-name-en" value={nameEn} onChange={(e) => setNameEn(e.target.value)} dir="ltr" />
          </div>
          {extraFields.map((f) => (
            <div key={f.name} className="space-y-1.5">
              <Label htmlFor={`ref-${f.name}`}>{t(f.labelKey)}</Label>
              {f.type === 'textarea' ? (
                <Textarea
                  id={`ref-${f.name}`}
                  value={extra[f.name] ?? ''}
                  onChange={(e) => setExtra((s) => ({ ...s, [f.name]: e.target.value }))}
                />
              ) : (
                <Input
                  id={`ref-${f.name}`}
                  type={f.type ?? 'text'}
                  value={extra[f.name] ?? ''}
                  onChange={(e) => setExtra((s) => ({ ...s, [f.name]: e.target.value }))}
                />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !code.trim() || !nameAr.trim()}>
            {t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}