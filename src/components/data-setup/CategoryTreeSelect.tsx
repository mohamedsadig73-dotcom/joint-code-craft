import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, FolderTree, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import type { CategoryRow } from '@/hooks/useDataSetup';
import { normalizeArabic } from '@/components/ui/Combobox';

interface Props {
  categories: CategoryRow[];
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

interface TreeNode extends CategoryRow {
  children: TreeNode[];
}

function buildTree(rows: CategoryRow[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  rows.forEach((r) => map.set(r.id, { ...r, children: [] }));
  const roots: TreeNode[] = [];
  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortFn = (a: TreeNode, b: TreeNode) => a.code.localeCompare(b.code);
  const sortRec = (nodes: TreeNode[]) => {
    nodes.sort(sortFn);
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

export function CategoryTreeSelect({
  categories,
  value,
  onChange,
  placeholder,
  disabled,
}: Props) {
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const tree = useMemo(
    () => buildTree(categories.filter((c) => c.is_active)),
    [categories]
  );

  const labelOf = (c: CategoryRow) =>
    lang === 'ar' ? c.name_ar || c.name_en : c.name_en || c.name_ar;

  const selected = useMemo(
    () => categories.find((c) => c.id === value),
    [categories, value]
  );

  const matches = useMemo(() => {
    if (!query.trim()) return null;
    const q = normalizeArabic(query);
    const ids = new Set<string>();
    categories.forEach((c) => {
      if (
        normalizeArabic(c.code).includes(q) ||
        normalizeArabic(c.name_ar).includes(q) ||
        normalizeArabic(c.name_en).includes(q)
      ) {
        ids.add(c.id);
        // also expand ancestors
        let p = c.parent_id;
        while (p) {
          ids.add(p);
          p = categories.find((x) => x.id === p)?.parent_id ?? null;
        }
      }
    });
    return ids;
  }, [query, categories]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderNode = (node: TreeNode, depth: number): React.ReactNode => {
    if (matches && !matches.has(node.id)) return null;
    const hasChildren = node.children.length > 0;
    const isOpen = expanded.has(node.id) || !!matches;
    const isSelected = node.id === value;
    return (
      <div key={node.id}>
        <div
          className={cn(
            'flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-sm',
            isSelected && 'bg-primary/10 text-primary font-medium'
          )}
          style={{ paddingInlineStart: `${depth * 16 + 8}px` }}
          onClick={() => {
            onChange(node.id);
            setOpen(false);
          }}
        >
          {hasChildren ? (
            <button
              type="button"
              className="p-0.5 rounded hover:bg-muted-foreground/10"
              onClick={(e) => {
                e.stopPropagation();
                toggle(node.id);
              }}
              aria-label={isOpen ? t('collapse') : t('expand')}
            >
              {isOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
              )}
            </button>
          ) : (
            <span className="w-4" />
          )}
          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
            {node.code}
          </span>
          <span className="truncate">{labelOf(node)}</span>
        </div>
        {hasChildren && isOpen && (
          <div>{node.children.map((c) => renderNode(c, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="w-full justify-between font-normal h-10"
        >
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <FolderTree className="w-4 h-4 text-primary" />
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                {selected.code}
              </span>
              <span className="truncate">{labelOf(selected)}</span>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-muted-foreground">
              <FolderTree className="w-4 h-4" />
              {placeholder ?? t('selectCategory')}
            </span>
          )}
          {value && (
            <span
              role="button"
              tabIndex={0}
              className="p-1 hover:bg-muted rounded"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-2"
        align="start"
      >
        <div className="relative mb-2">
          <Search className="absolute start-2 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="ps-8 h-9"
          />
        </div>
        <ScrollArea className="h-72">
          {tree.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('noResults')}
            </p>
          ) : (
            tree.map((n) => renderNode(n, 0))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}