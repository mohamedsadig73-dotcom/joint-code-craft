import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { BookmarkPlus, Bookmark, Trash2, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { FilterPreset } from '@/hooks/useReceiptsFilters';

interface Props {
  presets: FilterPreset[];
  onSave: (name: string) => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  canSave: boolean;
}

export function FilterPresetsMenu({ presets, onSave, onLoad, onDelete, canSave }: Props) {
  const { t } = useLanguage();
  const [showSave, setShowSave] = useState(false);
  const [name, setName] = useState('');

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim());
    setName('');
    setShowSave(false);
  };

  return (
    <div className="rounded-md border border-border/60 p-2 space-y-2 bg-accent/20">
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="flex-1 justify-between h-8 text-xs">
              <span className="flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5" />
                {t('savedFilters')}
                {presets.length > 0 && (
                  <span className="text-muted-foreground">({presets.length})</span>
                )}
              </span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 max-h-72 overflow-y-auto">
            <DropdownMenuLabel>{t('savedFilters')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {presets.length === 0 ? (
              <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                {t('noPresetsYet')}
              </div>
            ) : (
              presets.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  onSelect={(e) => e.preventDefault()}
                  className="flex items-center justify-between gap-2"
                >
                  <button
                    type="button"
                    className="flex-1 text-start text-xs truncate hover:underline"
                    onClick={() => onLoad(p.id)}
                  >
                    {p.name}
                  </button>
                  <button
                    type="button"
                    className="text-destructive hover:text-destructive/80"
                    onClick={() => onDelete(p.id)}
                    title={t('delete')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1"
          disabled={!canSave}
          onClick={() => setShowSave((s) => !s)}
        >
          <BookmarkPlus className="w-3.5 h-3.5" />
          {t('save')}
        </Button>
      </div>
      {showSave && (
        <div className="flex gap-1">
          <Input
            autoFocus
            placeholder={t('presetName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            className="h-8 text-xs"
          />
          <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={!name.trim()}>
            {t('save')}
          </Button>
        </div>
      )}
    </div>
  );
}