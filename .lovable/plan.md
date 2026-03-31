

# Plan: Performance Fix, Auto-Update, and Stability Improvements

## Problem Summary

1. **Critical Bug**: Console shows "Maximum update depth exceeded" in `NotificationCenter` — a `DropdownMenu` is triggering infinite re-renders, likely from Radix UI state management interaction
2. **Auto-update for Electron**: Currently `UpdateChecker` shows a banner but requires manual download; user wants automatic download + install
3. **Performance**: General loading speed improvements needed

---

## Step 1: Fix NotificationCenter Infinite Re-render Loop

The console error traces to `NotificationCenter` inside a Radix `DropdownMenu`. The `onOpenChange` callback on the `DropdownMenu` is causing cascading setState calls.

**Fix**: Wrap `setIsOpen` in a stable callback and ensure the `DropdownMenu` `open`/`onOpenChange` props don't trigger re-renders of the entire notification list. Memoize the notifications list rendering.

**File**: `src/components/NotificationCenter.tsx`
- Wrap `onOpenChange` in `useCallback`
- Memoize notification items with `useMemo`
- Move `isRTL` computation to avoid re-computation

---

## Step 2: Enhance Auto-Update for Electron Desktop App

Currently `UpdateChecker` detects new versions but only does a force-reload (web behavior). For Electron, it should:
1. Detect if a new **desktop shell** version is available (via `desktop-release.json` on Supabase Storage)
2. Show download progress
3. Open the download link directly (since we can't do in-place binary updates without electron-updater)

**Files**:
- `src/components/UpdateChecker.tsx` — Add Electron-specific flow: fetch `desktop-release.json`, compare `desktop_shell_version`, show "Download New Version" button that opens the ZIP URL via `window.electronAPI.openExternal()`
- `electron/preload.cjs` — Already has `openExternal`, no changes needed
- Create `public/desktop-release.json` — Central metadata file with `desktop_shell_version`, `download_url`, `release_notes`

**Behavior**:
- Web users: existing reload behavior (unchanged)
- Electron users: "Download update" button opens the Supabase Storage ZIP link in the default browser

---

## Step 3: Performance Improvements

**3a. Lazy-load NotificationCenter** — It loads notifications on mount even if the dropdown is never opened. Defer the query until the dropdown is first opened.

**File**: `src/components/NotificationCenter.tsx`
- Only fetch notifications when `isOpen` becomes `true` for the first time
- Show skeleton inside dropdown on first open

**3b. Reduce Dashboard initial queries** — The dashboard fires multiple parallel queries on mount. Add a small stagger or combine where possible.

**File**: `src/hooks/useDashboardData.ts`
- Already looks reasonable; main optimization is ensuring `loadDeclarations` doesn't re-fire unnecessarily

**3c. Memoize expensive components** — Wrap `DashboardStats`, `DashboardFilters` with `React.memo` if not already done.

---

## Technical Details

### NotificationCenter fix (critical)
```
// Current: onOpenChange={setIsOpen} triggers re-render cascade
// Fix: stable callback + guard
const handleOpenChange = useCallback((open: boolean) => {
  setIsOpen(open);
  if (open && !hasFetched) {
    loadNotifications();
    setHasFetched(true);
  }
}, [hasFetched]);
```

### desktop-release.json structure
```json
{
  "desktop_shell_version": "4.3.4",
  "web_version": "4.3.4", 
  "download_url": "https://eplguuqpxuhgdagacypn.supabase.co/storage/v1/object/public/desktop-releases/DTS-Store-win32-x64-v4.zip",
  "release_notes": "Fixed black screen issue"
}
```

### UpdateChecker Electron flow
- Fetch `desktop-release.json` from Supabase Storage
- Compare `desktop_shell_version` with `__APP_VERSION__`
- If newer: show banner with "Download" button
- Button calls `window.electronAPI.openExternal(download_url)`

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/NotificationCenter.tsx` | Fix infinite re-render; lazy-load notifications |
| `src/components/UpdateChecker.tsx` | Add Electron auto-update download flow |
| `public/desktop-release.json` | New: central release metadata |
| `src/hooks/useDashboardData.ts` | Minor: guard against unnecessary re-fetches |

