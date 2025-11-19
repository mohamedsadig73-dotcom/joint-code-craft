-- تحديث enum لنوع الإقرار إلى دخول وخروج فقط
ALTER TYPE declaration_type RENAME TO declaration_type_old;

CREATE TYPE declaration_type AS ENUM ('دخول', 'خروج');

-- تحديث جدول الإقرارات
ALTER TABLE declarations 
  ALTER COLUMN type TYPE declaration_type 
  USING CASE 
    WHEN type::text = 'Import' THEN 'دخول'::declaration_type
    WHEN type::text = 'Export' THEN 'خروج'::declaration_type
    WHEN type::text = 'Transit' THEN 'دخول'::declaration_type
    ELSE 'دخول'::declaration_type
  END;

DROP TYPE declaration_type_old;