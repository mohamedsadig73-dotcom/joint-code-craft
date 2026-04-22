import type { BoxReceipt } from '@/hooks/useBoxReceipts';

export interface DuplicateGroup {
  key: string;
  part_no: string;
  box_no: string | null;
  destination: string;
  receipts: BoxReceipt[];
  totalQty: number;
}

/**
 * Group active receipts by (part_no, box_no, destination) and return groups
 * that contain more than one record. These are flagged as candidate duplicates
 * inside the same physical container/destination.
 */
export function findDuplicateGroups(receipts: BoxReceipt[]): DuplicateGroup[] {
  const map = new Map<string, BoxReceipt[]>();
  for (const r of receipts) {
    if (r.deleted_at) continue;
    const key = `${r.part_no}__${r.box_no ?? '_'}__${r.destination}`;
    const arr = map.get(key) ?? [];
    arr.push(r);
    map.set(key, arr);
  }
  const groups: DuplicateGroup[] = [];
  for (const [key, arr] of map.entries()) {
    if (arr.length < 2) continue;
    const first = arr[0];
    groups.push({
      key,
      part_no: first.part_no,
      box_no: first.box_no,
      destination: first.destination,
      receipts: arr,
      totalQty: arr.reduce((s, r) => s + r.qty, 0),
    });
  }
  return groups.sort((a, b) => b.receipts.length - a.receipts.length);
}

export function countMergedRecords(receipts: BoxReceipt[]): number {
  // Records that were soft-deleted with a "merged into" note marker
  return receipts.filter(
    (r) => !!r.deleted_at && (r.notes ?? '').toLowerCase().includes('merged into')
  ).length;
}

export interface ImportDuplicateMatch<T> {
  input: T;
  existing: BoxReceipt;
}

/**
 * For an array of import inputs, find any that match an existing active receipt
 * by (part_no, box_no, destination).
 */
export function findImportDuplicates<
  T extends { part_no: string; box_no: string | null; destination: string }
>(inputs: T[], existing: BoxReceipt[]): {
  duplicates: ImportDuplicateMatch<T>[];
  uniques: T[];
} {
  const idx = new Map<string, BoxReceipt>();
  for (const r of existing) {
    if (r.deleted_at) continue;
    idx.set(`${r.part_no}__${r.box_no ?? '_'}__${r.destination}`, r);
  }
  const duplicates: ImportDuplicateMatch<T>[] = [];
  const uniques: T[] = [];
  for (const input of inputs) {
    const key = `${input.part_no}__${input.box_no ?? '_'}__${input.destination}`;
    const found = idx.get(key);
    if (found) duplicates.push({ input, existing: found });
    else uniques.push(input);
  }
  return { duplicates, uniques };
}