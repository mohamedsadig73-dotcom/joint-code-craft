import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react';

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

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ 
            type: 'spring',
            stiffness: 300,
            damping: 20 
          }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          <motion.div 
            className={`flex flex-col items-center gap-3 p-8 rounded-2xl ${bgColorMap[type]} backdrop-blur-sm`}
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: 'spring',
                stiffness: 200,
                damping: 15,
                delay: 0.2 
              }}
            >
              <Icon className={`w-16 h-16 ${colorMap[type]}`} />
            </motion.div>
            {message && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-lg font-medium text-foreground"
              >
                {message}
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook for easy usage
import { useState, useCallback } from 'react';

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