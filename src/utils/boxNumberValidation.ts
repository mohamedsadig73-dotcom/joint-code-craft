import { z } from 'zod';

/**
 * Validates and formats box numbers (B-01, B-02, B-100, etc.).
 * Format is enforced as a soft warning — invalid formats are still allowed.
 */
export const BOX_NO_PATTERN = /^B-\d{2,3}$/;

export function isValidBoxNo(boxNo: string): boolean {
  return BOX_NO_PATTERN.test(boxNo.trim());
}

export function normalizeBoxNo(input: string): string {
  const trimmed = input.trim().toUpperCase();
  // Allow shorthand: "1" -> "B-01", "12" -> "B-12"
  const numOnly = /^\d{1,3}$/.exec(trimmed);
  if (numOnly) {
    const n = numOnly[0];
    return `B-${n.padStart(2, '0')}`;
  }
  return trimmed;
}

export const receiptSchema = z.object({
  supplier: z.string().trim().min(1, { message: 'required' }).max(255),
  part_no: z.string().trim().min(1, { message: 'required' }).max(100),
  description: z.string().trim().min(1, { message: 'required' }).max(500),
  qty: z.coerce.number().int().positive({ message: 'qtyMustBePositive' }),
  unit: z.enum(['PCS', 'SET', 'BOX', 'KG', 'MTR', 'LTR', 'PAIR']),
  destination: z.enum(['morocco', 'uzbekistan', 'unspecified']),
  place: z.string().trim().max(100).optional().nullable(),
  packing_type: z.enum(['boxed', 'loose']).default('boxed'),
  box_no: z.string().trim().max(50).nullable().optional(),
  receipt_date: z.string().min(1, { message: 'required' }),
  status: z.enum(['received', 'sorted', 'packed', 'shipped']),
  notes: z.string().trim().max(1000).optional().nullable(),
  image_path: z.string().optional().nullable(),
}).superRefine((val, ctx) => {
  if (val.packing_type === 'boxed' && (!val.box_no || val.box_no.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['box_no'],
      message: 'boxNoRequiredForBoxed',
    });
  }
});

export type ReceiptFormValues = z.infer<typeof receiptSchema>;

export const BOX_UNITS = ['PCS', 'SET', 'BOX', 'KG', 'MTR', 'LTR', 'PAIR'] as const;
export const BOX_DESTINATIONS = ['morocco', 'uzbekistan', 'unspecified'] as const;
export const BOX_STATUSES = ['received', 'sorted', 'packed', 'shipped'] as const;
export const PACKING_TYPES = ['boxed', 'loose'] as const;

export type BoxUnit = (typeof BOX_UNITS)[number];
export type BoxDestination = (typeof BOX_DESTINATIONS)[number];
export type BoxStatus = (typeof BOX_STATUSES)[number];
export type PackingType = (typeof PACKING_TYPES)[number];