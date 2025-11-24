import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface SwipeNavigationConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  enabled?: boolean;
}

export function useSwipeNavigation(config: SwipeNavigationConfig = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    threshold = 50,
    enabled = true,
  } = config;

  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const [isSwipingLeft, setIsSwipingLeft] = useState(false);
  const [isSwipingRight, setIsSwipingRight] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      touchEndX.current = e.touches[0].clientX;
      const diff = touchStartX.current - touchEndX.current;
      
      if (Math.abs(diff) > 20) {
        if (diff > 0) {
          setIsSwipingLeft(true);
          setIsSwipingRight(false);
        } else {
          setIsSwipingRight(true);
          setIsSwipingLeft(false);
        }
      }
    };

    const handleTouchEnd = () => {
      const swipeDistance = touchStartX.current - touchEndX.current;

      if (Math.abs(swipeDistance) > threshold) {
        if (swipeDistance > 0 && onSwipeLeft) {
          onSwipeLeft();
        } else if (swipeDistance < 0 && onSwipeRight) {
          onSwipeRight();
        }
      }

      setIsSwipingLeft(false);
      setIsSwipingRight(false);
      touchStartX.current = 0;
      touchEndX.current = 0;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, threshold, onSwipeLeft, onSwipeRight]);

  return { isSwipingLeft, isSwipingRight };
}

export function usePageSwipeNavigation(routes: {
  left?: string;
  right?: string;
}) {
  const navigate = useNavigate();

  return useSwipeNavigation({
    onSwipeLeft: routes.left ? () => navigate(routes.left) : undefined,
    onSwipeRight: routes.right ? () => navigate(routes.right) : undefined,
    threshold: 80,
  });
}
