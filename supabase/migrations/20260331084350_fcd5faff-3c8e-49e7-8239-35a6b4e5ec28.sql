
-- Move pgcrypto to extensions schema (best practice)
DROP EXTENSION IF EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;
