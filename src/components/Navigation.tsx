/**
 * Legacy Navigation component — converted to a no-op after the unified
 * AppShell (Sidebar) was activated globally in App.tsx.
 *
 * Pages may still import <Navigation /> safely: it renders nothing, so the
 * shell chrome (sidebar, header, notifications, theme/lang toggles) is
 * provided exclusively by AppShell.
 *
 * Kept as a named export to preserve all existing imports across the codebase.
 */
export function Navigation() {
  return null;
}

export default Navigation;
