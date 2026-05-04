/**
 * Legacy Navigation component — converted to a no-op after the unified
 * AppShell (Sidebar) was activated globally in App.tsx.
 *
 * Pages may still import <Navigation /> safely: it renders nothing, so the
 * shell chrome (sidebar, header, notifications, theme/lang toggles) is
 * provided exclusively by AppShell.
 *
 * Accepts any props (e.g. legacy `minimal`) without effect, to preserve all
 * existing call sites across the codebase.
 */
export function Navigation(_props: Record<string, unknown> = {}) {
  return null;
}

export default Navigation;
