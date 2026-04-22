import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigation } from '@/components/Navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft, ArrowRight, Loader2, Plus, Package, PackageOpen, Trash2, Lock, Pencil, Ship,
} from 'lucide-react';
import { useContainer, useContainers } from '@/hooks/useContainers';
import { useContainerItems } from '@/hooks/useContainerItems';
import { ContainerFormDialog } from '@/components/boxes/containers/ContainerFormDialog';
import { AddItemsToContainerDialog } from '@/components/boxes/containers/AddItemsToContainerDialog';
import { ContainerManifestPrint } from '@/components/boxes/containers/ContainerManifestPrint';
import { destinationBadgeClass } from '@/components/boxes/destinationStyles';

export default function ContainerDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  const { container, loading } = useContainer(id);
  const { updateContainer } = useContainers();
  const { boxedGroups, looseItems, loading: itemsLoading, addReceipts, removeItem } =
    useContainerItems(id);

  const [editOpen, setEditOpen] = useState(false);
  const [addBoxedOpen, setAddBoxedOpen] = useState(false);
  const [addLooseOpen, setAddLooseOpen] = useState(false);
  const [sealOpen, setSealOpen] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const canManage = isAdmin || isManager;
  const locked = container
    ? container.status === 'sealed' || container.status === 'shipped' || container.status === 'delivered'
    : true;
  const canModify = canManage && !locked;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin me-2" />
            {t('loading')}
          </div>
        </main>
      </div>
    );
  }

  if (!container) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Card className="p-12 text-center">
            <Ship className="w-12 h-12 mx-auto opacity-30 mb-2" />
            <p className="text-sm text-muted-foreground mb-4">{t('containerNotFound')}</p>
            <Button asChild variant="outline">
              <Link to="/boxes">{t('backToContainers')}</Link>
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  const totalQty =
    boxedGroups.reduce((s, g) => s + g.total_qty, 0) +
    looseItems.reduce((s, r) => s + (r.receipt.qty || 0), 0);

  const handleSeal = async () => {
    await updateContainer(container.id, { status: 'sealed' });
    setSealOpen(false);
  };

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/boxes')} className="mb-2">
          <BackIcon className="w-4 h-4 me-1.5" />
          {t('backToContainers')}
        </Button>

        <PageHeader
          title={`${t('container')} ${container.container_no}`}
          subtitle={container.shipping_company}
          icon={Ship}
        />

        {/* Meta + actions */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={destinationBadgeClass(container.destination)}>
                {t(`dest_${container.destination}`)}
              </Badge>
              <Badge variant="outline">{t(`containerStatus_${container.status}`)}</Badge>
              {locked && (
                <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                  <Lock className="w-3 h-3 me-1" />
                  {t('containerLocked')}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <ContainerManifestPrint
                container={container}
                boxedGroups={boxedGroups}
                looseItems={looseItems}
              />
              {canManage && !locked && (
                <>
                  <Button variant="outline" onClick={() => setEditOpen(true)}>
                    <Pencil className="w-4 h-4 me-1.5" />
                    {t('editContainer')}
                  </Button>
                  <Button onClick={() => setSealOpen(true)} disabled={boxedGroups.length === 0 && looseItems.length === 0}>
                    <Lock className="w-4 h-4 me-1.5" />
                    {t('sealContainer')}
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <Stat label={t('boxesCount')} value={boxedGroups.length} icon={Package} />
            <Stat label={t('looseCount')} value={looseItems.length} icon={PackageOpen} />
            <Stat label={t('totalQty')} value={totalQty} />
            <Stat label={t('shippedDate')} value={container.shipped_date ?? '—'} isText />
          </div>

          {container.notes && (
            <div className="mt-3 text-xs text-muted-foreground border-t border-border pt-3">
              {container.notes}
            </div>
          )}
        </Card>

        {itemsLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin me-2" />
            {t('loading')}
          </div>
        ) : (
          <>
            {/* Boxes section */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2 text-sm">
                  <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  {t('boxesInContainer')} ({boxedGroups.length.toLocaleString('en-US')})
                </h3>
                {canModify && (
                  <Button size="sm" onClick={() => setAddBoxedOpen(true)}>
                    <Plus className="w-4 h-4 me-1.5" />
                    {t('availableBoxes')}
                  </Button>
                )}
              </div>
              {boxedGroups.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {t('noBoxesInContainer')}
                </div>
              ) : (
                <div className="space-y-2">
                  {boxedGroups.map((g) => (
                    <div key={g.box_no} className="rounded-md border border-border overflow-hidden">
                      <div className="bg-muted/40 px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-destructive">{g.box_no}</span>
                          <Badge className={destinationBadgeClass(g.destination as any)}>
                            {t(`dest_${g.destination}`)}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {g.items.length} {t('items')} • {g.total_qty.toLocaleString('en-US')} {t('totalQty')}
                          </Badge>
                        </div>
                      </div>
                      <ul className="divide-y divide-border">
                        {g.items.map((it) => (
                          <li key={it.id} className="flex items-center gap-3 p-2.5 text-xs">
                            <div className="flex-1 min-w-0">
                              <span className="font-mono font-semibold">{it.receipt.part_no}</span>
                              <span className="text-muted-foreground"> — {it.receipt.description}</span>
                              <div className="text-[10px] text-muted-foreground mt-0.5">{it.receipt.supplier}</div>
                            </div>
                            <div className="text-end shrink-0">
                              <div className="font-bold tabular-nums">{it.receipt.qty.toLocaleString('en-US')}</div>
                              <div className="text-[10px] text-muted-foreground">{it.receipt.unit}</div>
                            </div>
                            {canModify && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive shrink-0"
                                onClick={() => removeItem(it.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Loose section */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2 text-sm">
                  <PackageOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  {t('looseItemsInContainer')} ({looseItems.length.toLocaleString('en-US')})
                </h3>
                {canModify && (
                  <Button size="sm" onClick={() => setAddLooseOpen(true)}>
                    <Plus className="w-4 h-4 me-1.5" />
                    {t('availableLooseItems')}
                  </Button>
                )}
              </div>
              {looseItems.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {t('noLooseInContainer')}
                </div>
              ) : (
                <ul className="divide-y divide-border rounded-md border border-border">
                  {looseItems.map((it) => (
                    <li key={it.id} className="flex items-center gap-3 p-2.5 text-xs">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-semibold">{it.receipt.part_no}</span>
                          <Badge className={destinationBadgeClass(it.receipt.destination)}>
                            {t(`dest_${it.receipt.destination}`)}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mt-0.5">{it.receipt.description}</p>
                        <div className="text-[10px] text-muted-foreground">{it.receipt.supplier}</div>
                      </div>
                      <div className="text-end shrink-0">
                        <div className="font-bold tabular-nums">{it.receipt.qty.toLocaleString('en-US')}</div>
                        <div className="text-[10px] text-muted-foreground">{it.receipt.unit}</div>
                      </div>
                      {canModify && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive shrink-0"
                          onClick={() => removeItem(it.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}

        <ContainerFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          initial={container}
          onSubmit={(values) => updateContainer(container.id, values)}
        />

        <AddItemsToContainerDialog
          open={addBoxedOpen}
          onOpenChange={setAddBoxedOpen}
          container={container}
          packingType="boxed"
          onAdd={addReceipts}
        />
        <AddItemsToContainerDialog
          open={addLooseOpen}
          onOpenChange={setAddLooseOpen}
          container={container}
          packingType="loose"
          onAdd={addReceipts}
        />

        <AlertDialog open={sealOpen} onOpenChange={setSealOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('sealContainer')}</AlertDialogTitle>
              <AlertDialogDescription>{t('sealContainerConfirm')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleSeal}>
                <Lock className="w-4 h-4 me-1.5" />
                {t('confirmSeal')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  isText,
}: {
  label: string;
  value: number | string;
  icon?: React.ComponentType<{ className?: string }>;
  isText?: boolean;
}) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </div>
      <div className="text-xl font-bold mt-1 tabular-nums">
        {isText ? value : (value as number).toLocaleString('en-US')}
      </div>
    </Card>
  );
}