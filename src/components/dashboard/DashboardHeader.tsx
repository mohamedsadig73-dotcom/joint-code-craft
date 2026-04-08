import { useLanguage } from '@/contexts/LanguageContext';
import { CreateDeclarationDialog } from '@/components/CreateDeclarationDialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { FileText } from 'lucide-react';

interface DashboardHeaderProps {
  createDialogOpen: boolean;
  onCreateDialogOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DashboardHeader({ 
  createDialogOpen, 
  onCreateDialogOpenChange, 
  onSuccess 
}: DashboardHeaderProps) {
  const { t } = useLanguage();

  return (
    <PageHeader
      icon={FileText}
      title={t('systemTitle')}
      actions={
        <CreateDeclarationDialog 
          onSuccess={onSuccess}
          open={createDialogOpen}
          onOpenChange={onCreateDialogOpenChange}
        />
      }
    />
  );
}
