import { supabase } from '@/integrations/supabase/client';

type PickingStrategy = 'FIFO' | 'FEFO' | 'LIFO';

interface InventoryItem {
  id: string;
  product_id: string;
  location_id: string;
  quantity: number;
  available_quantity: number | null;
  received_date: string | null;
  expiry_date: string | null;
  lot_number: string | null;
  serial_number: string | null;
}

interface PickingSuggestion {
  inventory_id: string;
  location_id: string;
  quantity: number;
  lot_number: string | null;
  serial_number: string | null;
  expiry_date: string | null;
  received_date: string | null;
  reason: string;
}

/**
 * Hook for implementing picking strategies (FIFO, FEFO, LIFO)
 * 
 * FIFO (First In, First Out): Pick items that were received first
 * FEFO (First Expired, First Out): Pick items that expire soonest
 * LIFO (Last In, First Out): Pick items that were received last
 */
export function usePickingStrategy() {
  
  /**
   * Get the picking strategy for a product
   */
  const getProductStrategy = async (productId: string): Promise<PickingStrategy> => {
    const { data, error } = await supabase
      .from('wms_products')
      .select('picking_strategy, requires_expiry_tracking')
      .eq('id', productId)
      .single();

    if (error || !data) {
      return 'FIFO'; // Default to FIFO
    }

    // If product tracks expiry, default to FEFO unless otherwise specified
    if (data.requires_expiry_tracking && !data.picking_strategy) {
      return 'FEFO';
    }

    return (data.picking_strategy as PickingStrategy) || 'FIFO';
  };

  /**
   * Get inventory items sorted by picking strategy
   */
  const getInventoryByStrategy = async (
    productId: string,
    strategy?: PickingStrategy
  ): Promise<InventoryItem[]> => {
    const actualStrategy = strategy || await getProductStrategy(productId);

    const { data, error } = await supabase
      .from('wms_inventory')
      .select('*')
      .eq('product_id', productId)
      .eq('status', 'available')
      .gt('available_quantity', 0);

    if (error || !data) {
      return [];
    }

    // Sort based on strategy
    return sortByStrategy(data, actualStrategy);
  };

  /**
   * Sort inventory items based on picking strategy
   */
  const sortByStrategy = (items: InventoryItem[], strategy: PickingStrategy): InventoryItem[] => {
    return [...items].sort((a, b) => {
      switch (strategy) {
        case 'FIFO':
          // First In, First Out - oldest received_date first
          const aReceived = a.received_date ? new Date(a.received_date).getTime() : 0;
          const bReceived = b.received_date ? new Date(b.received_date).getTime() : 0;
          return aReceived - bReceived;

        case 'FEFO':
          // First Expired, First Out - earliest expiry_date first
          // Items without expiry date go last
          if (!a.expiry_date && !b.expiry_date) return 0;
          if (!a.expiry_date) return 1;
          if (!b.expiry_date) return -1;
          return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();

        case 'LIFO':
          // Last In, First Out - newest received_date first
          const aReceivedLIFO = a.received_date ? new Date(a.received_date).getTime() : 0;
          const bReceivedLIFO = b.received_date ? new Date(b.received_date).getTime() : 0;
          return bReceivedLIFO - aReceivedLIFO;

        default:
          return 0;
      }
    });
  };

  /**
   * Get picking suggestions for a required quantity
   */
  const getPickingSuggestions = async (
    productId: string,
    requiredQuantity: number,
    strategy?: PickingStrategy
  ): Promise<PickingSuggestion[]> => {
    const actualStrategy = strategy || await getProductStrategy(productId);
    const inventory = await getInventoryByStrategy(productId, actualStrategy);

    const suggestions: PickingSuggestion[] = [];
    let remainingQuantity = requiredQuantity;

    for (const item of inventory) {
      if (remainingQuantity <= 0) break;

      const availableQty = item.available_quantity || item.quantity;
      const pickQuantity = Math.min(availableQty, remainingQuantity);

      let reason = '';
      switch (actualStrategy) {
        case 'FIFO':
          reason = item.received_date 
            ? `Received on ${new Date(item.received_date).toLocaleDateString()}`
            : 'Oldest stock';
          break;
        case 'FEFO':
          reason = item.expiry_date
            ? `Expires on ${new Date(item.expiry_date).toLocaleDateString()}`
            : 'No expiry date';
          break;
        case 'LIFO':
          reason = item.received_date
            ? `Received on ${new Date(item.received_date).toLocaleDateString()}`
            : 'Newest stock';
          break;
      }

      suggestions.push({
        inventory_id: item.id,
        location_id: item.location_id,
        quantity: pickQuantity,
        lot_number: item.lot_number,
        serial_number: item.serial_number,
        expiry_date: item.expiry_date,
        received_date: item.received_date,
        reason,
      });

      remainingQuantity -= pickQuantity;
    }

    return suggestions;
  };

  /**
   * Validate if a picking selection follows the strategy
   */
  const validatePickingSelection = async (
    productId: string,
    selectedInventoryId: string
  ): Promise<{ valid: boolean; warning?: string }> => {
    const strategy = await getProductStrategy(productId);
    const sortedInventory = await getInventoryByStrategy(productId, strategy);

    if (sortedInventory.length === 0) {
      return { valid: false, warning: 'No inventory available' };
    }

    const recommendedItem = sortedInventory[0];
    const selectedIndex = sortedInventory.findIndex(item => item.id === selectedInventoryId);

    if (selectedIndex === -1) {
      return { valid: false, warning: 'Selected inventory not found or not available' };
    }

    if (selectedIndex === 0) {
      return { valid: true };
    }

    // Not the recommended item - generate warning
    let warning = '';
    switch (strategy) {
      case 'FIFO':
        warning = `Warning: There is older stock available (received ${recommendedItem.received_date ? new Date(recommendedItem.received_date).toLocaleDateString() : 'earlier'}). Consider picking that first.`;
        break;
      case 'FEFO':
        warning = `Warning: There is stock expiring sooner (${recommendedItem.expiry_date ? new Date(recommendedItem.expiry_date).toLocaleDateString() : 'soon'}). Consider picking that first.`;
        break;
      case 'LIFO':
        warning = `Warning: There is newer stock available (received ${recommendedItem.received_date ? new Date(recommendedItem.received_date).toLocaleDateString() : 'later'}). Consider picking that first.`;
        break;
    }

    return { valid: true, warning };
  };

  /**
   * Update product picking strategy
   */
  const updateProductStrategy = async (productId: string, strategy: PickingStrategy): Promise<boolean> => {
    const { error } = await supabase
      .from('wms_products')
      .update({ picking_strategy: strategy })
      .eq('id', productId);

    return !error;
  };

  return {
    getProductStrategy,
    getInventoryByStrategy,
    getPickingSuggestions,
    validatePickingSelection,
    updateProductStrategy,
    sortByStrategy,
  };
}
