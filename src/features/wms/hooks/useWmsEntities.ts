/**
 * Named, type-safe wrappers around `useSupabaseList` for the WMS module.
 * These are thin facades — keep new business logic out of here. Add a
 * dedicated hook file once a domain grows beyond a basic list query.
 */
import { useSupabaseList } from './useSupabaseList';

export interface WmsItem {
  id: string; part_no: string; description: string;
  default_unit: string; name_ar: string | null; name_en: string | null;
  is_active: boolean; image_path: string | null;
  category_id: string | null; min_qty: number | null; max_qty: number | null;
  created_at: string;
}

export interface WmsStockRow {
  id: string; item_id: string; warehouse_id: string;
  location_id: string | null; qty: number; last_movement_at: string | null;
}

export interface WmsTxnRow {
  id: string; txn_no: string; txn_type: 'in' | 'out' | 'transfer' | 'return';
  txn_date: string; status: 'draft' | 'posted' | 'cancelled';
  party_name: string | null; reference: string | null;
  from_warehouse_id: string | null; to_warehouse_id: string | null;
  created_at: string;
}

export interface WmsTransferRequestRow {
  id: string; request_no: string; request_date: string;
  from_warehouse_id: string; to_warehouse_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'cancelled';
  reason: string | null; created_at: string;
}

/** All items (active + inactive) ordered newest-first. */
export const useWmsItems = () =>
  useSupabaseList<WmsItem>({
    table: 'items_master',
    select: 'id,part_no,description,default_unit,name_ar,name_en,is_active,image_path,category_id,min_qty,max_qty,created_at',
    orderBy: { column: 'created_at', ascending: false },
  });

/** Live stock snapshot across all warehouses/locations. */
export const useWmsStock = () =>
  useSupabaseList<WmsStockRow>({
    table: 'inv_stock',
    select: 'id,item_id,warehouse_id,location_id,qty,last_movement_at',
    orderBy: { column: 'last_movement_at', ascending: false },
  });

/** Receipts (txn_type='in') — non-deleted, latest first. */
export const useWmsReceipts = () =>
  useSupabaseList<WmsTxnRow>({
    table: 'inv_transactions',
    select: 'id,txn_no,txn_type,txn_date,status,party_name,reference,from_warehouse_id,to_warehouse_id,created_at',
    filterDeleted: true,
    orderBy: { column: 'created_at', ascending: false },
  });

/** Issues (txn_type='out') — non-deleted, latest first. */
export const useWmsIssues = useWmsReceipts; // same source, callers filter by txn_type

/** Transfer requests workflow. */
export const useWmsTransferRequests = () =>
  useSupabaseList<WmsTransferRequestRow>({
    table: 'wms_transfer_requests',
    select: 'id,request_no,request_date,from_warehouse_id,to_warehouse_id,status,reason,created_at',
    orderBy: { column: 'created_at', ascending: false },
  });