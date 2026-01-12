import { useLanguage } from '@/contexts/LanguageContext';
import { useGestures } from '@/hooks/useGestures';
import { Eye, Trash2, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeableRowProps {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  deleteLabel?: string;
  editIcon?: React.ReactNode;
  deleteIcon?: React.ReactNode;
  className?: string;
}

export function SwipeableRow({
  children,
  onEdit,
  onDelete,
  editLabel = 'تعديل',
  deleteLabel = 'حذف',
  editIcon = <Eye className="w-5 h-5" />,
  deleteIcon = <Trash2 className="w-5 h-5" />,
  className,
}: SwipeableRowProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  
  const {
    gestureHandlers,
    translateX,
    swipeProgress,
    isSwipingLeft,
    isSwipingRight,
  } = useGestures({
    onSwipeLeft: onDelete,
    onSwipeRight: onEdit,
    threshold: 80,
    enabled: !!(onEdit || onDelete),
  });

  const showEdit = isRTL ? isSwipingLeft : isSwipingRight;
  const showDelete = isRTL ? isSwipingRight : isSwipingLeft;
  const absTranslateX = Math.abs(translateX);

  return (
    <div className={cn('relative overflow-hidden rounded-xl', className)}>
      {/* Edit action background - left side */}
      {onEdit && (
        <div 
          className={cn(
            'absolute inset-y-0 start-0 flex items-center justify-center gap-2',
            'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground',
            'transition-opacity duration-150 rounded-s-xl'
          )}
          style={{ 
            opacity: showEdit ? Math.min(swipeProgress * 1.5, 1) : 0,
            width: absTranslateX > 0 ? absTranslateX : 0,
          }}
        >
          <div 
            className="flex flex-col items-center gap-1 px-4"
            style={{
              opacity: swipeProgress > 0.3 ? 1 : swipeProgress / 0.3,
              transform: `scale(${0.8 + swipeProgress * 0.2})`,
            }}
          >
            {editIcon}
            <span className="text-xs font-medium">{editLabel}</span>
          </div>
        </div>
      )}
      
      {/* Delete action background - right side */}
      {onDelete && (
        <div 
          className={cn(
            'absolute inset-y-0 end-0 flex items-center justify-center gap-2',
            'bg-gradient-to-l from-destructive to-destructive/80 text-destructive-foreground',
            'transition-opacity duration-150 rounded-e-xl'
          )}
          style={{ 
            opacity: showDelete ? Math.min(swipeProgress * 1.5, 1) : 0,
            width: absTranslateX > 0 ? absTranslateX : 0,
          }}
        >
          <div 
            className="flex flex-col items-center gap-1 px-4"
            style={{
              opacity: swipeProgress > 0.3 ? 1 : swipeProgress / 0.3,
              transform: `scale(${0.8 + swipeProgress * 0.2})`,
            }}
          >
            {deleteIcon}
            <span className="text-xs font-medium">{deleteLabel}</span>
          </div>
        </div>
      )}
      
      {/* Main content */}
      <div
        {...gestureHandlers}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: translateX === 0 ? 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)' : 'none',
        }}
        className="relative z-10 bg-background rounded-xl touch-pan-y"
      >
        {children}
      </div>
      
      {/* Swipe hint indicator */}
      {(onEdit || onDelete) && absTranslateX === 0 && (
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-primary/20 via-transparent to-destructive/20 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
}
