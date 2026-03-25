import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateDeclarationDialog } from '@/components/CreateDeclarationDialog';
import { cn } from '@/lib/utils';

interface FABProps {
  onSuccess?: () => void;
  className?: string;
}

export function FAB({ onSuccess, className }: FABProps) {
  return (
    <div className={cn('fixed bottom-24 md:bottom-6 end-6 z-50', className)}>
      <CreateDeclarationDialog 
        onSuccess={onSuccess}
        trigger={
          <Button
            size="lg"
            className="rounded-full w-14 h-14 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:scale-105"
          >
            <Plus className="w-6 h-6" />
          </Button>
        }
      />
    </div>
  );
}
