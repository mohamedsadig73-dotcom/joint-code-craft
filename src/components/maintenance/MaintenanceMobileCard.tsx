import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Edit, Trash2, Eye, Calendar, DollarSign } from 'lucide-react';
import { SwipeableRow } from '@/components/SwipeableRow';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatNumber, formatCurrency, formatDateArabic } from '@/utils/numberFormat';

interface MaintenanceItem {
  id: string;
  name: string;
  frequency: string;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  estimated_cost: number | null;
  active: boolean;
}

interface MaintenanceMobileCardProps {
  item: MaintenanceItem;
  frequencyLabel: string;
  onEdit: () => void;
  onDelete: () => void;
  onView?: () => void;
}

export function MaintenanceMobileCard({ 
  item, 
  frequencyLabel,
  onEdit, 
  onDelete,
  onView 
}: MaintenanceMobileCardProps) {
  const { language, t } = useLanguage();

  return (
    <SwipeableRow
      onEdit={onEdit}
      onDelete={onDelete}
      editLabel={t('edit')}
      deleteLabel={t('delete')}
    >
      <Card className="glass-card border-border/50 p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-medium text-foreground">{item.name}</h4>
            <Badge variant="outline" className="mt-1">
              {frequencyLabel}
            </Badge>
          </div>
          <Badge variant={item.active ? 'default' : 'secondary'}>
            {item.active ? t('active') || 'نشط' : t('inactive') || 'غير نشط'}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-3">
          {item.last_maintenance_date && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{t('lastMaintenance') || 'آخر صيانة'}:</span>
              <span>{formatDateArabic(item.last_maintenance_date, language)}</span>
            </div>
          )}
          {item.next_maintenance_date && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{t('nextMaintenance') || 'القادمة'}:</span>
              <span>{formatDateArabic(item.next_maintenance_date, language)}</span>
            </div>
          )}
          {item.estimated_cost && (
            <div className="flex items-center gap-1 col-span-2">
              <DollarSign className="w-3 h-3" />
              <span>{t('estimatedCost') || 'التكلفة'}:</span>
              <span>{formatCurrency(item.estimated_cost, language)}</span>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2 pt-2 border-t border-border/30">
          {onView && (
            <Button variant="ghost" size="sm" onClick={onView}>
              <Eye className="w-4 h-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </SwipeableRow>
  );
}

// Asset Mobile Card
interface Asset {
  id: string;
  name: string;
  code: string | null;
  type: string;
  location: string;
  site: string | null;
  active: boolean;
}

interface AssetMobileCardProps {
  asset: Asset;
  typeLabel: string;
  onEdit: () => void;
  onDelete: () => void;
}

export function AssetMobileCard({ 
  asset, 
  typeLabel,
  onEdit, 
  onDelete 
}: AssetMobileCardProps) {
  const { t } = useLanguage();

  return (
    <SwipeableRow
      onEdit={onEdit}
      onDelete={onDelete}
      editLabel={t('edit')}
      deleteLabel={t('delete')}
    >
      <Card className="glass-card border-border/50 p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-medium text-foreground">{asset.name}</h4>
            {asset.code && (
              <span className="text-sm text-muted-foreground">{asset.code}</span>
            )}
          </div>
          <Badge variant={asset.active ? 'default' : 'secondary'}>
            {asset.active ? t('active') || 'نشط' : t('inactive') || 'غير نشط'}
          </Badge>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge variant="outline">{typeLabel}</Badge>
        </div>
        
        <div className="text-sm text-muted-foreground space-y-1">
          <div>{t('location') || 'الموقع'}: {asset.location}</div>
          {asset.site && <div>{t('site') || 'المنشأة'}: {asset.site}</div>}
        </div>
        
        <div className="flex justify-end gap-2 pt-2 mt-2 border-t border-border/30">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </SwipeableRow>
  );
}

// Vendor Mobile Card
interface Vendor {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  specialization: string | null;
  active: boolean;
}

interface VendorMobileCardProps {
  vendor: Vendor;
  onEdit: () => void;
  onDelete: () => void;
}

export function VendorMobileCard({ 
  vendor, 
  onEdit, 
  onDelete 
}: VendorMobileCardProps) {
  const { t } = useLanguage();

  return (
    <SwipeableRow
      onEdit={onEdit}
      onDelete={onDelete}
      editLabel={t('edit')}
      deleteLabel={t('delete')}
    >
      <Card className="glass-card border-border/50 p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-medium text-foreground">{vendor.name}</h4>
            {vendor.contact_person && (
              <span className="text-sm text-muted-foreground">{vendor.contact_person}</span>
            )}
          </div>
          <Badge variant={vendor.active ? 'default' : 'secondary'}>
            {vendor.active ? t('active') || 'نشط' : t('inactive') || 'غير نشط'}
          </Badge>
        </div>
        
        {vendor.specialization && (
          <Badge variant="outline" className="mb-3">
            {vendor.specialization}
          </Badge>
        )}
        
        <div className="text-sm text-muted-foreground space-y-1">
          {vendor.phone && <div>{t('phone') || 'الهاتف'}: {vendor.phone}</div>}
          {vendor.email && <div>{t('email')}: {vendor.email}</div>}
        </div>
        
        <div className="flex justify-end gap-2 pt-2 mt-2 border-t border-border/30">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </SwipeableRow>
  );
}
