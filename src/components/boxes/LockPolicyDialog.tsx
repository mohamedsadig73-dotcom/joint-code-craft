import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { Lock, Shield, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional part number to deep-link the audit logs filter. */
  partNo?: string;
}

export function LockPolicyDialog({ open, onOpenChange, partNo }: Props) {
  const { t } = useLanguage();
  const auditHref = partNo
    ? `/audit-logs?partNo=${encodeURIComponent(partNo)}&table=box_receipts`
    : `/audit-logs?table=box_receipts`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-warning" />
            {t('lockPolicyTitle')}
          </DialogTitle>
          <DialogDescription>{t('lockPolicyShippedRule')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <Shield className="w-4 h-4 text-primary" />
            {t('lockPolicyRolesTitle')}
          </div>
          <ul className="space-y-1.5 text-muted-foreground list-disc ps-5">
            <li>{t('lockPolicyRoleAdmin')}</li>
            <li>{t('lockPolicyRoleManager')}</li>
            <li>{t('lockPolicyRoleUser')}</li>
          </ul>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button asChild>
            <Link to={auditHref}>
              <ExternalLink className="w-4 h-4 me-1.5" />
              {t('lockPolicyAuditLink')}
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}