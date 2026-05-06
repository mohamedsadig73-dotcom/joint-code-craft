# 📐 Architecture Refactor Plan (Phase 2)

> **Status:** Proposal — Pending approval  
> **Risk Level:** Low (extraction only, no logic/UI/DB changes)  
> **Priority:** Post-Release  

---

## 1️⃣ ReportsAnalytics.tsx (689 lines → ~5 files)

```
src/components/reports/
 ├─ ReportsHeader.tsx           # Filters + date range + title
 ├─ ReportsKPIs.tsx             # KPI cards section
 ├─ ReportsCharts.tsx           # Chart containers
 ├─ ReportsExport.tsx           # PDF / Excel export logic
 └─ useReportsData.ts           # Data fetching + transformations

src/pages/
 └─ ReportsAnalytics.tsx        # Shell orchestrator (~50 lines)
```

### Rules
- ✅ Extract UI into focused components
- ✅ Extract data logic into custom hook
- ❌ No UI changes
- ❌ No DB changes
- ❌ No business logic changes

---

## 2️⃣ LeaveTracking.tsx (895 lines → ~5 files)

```
src/components/leave-tracking/
 ├─ LeaveTable.tsx              # Table + mobile cards
 ├─ LeaveStats.tsx              # Summary statistics
 ├─ LeaveFilters.tsx            # Search + filter controls
 ├─ LeaveForm.tsx               # Create/Edit form dialog
 └─ useLeaveTracking.ts         # Data fetching + mutations

src/pages/
 └─ LeaveTracking.tsx           # Shell orchestrator (~50 lines)
```

### Rules
- ✅ Extract UI into focused components
- ✅ Extract data logic into custom hook
- ❌ No UI changes
- ❌ No DB changes
- ❌ No business logic changes

---

## Execution Guidelines

| Guideline | Detail |
|-----------|--------|
| **When** | After first stable release |
| **Duration** | ~2-3 hours per file |
| **Testing** | Visual regression only (no logic changes) |
| **Rollback** | Git revert (safe, no data impact) |

---

**Prepared by:** Lovable AI  
**Date:** 2026-02-09
