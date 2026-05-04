import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateDeclarationDialog } from '@/components/CreateDeclarationDialog';
import { cn } from '@/lib/utils';
import { hapticLight } from '@/lib/haptics';

interface FABProps {
  onSuccess?: () => void;
  className?: string;
}

export function FAB({ onSuccess, className }: FABProps) {
  return (
    <div
      className={cn('fixed end-4 md:end-6 z-50', className)}
      style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <CreateDeclarationDialog 
        onSuccess={onSuccess}
        trigger={
          <Button
            size="lg"
            onClick={() => hapticLight()}
            className="rounded-full w-14 h-14 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:scale-105 active:scale-95 tap-highlight-none"
          >
            <Plus className="w-6 h-6" />
          </Button>
        }
      />
    </div>
  );
}
