import { useState, useRef, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { hapticMedium } from '@/lib/haptics';

interface SwipeState {
  startX: number;
  currentX: number;
  swiping: boolean;
  direction: 'left' | 'right' | null;
}

interface UseGesturesOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  enabled?: boolean;
}

export function useGestures(options: UseGesturesOptions = {}) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  
  const { 
    onSwipeLeft, 
    onSwipeRight, 
    threshold = 80,
    enabled = true 
  } = options;
  
  const [swipeState, setSwipeState] = useState<SwipeState>({
    startX: 0,
    currentX: 0,
    swiping: false,
    direction: null,
  });
  
  const elementRef = useRef<HTMLDivElement>(null);
  const passedThreshold = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    passedThreshold.current = false;
    
    setSwipeState({
      startX: e.touches[0].clientX,
      currentX: e.touches[0].clientX,
      swiping: true,
      direction: null,
    });
  }, [enabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || !swipeState.swiping) return;
    
    const currentX = e.touches[0].clientX;
    const diff = currentX - swipeState.startX;

    if (!passedThreshold.current && Math.abs(diff) >= threshold) {
      passedThreshold.current = true;
      hapticMedium();
    }
    
    setSwipeState(prev => ({
      ...prev,
      currentX,
      direction: diff > 0 ? 'right' : 'left',
    }));
  }, [enabled, swipeState.swiping, swipeState.startX, threshold]);

  const handleTouchEnd = useCallback(() => {
    if (!enabled || !swipeState.swiping) return;
    
    const diff = swipeState.currentX - swipeState.startX;
    const absD = Math.abs(diff);
    
    if (absD >= threshold) {
      const swipedRight = isRTL ? diff < 0 : diff > 0;
      const swipedLeft = isRTL ? diff > 0 : diff < 0;
      
      if (swipedRight && onSwipeRight) {
        onSwipeRight();
      } else if (swipedLeft && onSwipeLeft) {
        onSwipeLeft();
      }
    }
    
    setSwipeState({
      startX: 0,
      currentX: 0,
      swiping: false,
      direction: null,
    });
  }, [enabled, swipeState, threshold, isRTL, onSwipeLeft, onSwipeRight]);

  const getTranslateX = useCallback(() => {
    if (!swipeState.swiping) return 0;
    
    const diff = swipeState.currentX - swipeState.startX;
    const maxSwipe = 100;
    const resistance = 0.5;
    const limited = Math.sign(diff) * Math.min(Math.abs(diff) * resistance, maxSwipe);
    
    return limited;
  }, [swipeState]);

  const getSwipeProgress = useCallback(() => {
    if (!swipeState.swiping) return 0;
    
    const diff = Math.abs(swipeState.currentX - swipeState.startX);
    return Math.min(diff / threshold, 1);
  }, [swipeState, threshold]);

  const gestureHandlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };

  return {
    elementRef,
    gestureHandlers,
    swipeState,
    translateX: getTranslateX(),
    swipeProgress: getSwipeProgress(),
    isSwipingLeft: swipeState.direction === 'left',
    isSwipingRight: swipeState.direction === 'right',
  };
}
