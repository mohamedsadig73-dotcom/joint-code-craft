// Shared utilities for the desktop update flow.

export function compareVersions(a?: string, b?: string): number {
  if (!a || !b) return 0;
  const ra = a.split('.').map((n) => Number(n) || 0);
  const rb = b.split('.').map((n) => Number(n) || 0);
  for (let i = 0; i < Math.max(ra.length, rb.length); i++) {
    const diff = (ra[i] ?? 0) - (rb[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

export type ErrorClassification = {
  code: 'EPERM' | 'EACCES' | 'EBUSY' | 'ENOTFOUND' | 'ETIMEDOUT' | 'ECONNREFUSED' | 'HTTP' | 'EXTRACT' | 'NETWORK' | 'UNKNOWN';
  titleKey: string;
  hintKey: string;
};

/**
 * Classify a raw error message coming from the Electron updater (download/extract/install)
 * or a browser fetch failure into a user-actionable hint key.
 */
export function classifyUpdateError(message: string): ErrorClassification {
  const m = (message || '').toLowerCase();

  if (m.includes('eperm') || m.includes('operation not permitted')) {
    return { code: 'EPERM', titleKey: 'errEPERMTitle', hintKey: 'errEPERMHint' };
  }
  if (m.includes('eacces') || m.includes('permission denied')) {
    return { code: 'EACCES', titleKey: 'errEACCESTitle', hintKey: 'errEACCESHint' };
  }
  if (m.includes('ebusy') || m.includes('resource busy') || m.includes('locked')) {
    return { code: 'EBUSY', titleKey: 'errEBUSYTitle', hintKey: 'errEBUSYHint' };
  }
  if (m.includes('enotfound') || m.includes('getaddrinfo')) {
    return { code: 'ENOTFOUND', titleKey: 'errENOTFOUNDTitle', hintKey: 'errENOTFOUNDHint' };
  }
  if (m.includes('etimedout') || m.includes('timeout')) {
    return { code: 'ETIMEDOUT', titleKey: 'errETIMEDOUTTitle', hintKey: 'errETIMEDOUTHint' };
  }
  if (m.includes('econnrefused') || m.includes('connection refused')) {
    return { code: 'ECONNREFUSED', titleKey: 'errECONNREFUSEDTitle', hintKey: 'errECONNREFUSEDHint' };
  }
  if (m.includes('http 4') || m.includes('http 5') || m.match(/\b(403|404|500|502|503|504)\b/)) {
    return { code: 'HTTP', titleKey: 'errHTTPTitle', hintKey: 'errHTTPHint' };
  }
  if (m.includes('zip') || m.includes('extract') || m.includes('expand-archive') || m.includes('no dist folder')) {
    return { code: 'EXTRACT', titleKey: 'errEXTRACTTitle', hintKey: 'errEXTRACTHint' };
  }
  if (m.includes('failed to fetch') || m.includes('network') || m.includes('cors')) {
    return { code: 'NETWORK', titleKey: 'errNETWORKTitle', hintKey: 'errNETWORKHint' };
  }
  return { code: 'UNKNOWN', titleKey: 'errUNKNOWNTitle', hintKey: 'errUNKNOWNHint' };
}

/** Sleep helper for backoff retry logic. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
