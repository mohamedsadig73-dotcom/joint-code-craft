import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useShortcutsDialog } from '@/hooks/useWMSKeyboardShortcuts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Keyboard, Navigation, Zap } from 'lucide-react';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const KeyboardShortcutsDialog: React.FC<KeyboardShortcutsDialogProps> = ({
  open,
  onOpenChange
}) => {
  const { language } = useLanguage();
  const { groupedShortcuts, formatShortcut } = useShortcutsDialog(language);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            {language === 'ar' ? 'اختصارات لوحة المفاتيح' : 'Keyboard Shortcuts'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Navigation Shortcuts */}
          <div>
            <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
              <Navigation className="h-4 w-4" />
              {language === 'ar' ? 'التنقل' : 'Navigation'}
            </div>
            <div className="space-y-2">
              {groupedShortcuts.navigation.map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
                  <span className="text-sm">
                    {language === 'ar' ? shortcut.descriptionAr : shortcut.description}
                  </span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {formatShortcut(shortcut)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Action Shortcuts */}
          <div>
            <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
              <Zap className="h-4 w-4" />
              {language === 'ar' ? 'الإجراءات' : 'Actions'}
            </div>
            <div className="space-y-2">
              {groupedShortcuts.actions.map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
                  <span className="text-sm">
                    {language === 'ar' ? shortcut.descriptionAr : shortcut.description}
                  </span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {formatShortcut(shortcut)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground text-center mt-4 pt-4 border-t">
          {language === 'ar' 
            ? 'اضغط Esc لإغلاق هذه النافذة'
            : 'Press Esc to close this dialog'}
        </div>
      </DialogContent>
    </Dialog>
  );
};
