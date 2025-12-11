import { LucideIcon, FileText, Inbox, Search, Trash2, Users, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'search' | 'trash' | 'users' | 'maintenance' | 'declarations';
}

const variantIcons: Record<string, LucideIcon> = {
  default: Inbox,
  search: Search,
  trash: Trash2,
  users: Users,
  maintenance: Wrench,
  declarations: FileText,
};

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  variant = 'default',
}: EmptyStateProps) {
  const Icon = icon || variantIcons[variant];

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in">
      {/* Decorative circles */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-primary/5 animate-pulse scale-150" />
        <div className="absolute inset-0 rounded-full bg-primary/10 scale-125" />
        <div className="relative p-4 rounded-full bg-primary/10">
          <Icon className="w-12 h-12 text-primary/60" />
        </div>
      </div>

      {/* Text content */}
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      )}

      {/* Action button */}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="gap-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
