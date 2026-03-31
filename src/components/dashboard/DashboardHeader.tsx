import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { CreateDeclarationDialog } from '@/components/CreateDeclarationDialog';

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
  const { user } = useAuth();

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div>
        <p className="text-muted-foreground text-sm">
          {t('welcome')}، {user?.username}!
        </p>
      </div>
      <div className="flex gap-2">
        <CreateDeclarationDialog 
          onSuccess={onSuccess}
          open={createDialogOpen}
          onOpenChange={onCreateDialogOpenChange}
        />
      </div>
    </div>
  );
}
