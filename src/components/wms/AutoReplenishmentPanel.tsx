import React, { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAutoReplenishment } from '@/hooks/useAutoReplenishment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  RefreshCw, 
  ShoppingCart, 
  AlertTriangle, 
  Package,
  TrendingDown
} from 'lucide-react';

interface AutoReplenishmentPanelProps {
  autoCheck?: boolean;
}

export const AutoReplenishmentPanel: React.FC<AutoReplenishmentPanelProps> = ({ autoCheck = false }) => {
  const { language } = useLanguage();
  const {
    checking,
    creatingOrders,
    lowStockProducts,
    checkLowStock,
    createAllReplenishmentOrders
  } = useAutoReplenishment(language);

  const [selectedProducts, setSelectedProducts] = React.useState<Set<string>>(new Set());

  useEffect(() => {
    if (autoCheck) {
      checkLowStock();
    }
  }, [autoCheck, checkLowStock]);

  useEffect(() => {
    // Select all products by default
    setSelectedProducts(new Set(lowStockProducts.map(p => p.productId)));
  }, [lowStockProducts]);

  const toggleProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const toggleAll = () => {
    if (selectedProducts.size === lowStockProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(lowStockProducts.map(p => p.productId)));
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {language === 'ar' ? 'التجديد التلقائي' : 'Auto Replenishment'}
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={checkLowStock}
              disabled={checking}
            >
              <RefreshCw className={`h-4 w-4 me-2 ${checking ? 'animate-spin' : ''}`} />
              {language === 'ar' ? 'فحص المخزون' : 'Check Stock'}
            </Button>
            {lowStockProducts.length > 0 && (
              <Button 
                size="sm" 
                onClick={createAllReplenishmentOrders}
                disabled={creatingOrders || selectedProducts.size === 0}
              >
                <ShoppingCart className="h-4 w-4 me-2" />
                {language === 'ar' ? 'إنشاء أوامر الشراء' : 'Create PO'}
                {selectedProducts.size > 0 && (
                  <Badge variant="secondary" className="ms-2">
                    {selectedProducts.size}
                  </Badge>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {checking ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : lowStockProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mb-2 opacity-50" />
            <p>{language === 'ar' ? 'جميع المنتجات في مستوى مخزون جيد' : 'All products have adequate stock'}</p>
            <Button variant="link" onClick={checkLowStock}>
              {language === 'ar' ? 'فحص مرة أخرى' : 'Check again'}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4 p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span className="text-sm">
                {language === 'ar' 
                  ? `${lowStockProducts.length} منتجات أقل من نقطة إعادة الطلب`
                  : `${lowStockProducts.length} products below reorder point`
                }
              </span>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedProducts.size === lowStockProducts.length}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'الكمية الحالية' : 'Current Qty'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'نقطة الطلب' : 'Reorder Point'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'الكمية المقترحة' : 'Suggested Qty'}</TableHead>
                  <TableHead>{language === 'ar' ? 'المورد' : 'Supplier'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockProducts.map((product) => (
                  <TableRow key={product.productId}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedProducts.has(product.productId)}
                        onCheckedChange={() => toggleProduct(product.productId)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{product.productName}</p>
                        <p className="text-xs text-muted-foreground">{product.sku}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <TrendingDown className="h-4 w-4 text-destructive" />
                        <span className="font-medium text-destructive">{product.currentQuantity}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{product.reorderPoint}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{product.suggestedOrderQuantity}</Badge>
                    </TableCell>
                    <TableCell>
                      {product.supplierName || (
                        <span className="text-muted-foreground text-sm">
                          {language === 'ar' ? 'غير محدد' : 'Not specified'}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
};
