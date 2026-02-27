import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuccessAnimationProps {
  show: boolean;
  type?: 'success' | 'error' | 'warning' | 'info';
  message?: string;
  onComplete?: () => void;
}

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const colorMap = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500',
};

const bgColorMap = {
  success: 'bg-green-500/10',
  error: 'bg-red-500/10',
  warning: 'bg-yellow-500/10',
  info: 'bg-blue-500/10',
};

export function SuccessAnimation({ 
  show, 
  type = 'success', 
  message,
  onComplete 
}: SuccessAnimationProps) {
  const Icon = iconMap[type];
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    if (show) {
      setVisible(true);
    } else {
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center pointer-events-none transition-opacity duration-300',
        show ? 'opacity-100' : 'opacity-0'
      )}
    >
      <div className={cn(
        'flex flex-col items-center gap-3 p-8 rounded-2xl backdrop-blur-sm animate-fade-in',
        bgColorMap[type]
      )}>
        <Icon className={cn('w-16 h-16 animate-fade-in', colorMap[type])} />
        {message && (
          <p className="text-lg font-medium text-foreground animate-slide-up">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

export function useSuccessAnimation() {
  const [state, setState] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    message?: string;
  }>({
    show: false,
    type: 'success',
  });

  const trigger = useCallback((
    type: 'success' | 'error' | 'warning' | 'info' = 'success',
    message?: string,
    duration: number = 1500
  ) => {
    setState({ show: true, type, message });
    setTimeout(() => {
      setState(prev => ({ ...prev, show: false }));
    }, duration);
  }, []);

  const reset = useCallback(() => {
    setState({ show: false, type: 'success' });
  }, []);

  return {
    ...state,
    trigger,
    reset,
    SuccessAnimation: () => (
      <SuccessAnimation 
        show={state.show} 
        type={state.type} 
        message={state.message}
        onComplete={reset}
      />
    ),
  };
}
