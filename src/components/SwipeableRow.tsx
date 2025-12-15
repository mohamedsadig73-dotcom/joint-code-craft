import { useLanguage } from '@/contexts/LanguageContext';
import { useGestures } from '@/hooks/useGestures';

interface SwipeableRowProps {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  deleteLabel?: string;
  className?: string;
}

export function SwipeableRow({
  children,
  onEdit,
  onDelete,
  editLabel = 'تعديل',
  deleteLabel = 'حذف',
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
    enabled: true,
  });

  const showEdit = isRTL ? isSwipingLeft : isSwipingRight;
  const showDelete = isRTL ? isSwipingRight : isSwipingLeft;

  return (
    <div className={`relative overflow-hidden ${className || ''}`}>
      {/* Edit action background */}
      <div 
        className="absolute inset-y-0 start-0 flex items-center px-4 bg-primary text-primary-foreground"
        style={{ 
          opacity: showEdit ? swipeProgress : 0,
          width: Math.abs(translateX),
        }}
      >
        {editLabel}
      </div>
      
      {/* Delete action background */}
      <div 
        className="absolute inset-y-0 end-0 flex items-center px-4 bg-destructive text-destructive-foreground"
        style={{ 
          opacity: showDelete ? swipeProgress : 0,
          width: Math.abs(translateX),
        }}
      >
        {deleteLabel}
      </div>
      
      {/* Main content */}
      <div
        {...gestureHandlers}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: translateX === 0 ? 'transform 0.2s ease-out' : 'none',
        }}
        className="relative z-10 bg-background"
      >
        {children}
      </div>
    </div>
  );
}
