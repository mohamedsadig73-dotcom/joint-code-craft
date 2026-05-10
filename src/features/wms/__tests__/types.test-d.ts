/**
 * Compile-time guard for WMS list generics.
 * If any of these assignments fail to type-check, `npx tsc --noEmit`
 * will fail in CI — preventing TS2344 regressions on Row/Item/Txn.
 *
 * This file is intentionally type-only (no runtime exports).
 */
import type { Column, WmsRowBase } from '../components';
import { WmsListShell } from '../components';
import { GenericListPage } from '../pages/_shared';

// 1) Row shape (Categories/Locations/Units/Warehouses)
interface RowSample extends WmsRowBase {
  id: string;
  code: string;
  name_ar: string;
  name_en: string | null;
  is_active?: boolean;
}

// 2) Item shape (Items master)
interface ItemSample extends WmsRowBase {
  id: string;
  part_no: string;
  description: string;
  default_unit: string;
}

// 3) Txn shape (Receipts/Issues/Transfers)
interface TxnSample extends WmsRowBase {
  id: string;
  txn_no: string;
  txn_type: string;
  status: string;
}

// 4) Numeric id row (legacy tables)
interface NumericRow extends WmsRowBase {
  id: number;
  label: string;
}

// Type-only assertions: each generic must accept these shapes.
type _Shells =
  | typeof WmsListShell<RowSample>
  | typeof WmsListShell<ItemSample>
  | typeof WmsListShell<TxnSample>
  | typeof WmsListShell<NumericRow>;

type _Pages =
  | typeof GenericListPage<RowSample>
  | typeof GenericListPage<ItemSample>
  | typeof GenericListPage<TxnSample>
  | typeof GenericListPage<NumericRow>;

// Column<T> must accept each row type.
const _cols: Column<RowSample>[] = [
  { key: 'code', header: 'Code', render: (r) => r.code },
];

// Suppress unused warnings deterministically.
export type __WmsTypeGuards = [_Shells, _Pages, typeof _cols];