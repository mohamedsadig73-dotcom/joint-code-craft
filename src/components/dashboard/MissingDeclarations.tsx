import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Declaration } from '@/types/declarations';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MissingDeclarationsProps {
  declarations: Declaration[];
  loading: boolean;
}

interface GapInfo {
  prefix: string;
  year: string;
  missing: number[];
}

export function MissingDeclarations({ declarations, loading }: MissingDeclarationsProps) {
  const { t, language } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'IN' | 'OUT'>('all');
  const [copied, setCopied] = useState(false);
  // Fetch ALL declaration IDs (active + soft-deleted, all years) so the gap
  // analysis is accurate regardless of the dashboard's year filter and is
  // not fooled by Supabase's default 1000-row pagination.
  const [allIds, setAllIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const fetchAllIds = async () => {
      const collected: string[] = [];
      const pageSize = 1000;
      let from = 0;
      // Page through all rows to bypass the 1000-row default limit.
      // We intentionally include soft-deleted rows (no deleted_at filter)
      // because the unique constraint on `id` still blocks re-creation.
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await supabase
          .from('declarations')
          .select('id')
          .order('id', { ascending: true })
          .range(from, from + pageSize - 1);
        if (error || !data) break;
        collected.push(...data.map((d) => d.id));
        if (data.length < pageSize) break;
        from += pageSize;
      }
      if (!cancelled) setAllIds(collected);
    };
    fetchAllIds();
    return () => { cancelled = true; };
    // Re-fetch when the visible declarations array changes length (covers
    // create/delete events surfaced via realtime in the parent hook).
  }, [declarations.length]);

  const gaps = useMemo(() => {
    // Use the comprehensive ID list when available; fall back to the
    // currently loaded declarations only on the very first render.
    const sourceIds = allIds.length > 0 ? allIds : declarations.map((d) => d.id);
    if (!sourceIds.length) return [];

    // Group by prefix-year (extracted from the ID itself, not created_at)
    const groups: Record<string, number[]> = {};
    sourceIds.forEach((id) => {
      const match = id.match(/^(IN|OUT)-(\d{4})-(\d+)$/);
      if (!match) return;
      const key = `${match[1]}-${match[2]}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(parseInt(match[3]));
    });

    const result: GapInfo[] = [];
    Object.entries(groups).forEach(([key, nums]) => {
      const [prefix, year] = key.split('-');
      if (typeFilter !== 'all' && prefix !== typeFilter) return;

      // Use a Set for O(1) lookup instead of Array.includes inside a loop.
      const numSet = new Set(nums);
      nums.sort((a, b) => a - b);
      const min = nums[0];
      const max = nums[nums.length - 1];
      const missing: number[] = [];

      for (let i = min; i <= max; i++) {
        if (!numSet.has(i)) missing.push(i);
      }

      if (missing.length > 0) {
        result.push({ prefix, year, missing });
      }
    });

    return result.sort((a, b) => `${a.prefix}-${a.year}`.localeCompare(`${b.prefix}-${b.year}`));
  }, [allIds, declarations, typeFilter]);

  const totalMissing = gaps.reduce((sum, g) => sum + g.missing.length, 0);

  const handleCopy = () => {
    const text = gaps.map(g => 
      g.missing.map(n => `${g.prefix}-${g.year}-${n.toString().padStart(4, '0')}`).join('\n')
    ).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: t('success'), description: t('copiedToClipboard') });
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return null;
  if (totalMissing === 0 && typeFilter === 'all') return null;

  return (
    <Card className="glass-card border-border/50 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold">{t('missingDeclarations')}</h3>
          {totalMissing > 0 && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
              {totalMissing}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as 'all' | 'IN' | 'OUT')}>
            <SelectTrigger className="h-8 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all')}</SelectItem>
              <SelectItem value="IN">{language === 'ar' ? 'دخول' : 'IN'}</SelectItem>
              <SelectItem value="OUT">{language === 'ar' ? 'خروج' : 'OUT'}</SelectItem>
            </SelectContent>
          </Select>
          {totalMissing > 0 && (
            <>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </>
          )}
        </div>
      </div>

      {totalMissing === 0 && (
        <p className="text-xs text-muted-foreground">{t('noMissingDeclarations')}</p>
      )}

      {totalMissing > 0 && (
        <div className="space-y-2">
          {gaps.map(gap => (
            <div key={`${gap.prefix}-${gap.year}`} className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                {gap.prefix}-{gap.year} — {gap.missing.length} {t('missing')}
              </p>
              {expanded && (
                <div className="flex flex-wrap gap-1.5">
                  {gap.missing.map(num => (
                    <Badge
                      key={num}
                      variant="outline"
                      className="font-mono text-xs bg-amber-500/5 text-amber-700 dark:text-amber-400 border-amber-500/20"
                    >
                      {gap.prefix}-{gap.year}-{num.toString().padStart(4, '0')}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
          {!expanded && (
            <p className="text-xs text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => setExpanded(true)}>
              {t('clickToShowDetails')}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
