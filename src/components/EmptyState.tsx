import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <Card className="glass-card border-border/50 p-12">
      <div className="flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center">
          <Icon className="w-10 h-10 text-muted-foreground/50" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">{title}</h3>
          {description && (
            <p className="text-muted-foreground max-w-md">{description}</p>
          )}
        </div>
        {action && (
          <Button
            onClick={action.onClick}
            className="btn-shimmer"
          >
            {action.label}
          </Button>
        )}
      </div>
    </Card>
  );
}
