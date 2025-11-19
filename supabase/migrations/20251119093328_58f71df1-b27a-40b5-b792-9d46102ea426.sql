-- Update declaration_status enum to include the full workflow
ALTER TYPE declaration_status RENAME TO declaration_status_old;

CREATE TYPE declaration_status AS ENUM (
  'draft',
  'pending_warehouse_signature',
  'warehouse_signed',
  'sent_to_admin_office',
  'received_by_admin_office',
  'returned_to_warehouse',
  'archived',
  'rejected'
);

-- Update the declarations table to use the new enum
ALTER TABLE declarations 
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE declarations 
  ALTER COLUMN status TYPE declaration_status 
  USING (
    CASE status::text
      WHEN 'unsigned' THEN 'draft'::declaration_status
      WHEN 'pending' THEN 'pending_warehouse_signature'::declaration_status
      WHEN 'approved' THEN 'warehouse_signed'::declaration_status
      WHEN 'archived' THEN 'archived'::declaration_status
      ELSE 'draft'::declaration_status
    END
  );

ALTER TABLE declarations 
  ALTER COLUMN status SET DEFAULT 'draft'::declaration_status;

-- Drop old enum
DROP TYPE declaration_status_old;