import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useInvCustody } from '@/hooks/useInventory';
import { useItemsMaster } from '@/hooks/useItemsMaster';
import { Search, UserCheck, Loader2 } from 'lucide-react';

export function CustodyTab() {
  const { t } = useLanguage();
  const { custody, loading } = useInvCustody();
  const { items } = useItemsMaster();
  const [search, setSearch] = useState('');

  const itemMap = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);

  const rows = useMemo(() => {
    return custody.filter(c => {
      if (c.qty === 0) return false;
      if (!search) return true;
      const item = itemMap.get(c.item_id);
      const q = search.toLowerCase();
      return c.party_name.toLowerCase().includes(q)
        || item?.part_no.toLowerCase().includes(q)
        || item?.description.toLowerCase().includes(q);
    });
  }, [custody, search, itemMap]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  // Group by party
  const byParty = new Map<string, typeof rows>();
  rows.forEach(r => {
    const key = `${r.party_type}::${r.party_name}`;
    if (!byParty.has(key)) byParty.set(key, []);
    byParty.get(key)!.push(r);
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('searchPartyOrItem')} className="ps-10" />
      </div>
      {byParty.size === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><UserCheck className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>{t('noCustody')}</p></CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {Array.from(byParty.entries()).map(([key, lines]) => {
            const first = lines[0];
            return (
              <Card key={key}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{first.party_name}</div>
                      <div className="text-xs text-muted-foreground">{t(first.party_type)} {first.party_ref ? `· ${first.party_ref}` : ''}</div>
                    </div>
                    <Badge variant="secondary">{lines.length} {t('items')}</Badge>
                  </div>
                  <div className="space-y-1.5 border-t pt-2">
                    {lines.map(l => {
                      const item = itemMap.get(l.item_id);
                      return (
                        <div key={l.id} className="flex items-center justify-between text-sm">
                          <span className="truncate">{item?.part_no} - {item?.description}</span>
                          <Badge variant={l.qty > 0 ? 'default' : 'destructive'}>{l.qty}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}