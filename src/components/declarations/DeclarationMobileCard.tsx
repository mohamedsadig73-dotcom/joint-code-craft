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
import { FileText, User, Calendar, Eye, Trash2, ChevronLeft, ChevronRight, Archive } from 'lucide-react';

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
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  const handleView = () => {
    navigate(`/declaration/${declaration.id}`);
  };

  const ArrowIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <SwipeableRow
      onEdit={handleView}
      onDelete={canDelete ? onDelete : undefined}
      editLabel={t('view')}
      deleteLabel={t('delete')}
      className="group"
    >
      <Card 
        className={cn(
          'p-4 space-y-3 bg-card border-border/40',
          'active:bg-muted/30 transition-all duration-200',
          'shadow-sm hover:shadow-md'
        )}
        onClick={handleView}
      >
        {/* Header with type and status */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-medium text-xs shrink-0">
                  {declaration.type}
                </Badge>
                <span className="text-xs text-muted-foreground font-mono truncate">
                  #{declaration.id.slice(0, 8)}
                </span>
              </div>
            </div>
          </div>
          
          <div onClick={(e) => e.stopPropagation()}>
            <StatusQuickAction
              declarationId={declaration.id}
              currentStatus={declaration.status}
              onStatusChange={onStatusChange}
            />
          </div>
        </div>
        
        {/* Info row */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="w-4 h-4 shrink-0" />
            <span className="truncate">{declaration.sender?.username || t('unknown')}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4 shrink-0" />
            <span>{toGregorianDate(declaration.created_at)}</span>
          </div>
        </div>

        {/* Archive number if exists */}
        {declaration.archive_number && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
            <Archive className="w-3.5 h-3.5 shrink-0" />
            <span className="font-medium">{t('archiveNumber')}:</span>
            <span className="font-mono">{declaration.archive_number}</span>
          </div>
        )}
        
        {/* Tap to view indicator */}
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <span className="text-xs text-muted-foreground/60">
            {isRTL ? '← اسحب للإجراءات' : 'Swipe for actions →'}
          </span>
          <div className="flex items-center gap-1 text-xs text-primary/60">
            <span>{t('view')}</span>
            <ArrowIcon className="w-3.5 h-3.5" />
          </div>
        </div>
      </Card>
    </SwipeableRow>
  );
}
