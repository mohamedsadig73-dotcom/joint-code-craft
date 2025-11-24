import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeIndicatorProps {
  direction: 'left' | 'right' | null;
  label?: string;
}

export function SwipeIndicator({ direction, label }: SwipeIndicatorProps) {
  if (!direction) return null;

  return (
    <div
      className={cn(
        "fixed top-1/2 -translate-y-1/2 z-50 pointer-events-none",
        "bg-primary/90 text-primary-foreground px-6 py-4 rounded-full",
        "shadow-xl backdrop-blur-sm animate-fade-in",
        direction === 'left' ? 'right-4 animate-slide-in-right' : 'left-4 animate-slide-in',
      )}
    >
      <div className="flex items-center gap-2">
        {direction === 'right' && <ChevronLeft className="w-6 h-6" />}
        {label && <span className="font-medium text-sm">{label}</span>}
        {direction === 'left' && <ChevronRight className="w-6 h-6" />}
      </div>
    </div>
  );
}
