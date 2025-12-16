import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { SwipeableRow } from '@/components/SwipeableRow';
import { StatusQuickAction } from '@/components/declarations/StatusQuickAction';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toGregorianDate } from '@/utils/dateUtils';
import { statusLabels, statusColors } from '@/constants/statusLabels';
import { Declaration } from '@/types/declarations';
import { FileText, User, Calendar, Eye, Trash2, Edit } from 'lucide-react';

interface DeclarationMobileCardProps {
  declaration: Declaration;
  onEdit?: () => void;
  onDelete?: () => void;
  onStatusChange: () => void;
  canDelete: boolean;
}

export function DeclarationMobileCard({
  declaration,
  onEdit,
  onDelete,
  onStatusChange,
  canDelete,
}: DeclarationMobileCardProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleView = () => {
    navigate(`/declaration/${declaration.id}`);
  };

  return (
    <SwipeableRow
      onEdit={handleView}
      onDelete={canDelete ? onDelete : undefined}
      editLabel={t('view')}
      deleteLabel={t('delete')}
    >
      <Card 
        className="p-4 space-y-3 bg-background border-border/50"
        onClick={handleView}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              {declaration.type}
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              #{declaration.id.slice(0, 8)}
            </span>
          </div>
          <StatusQuickAction
            declarationId={declaration.id}
            currentStatus={declaration.status}
            onStatusChange={onStatusChange}
          />
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            <span>{declaration.sender?.username || t('unknown')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>{toGregorianDate(declaration.created_at)}</span>
          </div>
        </div>

        {declaration.archive_number && (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">{t('archiveNumber')}:</span>{' '}
            <span className="font-mono">{declaration.archive_number}</span>
          </div>
        )}
        
        {/* Swipe hint for mobile */}
        <div className="text-xs text-muted-foreground/50 text-center pt-1">
          ← {t('view')} | {canDelete ? `${t('delete')} →` : ''}
        </div>
      </Card>
    </SwipeableRow>
  );
}
