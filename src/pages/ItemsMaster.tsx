import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigation } from '@/components/Navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useItemsMaster, useItemReceiptsCount, type ItemMaster } from '@/hooks/useItemsMaster';
import { ItemFormDialog } from '@/components/boxes/items/ItemFormDialog';
import { Library, Plus, Search, Edit, Trash2, Eye, Loader2, History, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ImageIcon } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function ItemsMaster() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { items, loading, createItem, updateItem, deleteItem } = useItemsMaster();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ItemMaster | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ItemMaster | null>(null);

  const itemIds = useMemo(() => items.map((i) => i.id), [items]);
  const counts = useItemReceiptsCount(itemIds);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.part_no.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        (i.default_supplier ?? '').toLowerCase().includes(q)
    );
  }, [items, search]);

  const existingPartNos = useMemo(
    () => items.filter((i) => i.id !== editing?.id).map((i) => i.part_no),
    [items, editing]
  );

  const handleSubmit = async (values: Parameters<typeof createItem>[0]) => {
    if (editing) return updateItem(editing.id, values);
    return createItem(values);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        <PageHeader
          title={t('itemsMaster')}
          subtitle={t('itemsMasterDesc')}
          icon={Library}
        />

        <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative max-w-md w-full">
            <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('searchPartNoOrDesc')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/boxes/items-image-history')}
              className="gap-1.5"
            >
              <History className="w-4 h-4" />
              {t('imageHistory')}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/boxes/items/import')}
              className="gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              {t('importFromDocx')}
            </Button>
            <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-1.5">
              <Plus className="w-4 h-4" />
              {t('addItem')}
            </Button>
          </div>
        </div>

        <div className="mt-4 rounded-lg border bg-card">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {t('noItemsFound')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14"></TableHead>
                  <TableHead>{t('partNo')}</TableHead>
                  <TableHead>{t('description')}</TableHead>
                  <TableHead>{t('supplier')}</TableHead>
                  <TableHead>{t('unit')}</TableHead>
                  <TableHead className="text-center">{t('movementsCount')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead className="text-end">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => {
                  const count = counts[item.id] ?? 0;
                  const thumbUrl = item.image_path
                    ? supabase.storage.from('box-images').getPublicUrl(item.image_path).data.publicUrl
                    : null;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        {thumbUrl ? (
                          <HoverCard openDelay={120} closeDelay={80}>
                            <HoverCardTrigger asChild>
                              <button
                                type="button"
                                onClick={() => navigate(`/boxes/items/${item.id}`)}
                                className="w-10 h-10 rounded-md border bg-muted/30 overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-primary/40 transition"
                                title={t('previewImage')}
                              >
                                <img
                                  src={thumbUrl}
                                  alt={item.part_no}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    const img = e.currentTarget as HTMLImageElement;
                                    img.style.display = 'none';
                                    img.parentElement?.classList.add('text-destructive');
                                  }}
                                />
                              </button>
                            </HoverCardTrigger>
                            <HoverCardContent side="right" className="w-64 p-2">
                              <div className="w-full aspect-square rounded-md overflow-hidden bg-muted/30">
                                <img src={thumbUrl} alt={item.part_no} className="w-full h-full object-contain" />
                              </div>
                              <p className="text-xs font-mono text-center mt-1.5">{item.part_no}</p>
                            </HoverCardContent>
                          </HoverCard>
                        ) : (
                          <button
                            type="button"
                            onClick={() => navigate(`/boxes/items/${item.id}`)}
                            className="w-10 h-10 rounded-md border border-dashed bg-muted/30 overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-primary/40 transition"
                            title={t('noImage')}
                          >
                            <ImageIcon className="w-4 h-4 text-muted-foreground/60" />
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{item.part_no}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.default_supplier || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.default_unit}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={count > 0 ? 'secondary' : 'outline'}>{count}</Badge>
                      </TableCell>
                      <TableCell>
                        {item.is_active ? (
                          <Badge variant="default">{t('active')}</Badge>
                        ) : (
                          <Badge variant="outline">{t('inactive')}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => navigate(`/boxes/items/${item.id}`)}
                            title={t('view')}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => { setEditing(item); setFormOpen(true); }}
                            title={t('edit')}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setConfirmDelete(item)}
                            title={t('delete')}
                            disabled={count > 0}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <ItemFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          initial={editing}
          onSubmit={handleSubmit}
          existingPartNos={existingPartNos}
        />

        <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('deleteItem')}</AlertDialogTitle>
              <AlertDialogDescription>{t('deleteItemConfirm')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (confirmDelete) await deleteItem(confirmDelete.id);
                  setConfirmDelete(null);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t('delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}