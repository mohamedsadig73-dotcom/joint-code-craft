import { useLanguage } from '@/contexts/LanguageContext';
import { X, Info, CheckCircle, AlertTriangle, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SmartNudgeProps {
  nudge: {
    id: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'tip';
  } | null;
  onDismiss: (id: string) => void;
  className?: string;
}

const typeStyles = {
  info: {
    bg: 'bg-primary/10 border-primary/30',
    icon: Info,
    iconColor: 'text-primary',
  },
  success: {
    bg: 'bg-green-500/10 border-green-500/30',
    icon: CheckCircle,
    iconColor: 'text-green-500',
  },
  warning: {
    bg: 'bg-warning/10 border-warning/30',
    icon: AlertTriangle,
    iconColor: 'text-warning',
  },
  tip: {
    bg: 'bg-secondary/10 border-secondary/30',
    icon: Lightbulb,
    iconColor: 'text-secondary',
  },
};

export function SmartNudge({ nudge, onDismiss, className }: SmartNudgeProps) {
  const { language } = useLanguage();

  if (!nudge) return null;

  const style = typeStyles[nudge.type];
  const Icon = style.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'relative flex items-center gap-3 p-4 rounded-lg border',
          style.bg,
          className
        )}
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        <div className={cn('flex-shrink-0', style.iconColor)}>
          <Icon className="w-5 h-5" />
        </div>
        
        <p className="flex-1 text-sm font-medium">{nudge.message}</p>
        
        <Button
          variant="ghost"
          size="sm"
          className="flex-shrink-0 h-8 w-8 p-0 hover:bg-background/50"
          onClick={() => onDismiss(nudge.id)}
        >
          <X className="w-4 h-4" />
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}
