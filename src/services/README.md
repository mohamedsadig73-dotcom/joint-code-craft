# Services Layer (Sprint 2 — P2)

## Purpose
Single, framework-agnostic boundary between the app and Supabase.
Services know **nothing** about React, hooks, toasts, or i18n. They take
typed payloads, talk to the database, validate, and return typed results
(or throw `ServiceError`).

## Rules
1. **Only files inside `src/services/` may import `@/integrations/supabase/client`.**
2. Services must not import from `react`, `@/hooks/`, `@/components/`,
   `@/contexts/`, or `@/pages/`.
3. All errors must be normalized via `_shared/supabaseErrors.ts`.
4. Service functions are pure async functions — no global state, no caching.
   Caching belongs in the React Query hook layer (`src/hooks/data/`).
5. Each service file groups one **bounded context** (vouchers, inventory,
   boxes, maintenance, employees, petty cash).

## Layers
```
UI (pages, components)
    │  uses
    ▼
Hooks (src/hooks/data/) — React Query wrappers, toasts, i18n
    │  calls
    ▼
Services (src/services/) — pure async, normalized errors
    │  uses
    ▼
Supabase client (src/integrations/supabase/client.ts)
```

## Migration Strategy (Strangler Pattern)
- New code goes through services immediately.
- Existing hooks (`useInventory`, `useBoxReceipts`, etc.) are migrated one
  at a time. Until migrated, both paths coexist — no big-bang rewrite.