import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { BOX_DESTINATIONS } from '@/utils/boxNumberValidation';
import type { ShippingContainer, ShippingContainerInput } from '@/hooks/useContainers';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: ShippingContainer | null;
  onSubmit: (values: ShippingContainerInput) => Promise<unknown>;
}

const STATUSES: ShippingContainer['status'][] = ['preparing', 'sealed', 'shipped', 'delivered'];

export function ContainerFormDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const { t } = useLanguage();
  const [containerNo, setContainerNo] = useState('');
  const [shippingCompany, setShippingCompany] = useState('');
  const [destination, setDestination] = useState<ShippingContainer['destination']>('morocco');
  const [status, setStatus] = useState<ShippingContainer['status']>('preparing');
  const [shippedDate, setShippedDate] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setContainerNo(initial?.container_no ?? '');
    setShippingCompany(initial?.shipping_company ?? '');
    setDestination(initial?.destination ?? 'morocco');
    setStatus(initial?.status ?? 'preparing');
    setShippedDate(initial?.shipped_date ?? '');
    setNotes(initial?.notes ?? '');
    setError(null);
  }, [open, initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!containerNo.trim() || !shippingCompany.trim()) {
      setError(t('requiredField'));
      return;
    }
    setSubmitting(true);
    try {
      const payload: ShippingContainerInput = {
        container_no: containerNo.trim(),
        shipping_company: shippingCompany.trim(),
        destination,
        status,
        shipped_date: shippedDate || null,
        notes: notes.trim() || null,
      };
      const res = await onSubmit(payload);
      if (res) onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? t('editContainer') : t('newContainer')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cn">{t('containerNo')} *</Label>
            <Input
              id="cn"
              value={containerNo}
              onChange={(e) => setContainerNo(e.target.value.toUpperCase())}
              placeholder={t('containerNoPlaceholder')}
              className="font-mono"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sc">{t('shippingCompany')} *</Label>
            <Input
              id="sc"
              value={shippingCompany}
              onChange={(e) => setShippingCompany(e.target.value)}
              placeholder={t('shippingCompanyPlaceholder')}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('destination')} *</Label>
              <Select value={destination} onValueChange={(v) => setDestination(v as typeof destination)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BOX_DESTINATIONS.map((d) => (
                    <SelectItem key={d} value={d}>{t(`dest_${d}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('status')} *</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{t(`containerStatus_${s}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sd">{t('shippedDate')}</Label>
            <Input
              id="sd"
              type="date"
              value={shippedDate}
              onChange={(e) => setShippedDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nt">{t('notes')}</Label>
            <Textarea
              id="nt"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>{t('save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}