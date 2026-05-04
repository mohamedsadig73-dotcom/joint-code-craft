import { z } from 'zod';

const ar = {
  required: 'هذا الحقل مطلوب',
  partNoFormat: 'رمز القطعة يجب أن يحتوي على أحرف/أرقام فقط',
  tooShort: 'النص قصير جداً',
  tooLong: 'النص طويل جداً',
  numberPositive: 'يجب أن يكون رقماً موجباً',
  maxLessThanMin: 'الحد الأقصى يجب أن يكون أكبر من الحد الأدنى',
  categoryRequired: 'يجب اختيار التصنيف قبل حفظ الصنف',
};

export const itemSchema = z
  .object({
    part_no: z
      .string()
      .trim()
      .min(2, ar.tooShort)
      .max(60, ar.tooLong)
      .regex(/^[A-Za-z0-9\u0600-\u06FF\-_./\s]+$/, ar.partNoFormat),
    description: z.string().trim().min(2, ar.tooShort).max(300, ar.tooLong),
    name_ar: z.string().trim().max(150, ar.tooLong).optional().nullable(),
    name_en: z.string().trim().max(150, ar.tooLong).optional().nullable(),
    brand: z.string().trim().max(80, ar.tooLong).optional().nullable(),
    model_no: z.string().trim().max(80, ar.tooLong).optional().nullable(),
    plate_no: z.string().trim().max(80, ar.tooLong).optional().nullable(),
    barcode: z.string().trim().max(80, ar.tooLong).optional().nullable(),
    default_unit: z.string().trim().min(1, ar.required),
    default_supplier: z.string().trim().max(150).optional().nullable(),
    supplier_id: z.string().uuid().nullable().optional(),
    category_id: z.string().uuid().nullable().optional(),
    item_type: z.enum(['item', 'service', 'asset']).optional(),
    condition: z.enum(['good', 'damaged']).optional(),
    min_qty: z.number().min(0, ar.numberPositive).nullable().optional(),
    max_qty: z.number().min(0, ar.numberPositive).nullable().optional(),
    has_expiry: z.boolean().optional().nullable(),
    notes: z.string().max(1000, ar.tooLong).optional().nullable(),
    is_active: z.boolean().optional(),
    image_path: z.string().nullable().optional(),
  })
  .refine(
    (v) => v.max_qty == null || v.min_qty == null || v.max_qty >= v.min_qty,
    { path: ['max_qty'], message: ar.maxLessThanMin }
  );

export type ItemSchema = z.infer<typeof itemSchema>;

export function validateItem(values: unknown): {
  ok: boolean;
  errors: Record<string, string>;
} {
  const result = itemSchema.safeParse(values);
  if (result.success) return { ok: true, errors: {} };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const k = issue.path.join('.') || '_';
    if (!errors[k]) errors[k] = issue.message;
  }
  return { ok: false, errors };
}