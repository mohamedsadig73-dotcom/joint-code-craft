import type { BoxReceipt } from '@/hooks/useBoxReceipts';

export type DuplicateField = 'part_no' | 'box_no' | 'destination' | 'supplier' | 'invoice_number';

export interface DuplicateRules {
  fields: DuplicateField[];
  /** When true, the form blocks save on duplicate. When false, only warns. */
  block_on_save: boolean;
}

export const DEFAULT_DUPLICATE_RULES: DuplicateRules = {
  fields: ['part_no', 'box_no', 'destination'],
  block_on_save: false,
};

export const ALL_DUPLICATE_FIELDS: DuplicateField[] = [
  'part_no',
  'box_no',
  'destination',
  'supplier',
  'invoice_number',
];

function fieldValue(r: { part_no?: string | null; box_no?: string | null; destination?: string | null; supplier?: string | null; invoice_number?: string | null }, f: DuplicateField): string {
  const raw = (r as Record<string, unknown>)[f];
  if (raw === undefined || raw === null) return '_';
  return String(raw).trim().toLowerCase() || '_';
}

function buildKey(
  r: { part_no?: string | null; box_no?: string | null; destination?: string | null; supplier?: string | null; invoice_number?: string | null },
  rules: DuplicateRules
): string {
  const fields = rules.fields.length ? rules.fields : DEFAULT_DUPLICATE_RULES.fields;
  return fields.map((f) => `${f}=${fieldValue(r, f)}`).join('||');
}

export interface DuplicateGroup {
  key: string;
  part_no: string;
  box_no: string | null;
  destination: string;
  supplier: string | null;
  invoice_number: string | null;
  receipts: BoxReceipt[];
  totalQty: number;
}

/**
 * Group active receipts by (part_no, box_no, destination) and return groups
 * that contain more than one record. These are flagged as candidate duplicates
 * inside the same physical container/destination.
 */
export function findDuplicateGroups(
  receipts: BoxReceipt[],
  rules: DuplicateRules = DEFAULT_DUPLICATE_RULES
): DuplicateGroup[] {
  const map = new Map<string, BoxReceipt[]>();
  for (const r of receipts) {
    if (r.deleted_at) continue;
    const key = buildKey(r, rules);
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
      supplier: first.supplier ?? null,
      invoice_number: first.invoice_number ?? null,
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

export function findImportDuplicates<
  T extends {
    part_no: string;
    box_no: string | null;
    destination: string;
    supplier?: string | null;
    invoice_number?: string | null;
  }
>(
  inputs: T[],
  existing: BoxReceipt[],
  rules: DuplicateRules = DEFAULT_DUPLICATE_RULES
): {
  duplicates: ImportDuplicateMatch<T>[];
  uniques: T[];
} {
  const idx = new Map<string, BoxReceipt>();
  for (const r of existing) {
    if (r.deleted_at) continue;
    idx.set(buildKey(r, rules), r);
  }
  const duplicates: ImportDuplicateMatch<T>[] = [];
  const uniques: T[] = [];
  for (const input of inputs) {
    const key = buildKey(input, rules);
    const found = idx.get(key);
    if (found) duplicates.push({ input, existing: found });
    else uniques.push(input);
  }
  return { duplicates, uniques };
}

/**
 * Find an existing active receipt that would conflict with a candidate (excluding self).
 * Used by the receipt form to warn before save.
 */
export function findReceiptConflict(
  candidate: {
    part_no: string;
    box_no: string | null;
    destination: string;
    supplier?: string | null;
    invoice_number?: string | null;
  },
  existing: BoxReceipt[],
  rules: DuplicateRules = DEFAULT_DUPLICATE_RULES,
  excludeId?: string | null
): BoxReceipt | null {
  const candidateKey = buildKey(candidate, rules);
  for (const r of existing) {
    if (r.deleted_at) continue;
    if (excludeId && r.id === excludeId) continue;
    if (buildKey(r, rules) === candidateKey) return r;
  }
  return null;
}