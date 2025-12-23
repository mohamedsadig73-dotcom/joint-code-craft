import { ReactNode, memo } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

// Lightweight CSS-based page transition (no framer-motion overhead)
export const PageTransition = memo(function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <div className={`animate-fade-in ${className || ''}`}>
      {children}
    </div>
  );
});

// Lightweight Fade transition for modals/dialogs
export const FadeTransition = memo(function FadeTransition({ children, className }: PageTransitionProps) {
  return (
    <div className={`animate-fade-in ${className || ''}`}>
      {children}
    </div>
  );
});

// Lightweight Slide from right transition for sidebars
export const SlideTransition = memo(function SlideTransition({ children, className }: PageTransitionProps) {
  return (
    <div className={`animate-slide-in-right ${className || ''}`}>
      {children}
    </div>
  );
});

// Lightweight Stagger children animation
export const StaggerContainer = memo(function StaggerContainer({ children, className }: PageTransitionProps) {
  return (
    <div className={`animate-fade-in ${className || ''}`}>
      {children}
    </div>
  );
});

// Lightweight Stagger item for use inside StaggerContainer
export const StaggerItem = memo(function StaggerItem({ children, className }: PageTransitionProps) {
  return (
    <div className={`animate-slide-up ${className || ''}`}>
      {children}
    </div>
  );
});
