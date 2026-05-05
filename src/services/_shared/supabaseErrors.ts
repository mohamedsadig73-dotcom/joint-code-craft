/**
 * Centralized error mapping for Supabase calls inside services.
 * Services throw `ServiceError` so React Query / hook layers can surface
 * a consistent message + code, regardless of the underlying provider.
 */
import type { PostgrestError } from '@supabase/supabase-js';

export type ServiceErrorCode =
  | 'unauthorized'
  | 'validation'
  | 'not_found'
  | 'conflict'
  | 'rls_denied'
  | 'unknown';

export class ServiceError extends Error {
  code: ServiceErrorCode;
  cause?: unknown;
  constructor(code: ServiceErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.cause = cause;
  }
}

export function fromPostgrest(err: PostgrestError | null | undefined, fallback = 'Database error'): ServiceError {
  if (!err) return new ServiceError('unknown', fallback);
  // Postgres / PostgREST common error codes
  if (err.code === '23505') return new ServiceError('conflict', err.message, err);
  if (err.code === '42501') return new ServiceError('rls_denied', err.message, err);
  if (err.code === 'PGRST116') return new ServiceError('not_found', err.message, err);
  return new ServiceError('unknown', err.message || fallback, err);
}

export function assert(condition: unknown, code: ServiceErrorCode, message: string): asserts condition {
  if (!condition) throw new ServiceError(code, message);
}