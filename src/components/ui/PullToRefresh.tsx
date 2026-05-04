import { ReactNode, useCallback, useRef, useState } from 'react';
import { Loader2, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticMedium } from '@/lib/haptics';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  threshold?: number;
  disabled?: boolean;
  className?: string;
}

/**
 * Mobile pull-to-refresh wrapper.
 * Activates only when scroll position is at the very top.
 * Uses haptic feedback when threshold is reached.
 */
export function PullToRefresh({
  onRefresh,
  children,
  threshold = 70,
  disabled = false,
  className,
}: PullToRefreshProps) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const armed = useRef(false);
  const triggered = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || refreshing) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    armed.current = true;
    triggered.current = false;
  }, [disabled, refreshing]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!armed.current) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0) { setPull(0); return; }
    // resistance
    const distance = Math.min(dy * 0.5, threshold * 1.6);
    setPull(distance);
    if (!triggered.current && distance >= threshold) {
      triggered.current = true;
      hapticMedium();
    }
  }, [threshold]);

  const onTouchEnd = useCallback(async () => {
    if (!armed.current) return;
    armed.current = false;
    if (pull >= threshold) {
      setRefreshing(true);
      setPull(threshold * 0.7);
      try { await onRefresh(); } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  }, [pull, threshold, onRefresh]);

  const progress = Math.min(pull / threshold, 1);

  return (
    <div
      className={cn('relative', className)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Indicator */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute left-1/2 -translate-x-1/2 z-50',
          'flex items-center justify-center w-10 h-10 rounded-full',
          'bg-card border border-border shadow-md',
          'transition-opacity'
        )}
        style={{
          top: 8,
          transform: `translate(-50%, ${pull - 48}px)`,
          opacity: pull > 8 ? 1 : 0,
        }}
      >
        {refreshing ? (
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        ) : (
          <ArrowDown
            className="w-5 h-5 text-primary transition-transform"
            style={{ transform: `rotate(${progress * 180}deg)` }}
          />
        )}
      </div>

      <div
        style={{
          transform: `translateY(${pull}px)`,
          transition: armed.current ? 'none' : 'transform 220ms ease',
        }}
      >
        {children}
      </div>
    </div>
  );
}