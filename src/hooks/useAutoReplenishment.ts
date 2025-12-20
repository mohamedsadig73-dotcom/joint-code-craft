import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LowStockProduct {
  productId: string;
  productName: string;
  sku: string;
  currentQuantity: number;
  reorderPoint: number;
  minStockLevel: number;
  suggestedOrderQuantity: number;
  supplierId?: string;
  supplierName?: string;
}

interface ReplenishmentOrder {
  productId: string;
  quantity: number;
  supplierId?: string;
}

export function useAutoReplenishment(language: string = 'en') {
  const [checking, setChecking] = useState(false);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [creatingOrders, setCreatingOrders] = useState(false);

  const checkLowStock = useCallback(async () => {
    setChecking(true);
    try {
      // Get all products with their inventory
      const { data: products, error: productsError } = await supabase
        .from('wms_products')
        .select('id, name, sku, min_stock_level, reorder_point, max_stock_level')
        .eq('is_active', true);

      if (productsError) throw productsError;

      // Get inventory summary per product
      const { data: inventory, error: invError } = await supabase
        .from('wms_inventory')
        .select('product_id, quantity');

      if (invError) throw invError;

      // Calculate total quantity per product
      const inventoryMap: Record<string, number> = {};
      (inventory || []).forEach(inv => {
        inventoryMap[inv.product_id] = (inventoryMap[inv.product_id] || 0) + inv.quantity;
      });

      // Get supplier info from recent inbound orders
      const { data: inboundLines } = await supabase
        .from('wms_inbound_lines')
        .select('product_id, inbound_order:wms_inbound_orders(supplier_id, supplier:wms_suppliers(id, name))')
        .order('created_at', { ascending: false });

      const supplierMap: Record<string, { id: string; name: string }> = {};
      (inboundLines || []).forEach(line => {
        if (!supplierMap[line.product_id]) {
          const order = line.inbound_order as any;
          if (order?.supplier) {
            supplierMap[line.product_id] = {
              id: order.supplier.id,
              name: order.supplier.name
            };
          }
        }
      });

      // Find products below reorder point
      const lowStock: LowStockProduct[] = [];
      (products || []).forEach(product => {
        const currentQty = inventoryMap[product.id] || 0;
        const reorderPoint = product.reorder_point || product.min_stock_level || 10;
        const minStock = product.min_stock_level || 0;
        const maxStock = product.max_stock_level || (reorderPoint * 3);

        if (currentQty <= reorderPoint) {
          const suggestedQty = Math.max(maxStock - currentQty, reorderPoint * 2);
          lowStock.push({
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            currentQuantity: currentQty,
            reorderPoint,
            minStockLevel: minStock,
            suggestedOrderQuantity: Math.ceil(suggestedQty),
            supplierId: supplierMap[product.id]?.id,
            supplierName: supplierMap[product.id]?.name
          });
        }
      });

      setLowStockProducts(lowStock);
      
      if (lowStock.length > 0) {
        toast.warning(
          language === 'ar' 
            ? `${lowStock.length} منتجات تحتاج إعادة طلب`
            : `${lowStock.length} products need replenishment`
        );
      } else {
        toast.success(
          language === 'ar'
            ? 'جميع المنتجات في مستوى مخزون جيد'
            : 'All products have adequate stock levels'
        );
      }

      return lowStock;
    } catch (error) {
      console.error('Error checking low stock:', error);
      toast.error(language === 'ar' ? 'خطأ في فحص المخزون' : 'Error checking stock levels');
      return [];
    } finally {
      setChecking(false);
    }
  }, [language]);

  const createReplenishmentOrders = useCallback(async (orders: ReplenishmentOrder[]) => {
    setCreatingOrders(true);
    try {
      // Group orders by supplier
      const ordersBySupplier: Record<string, ReplenishmentOrder[]> = {};
      orders.forEach(order => {
        const key = order.supplierId || 'no-supplier';
        if (!ordersBySupplier[key]) ordersBySupplier[key] = [];
        ordersBySupplier[key].push(order);
      });

      let createdCount = 0;

      for (const [supplierId, supplierOrders] of Object.entries(ordersBySupplier)) {
        // Generate order number
        const { data: orderNumber } = await supabase.rpc('generate_wms_order_number', { prefix: 'IN' });

        // Create inbound order
        const { data: inboundOrder, error: orderError } = await supabase
          .from('wms_inbound_orders')
          .insert({
            order_number: orderNumber || `IN-AUTO-${Date.now()}`,
            supplier_id: supplierId === 'no-supplier' ? null : supplierId,
            status: 'draft',
            notes: language === 'ar' ? 'طلب تجديد تلقائي' : 'Auto-replenishment order',
            expected_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Create order lines
        const lines = supplierOrders.map(order => ({
          inbound_order_id: inboundOrder.id,
          product_id: order.productId,
          expected_quantity: order.quantity,
          status: 'pending'
        }));

        const { error: linesError } = await supabase
          .from('wms_inbound_lines')
          .insert(lines);

        if (linesError) throw linesError;
        createdCount++;
      }

      toast.success(
        language === 'ar'
          ? `تم إنشاء ${createdCount} أوامر شراء`
          : `Created ${createdCount} purchase orders`
      );

      // Clear low stock list after creating orders
      setLowStockProducts([]);

      return true;
    } catch (error) {
      console.error('Error creating replenishment orders:', error);
      toast.error(
        language === 'ar'
          ? 'خطأ في إنشاء أوامر الشراء'
          : 'Error creating purchase orders'
      );
      return false;
    } finally {
      setCreatingOrders(false);
    }
  }, [language]);

  const createAllReplenishmentOrders = useCallback(async () => {
    if (lowStockProducts.length === 0) {
      toast.info(
        language === 'ar'
          ? 'لا توجد منتجات تحتاج إعادة طلب'
          : 'No products need replenishment'
      );
      return;
    }

    const orders: ReplenishmentOrder[] = lowStockProducts.map(p => ({
      productId: p.productId,
      quantity: p.suggestedOrderQuantity,
      supplierId: p.supplierId
    }));

    await createReplenishmentOrders(orders);
  }, [lowStockProducts, createReplenishmentOrders, language]);

  return {
    checking,
    creatingOrders,
    lowStockProducts,
    checkLowStock,
    createReplenishmentOrders,
    createAllReplenishmentOrders
  };
}
