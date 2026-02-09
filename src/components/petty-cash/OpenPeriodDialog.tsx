import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OpenPeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function OpenPeriodDialog({ open, onOpenChange, onSuccess }: OpenPeriodDialogProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'ar';
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    location: '',
    responsible_person: '',
    opening_balance: '',
    budget_limit: '1000',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Generate period number
      const { data: periodNumber } = await supabase
        .rpc('generate_petty_cash_period_number');

      const { error } = await supabase
        .from('petty_cash_periods')
        .insert({
          period_number: periodNumber,
          location: formData.location,
          responsible_person: formData.responsible_person,
          opening_balance: parseFloat(formData.opening_balance),
          current_balance: parseFloat(formData.opening_balance),
          budget_limit: parseFloat(formData.budget_limit),
          notes: formData.notes || null,
          opened_by: user?.id,
          status: 'open'
        });

      if (error) throw error;
      
      toast.success(t('periodOpened'));
      onOpenChange(false);
      onSuccess();
      
      // Reset form
      setFormData({
        location: '',
        responsible_person: '',
        opening_balance: '',
        budget_limit: '1000',
        notes: ''
      });
    } catch (error) {
      console.error('Error opening period:', error);
      toast.error(t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle>{t('openNewPeriod')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('location')} *</Label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder={t('locationPlaceholder')}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>{t('responsiblePerson')} *</Label>
            <Input
              value={formData.responsible_person}
              onChange={(e) => setFormData({ ...formData, responsible_person: e.target.value })}
              placeholder={t('responsiblePersonPlaceholder')}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>{t('openingBalance')} *</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.opening_balance}
              onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>{t('budgetLimit')}</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.budget_limit}
              onChange={(e) => setFormData({ ...formData, budget_limit: e.target.value })}
              placeholder="1000"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('notes')}</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={t('notesPlaceholder')}
              rows={3}
            />
          </div>

          <div className={`flex gap-3 pt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? t('saving') : t('openPeriod')}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
