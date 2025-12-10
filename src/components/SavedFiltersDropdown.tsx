import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSavedFilters, SavedFilter } from '@/hooks/useSavedFilters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Bookmark, Plus, Trash2, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SavedFiltersDropdownProps {
  currentFilters: SavedFilter['filters'];
  onApplyFilter: (filters: SavedFilter['filters']) => void;
  hasActiveFilters: boolean;
}

export function SavedFiltersDropdown({
  currentFilters,
  onApplyFilter,
  hasActiveFilters,
}: SavedFiltersDropdownProps) {
  const { t } = useLanguage();
  const { savedFilters, saveFilter, deleteFilter } = useSavedFilters();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [filterName, setFilterName] = useState('');

  const handleSaveFilter = () => {
    if (!filterName.trim()) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: t('enterFilterName'),
      });
      return;
    }

    saveFilter(filterName.trim(), currentFilters);
    toast({
      title: t('success'),
      description: t('filterSaved'),
    });
    setSaveDialogOpen(false);
    setFilterName('');
  };

  const handleApplyFilter = (filter: SavedFilter) => {
    onApplyFilter(filter.filters);
    toast({
      title: t('success'),
      description: `${t('filterApplied')}: ${filter.name}`,
    });
  };

  const handleDeleteFilter = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteFilter(id);
    toast({
      title: t('success'),
      description: t('filterDeleted'),
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Bookmark className="w-4 h-4" />
            {t('savedFilters')}
            {savedFilters.length > 0 && (
              <span className="bg-primary/20 text-primary text-xs px-1.5 rounded-full">
                {savedFilters.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>{t('savedFilters')}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {savedFilters.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              {t('noSavedFilters')}
            </div>
          ) : (
            savedFilters.map((filter) => (
              <DropdownMenuItem
                key={filter.id}
                className="flex items-center justify-between cursor-pointer"
                onClick={() => handleApplyFilter(filter)}
              >
                <div className="flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-primary" />
                  <span className="truncate max-w-32">{filter.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-destructive/20 hover:text-destructive"
                  onClick={(e) => handleDeleteFilter(e, filter.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </DropdownMenuItem>
            ))
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => setSaveDialogOpen(true)}
            disabled={!hasActiveFilters}
          >
            <Plus className="w-4 h-4 me-2" />
            {t('saveCurrentFilter')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('saveFilter')}</DialogTitle>
            <DialogDescription>
              {t('saveFilterDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Input
              placeholder={t('filterNamePlaceholder')}
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveFilter()}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSaveFilter}>
              <Check className="w-4 h-4 me-2" />
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
