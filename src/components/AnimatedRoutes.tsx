import { Suspense, lazy, memo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PageTransition } from '@/components/PageTransition';
import { Loader2 } from 'lucide-react';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { isChunkLoadError, trackChunkError } from '@/utils/chunkErrorTracking';

/**
 * Retry dynamic imports up to N times with exponential backoff.
 * On final failure, the error propagates to <RouteErrorBoundary> which
 * presents the user with retry / reload / home options instead of a blank screen.
 */
function lazyRetry<T extends { default: React.ComponentType<any> }>(
  factory: () => Promise<T>,
  retries = 2,
  baseDelay = 400
) {
  return lazy(async () => {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await factory();
      } catch (err) {
        lastErr = err;
        if (!isChunkLoadError(err)) throw err;
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, baseDelay * Math.pow(2, attempt)));
        }
      }
    }
    // Track and rethrow → ErrorBoundary handles UI
    trackChunkError(lastErr, true);
    throw lastErr;
  });
}

// Lazy load pages with preload hints for critical pages
const Login = lazyRetry(() => import('@/pages/Login'));
const ForgotPassword = lazyRetry(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazyRetry(() => import('@/pages/ResetPassword'));
const Home = lazyRetry(() => import('@/pages/Home'));
const SmartDashboard = lazyRetry(() => import('@/pages/SmartDashboard'));
const Dashboard = lazyRetry(() => import('@/pages/Dashboard'));
const AdminDashboard = lazyRetry(() => import('@/pages/AdminDashboard'));
const ReportsHub = lazyRetry(() => import('@/pages/ReportsHub'));
const Profile = lazyRetry(() => import('@/pages/Profile'));
const DeclarationDetails = lazyRetry(() => import('@/pages/DeclarationDetails'));
const Maintenance = lazyRetry(() => import('@/pages/Maintenance'));
const MaintenanceItemDetails = lazyRetry(() => import('@/pages/MaintenanceItemDetails'));
const AuditLogs = lazyRetry(() => import('@/pages/AuditLogs'));
const ManagerDashboard = lazyRetry(() => import('@/pages/ManagerDashboard'));
const InstallApp = lazyRetry(() => import('@/pages/InstallApp'));
const LeaveTracking = lazyRetry(() => import('@/pages/LeaveTracking'));
const PettyCash = lazyRetry(() => import('@/pages/PettyCash'));
const HolidayAttendance = lazyRetry(() => import('@/pages/HolidayAttendance'));
const HolidayAttendanceDetail = lazyRetry(() => import('@/pages/HolidayAttendanceDetail'));
const EmployeesManagement = lazyRetry(() => import('@/pages/EmployeesManagement'));
const UpdateLog = lazyRetry(() => import('@/pages/UpdateLog'));
const UpdateDiagnostics = lazyRetry(() => import('@/pages/UpdateDiagnostics'));
const BoxesManagement = lazyRetry(() => import('@/pages/BoxesManagement'));
const BoxCardPrint = lazyRetry(() => import('@/pages/BoxCardPrint'));
const ContainerDetails = lazyRetry(() => import('@/pages/ContainerDetails'));
const BoxesDataAdmin = lazyRetry(() => import('@/pages/BoxesDataAdmin'));
const ItemsHub = lazyRetry(() => import('@/pages/ItemsHub'));
const ItemNamingSystem = lazyRetry(() => import('@/pages/ItemNamingSystem'));
const SmartItemEntry = lazyRetry(() => import('@/pages/SmartItemEntry'));
const VouchersHub = lazyRetry(() => import('@/pages/VouchersHub'));
const ItemDetails = lazyRetry(() => import('@/pages/ItemDetails'));
const ItemBarcodePrint = lazyRetry(() => import('@/pages/ItemBarcodePrint'));
const PrintDiagnostics = lazyRetry(() => import('@/pages/PrintDiagnostics'));
const Inventory = lazyRetry(() => import('@/pages/Inventory'));
const WmsDashboard = lazyRetry(() => import('@/pages/WmsDashboard'));
const DataSetup = lazyRetry(() => import('@/pages/DataSetup'));
const AppSettingsPage = lazyRetry(() => import('@/pages/AppSettingsPage'));
const RlsDiagnosticsPage = lazyRetry(() => import('@/pages/admin/RlsDiagnosticsPage'));
const AdminSettingsHub = lazyRetry(() => import('@/pages/AdminSettingsHub'));
// StockAlerts & StockCounts merged into Inventory tabs (P2). ItemApprovals/ItemImageHistory/ItemsMasterImport merged into ItemsHub (P3-b).
const SupplierPriceImport = lazyRetry(() => import('@/pages/SupplierPriceImport'));
const NotFound = lazyRetry(() => import('@/pages/NotFound'));

// Lightweight Loading component
const PageLoader = memo(() => {
  // Use a simple fallback since this renders before LanguageContext may be available
  const loadingText = document.documentElement.lang === 'ar' ? 'جاري التحميل...' : 'Loading...';
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" role="status" aria-label="Loading">
      <Loader2 className="h-10 w-10 text-secondary animate-spin" />
      <p className="text-muted-foreground text-sm">{loadingText}</p>
    </div>
  );
});

export function AnimatedRoutes() {
  const { isAuthenticated, loading } = useAuth();

  // Only use isAuthenticated (not hasSession) to prevent routing loops
  // between AnimatedRoutes and ProtectedRoute
  const shouldShowAuthenticatedContent = isAuthenticated;

  return (
    <RouteErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route
            path="/login"
            element={
              loading ? (
                <PageLoader />
              ) : shouldShowAuthenticatedContent ? (
                <Navigate to="/" replace />
              ) : (
                <PageTransition>
                  <Login />
                </PageTransition>
              )
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PageTransition>
                <ForgotPassword />
              </PageTransition>
            }
          />
          <Route
            path="/reset-password"
            element={
              <PageTransition>
                <ResetPassword />
              </PageTransition>
            }
          />
          <Route
            path="/install"
            element={
              <PageTransition>
                <InstallApp />
              </PageTransition>
            }
          />
          {/* Root route - show role-aware Smart Dashboard (P3) */}
          <Route
            path="/"
            element={
              loading ? (
                <PageLoader />
              ) : shouldShowAuthenticatedContent ? (
                <ProtectedRoute>
                  <PageTransition>
                    <SmartDashboard />
                  </PageTransition>
                </ProtectedRoute>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          {/* Declarations module merged into Vouchers — redirect for backward compatibility */}
          <Route path="/declarations" element={<Navigate to="/vouchers?tab=receipt" replace />} />
          <Route path="/declarations/:id" element={<Navigate to="/vouchers?tab=receipt" replace />} />
          {/* Legacy /landing and /dashboard routes */}
          <Route path="/landing" element={<Navigate to="/" replace />} />
          <Route path="/dashboard" element={<Navigate to="/vouchers?tab=receipt" replace />} />
          <Route
            path="/reports-analytics"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <ReportsHub />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route path="/reports"   element={<Navigate to="/reports-analytics?type=declarations" replace />} />
          <Route path="/analytics" element={<Navigate to="/reports-analytics?type=declarations" replace />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <Profile />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/declaration/:id"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <DeclarationDetails />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/declaration/:id/timeline"
            element={<Navigate to="/declaration/:id" replace />}
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <PageTransition>
                  <AdminDashboard />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/maintenance"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <Maintenance />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/maintenance/item/:id"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <MaintenanceItemDetails />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/leave-tracking"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <LeaveTracking />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/petty-cash"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <PettyCash />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/holiday-attendance"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <HolidayAttendance />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/holiday-attendance/:id"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <HolidayAttendanceDetail />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <EmployeesManagement />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <ProtectedRoute requiredRole="admin">
                <PageTransition>
                  <AuditLogs />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager-dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <PageTransition>
                  <ManagerDashboard />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/update-log"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <UpdateLog />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/update-diagnostics"
            element={
              <ProtectedRoute requiredRole="admin">
                <PageTransition>
                  <UpdateDiagnostics />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/boxes"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <BoxesManagement />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/boxes/card/:boxNo"
            element={
              <ProtectedRoute>
                <BoxCardPrint />
              </ProtectedRoute>
            }
          />
          <Route
            path="/boxes/container/:id"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <ContainerDetails />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/boxes/data-admin"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <PageTransition>
                  <BoxesDataAdmin />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/boxes/items"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <ItemsHub />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          {/* P3-b: import merged into ItemsHub tab */}
          <Route path="/boxes/items/import" element={<Navigate to="/boxes/items?tab=import" replace />} />
          <Route
            path="/boxes/items/smart-new"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <SmartItemEntry />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/naming-system"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <ItemNamingSystem />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          {/* IA-Refactor v5: Unified Vouchers Hub */}
          <Route
            path="/vouchers"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <VouchersHub />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route path="/inventory/voucher/opening" element={<Navigate to="/vouchers?tab=opening" replace />} />
          <Route path="/inventory/voucher/receipt" element={<Navigate to="/vouchers?tab=receipt" replace />} />
          <Route path="/inventory/voucher/issue"   element={<Navigate to="/vouchers?tab=issue"   replace />} />
          {/* IA-Refactor v5: Unified Admin & Settings Hub */}
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <PageTransition>
                  <AdminSettingsHub />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/boxes/items/:id"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <ItemDetails />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          {/* P3-b: image history merged into ItemsHub tab */}
          <Route path="/boxes/items-image-history" element={<Navigate to="/boxes/items?tab=images" replace />} />
          <Route
            path="/boxes/items/barcodes"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <ItemBarcodePrint />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/print-diagnostics"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <PrintDiagnostics />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <Inventory />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/wms"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <WmsDashboard />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          {/* P4 — WMS reports merged into unified ReportsHub */}
          <Route path="/wms/reports" element={<Navigate to="/reports-analytics?type=warehouse" replace />} />
          <Route
            path="/admin/data-setup"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <PageTransition>
                  <DataSetup />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/app-settings"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <PageTransition>
                  <AppSettingsPage />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/rls-diagnostics"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <PageTransition>
                  <RlsDiagnosticsPage />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          {/* Legacy routes — merged into /inventory tabs (P2 unification) */}
          <Route path="/inventory/alerts" element={<Navigate to="/inventory?tab=alerts" replace />} />
          <Route path="/inventory/stock-counts" element={<Navigate to="/inventory?tab=counts" replace />} />
          {/* P8 — Legacy redirects (preserve old bookmarks after IA restructure) */}
          <Route path="/stock-alerts"          element={<Navigate to="/inventory?tab=alerts" replace />} />
          <Route path="/stock-counts"          element={<Navigate to="/inventory?tab=counts" replace />} />
          <Route path="/inventory/transactions" element={<Navigate to="/inventory?tab=transactions" replace />} />
          <Route path="/inventory/stock"       element={<Navigate to="/inventory?tab=stock" replace />} />
          <Route path="/inventory/custody"     element={<Navigate to="/inventory?tab=custody" replace />} />
          <Route path="/inventory/locations"   element={<Navigate to="/inventory?tab=locations" replace />} />
          <Route path="/custody"               element={<Navigate to="/inventory?tab=custody" replace />} />
          <Route path="/locations"             element={<Navigate to="/inventory?tab=locations" replace />} />
          {/* Dashboard / Home aliases */}
          <Route path="/home"                  element={<Navigate to="/" replace />} />
          <Route path="/smart-dashboard"       element={<Navigate to="/" replace />} />
          <Route path="/dashboard/smart"       element={<Navigate to="/" replace />} />
          {/* WMS legacy paths */}
          <Route path="/wms-dashboard"         element={<Navigate to="/wms" replace />} />
          <Route path="/wms/dashboard"         element={<Navigate to="/wms" replace />} />
          <Route path="/wms-reports"           element={<Navigate to="/reports-analytics?type=warehouse" replace />} />
          {/* Items / Boxes legacy aliases */}
          <Route path="/items"                 element={<Navigate to="/boxes/items" replace />} />
          <Route path="/items-master"          element={<Navigate to="/boxes/items" replace />} />
          <Route path="/items/import"          element={<Navigate to="/boxes/items/import" replace />} />
          <Route path="/items/:id"             element={<Navigate to="/boxes/items/:id" replace />} />
          <Route path="/item-approvals"        element={<Navigate to="/admin/item-approvals" replace />} />
          <Route path="/supplier-price-import" element={<Navigate to="/admin/supplier-price-import" replace />} />
          <Route path="/data-setup"            element={<Navigate to="/admin/data-setup" replace />} />
          <Route path="/app-settings"          element={<Navigate to="/admin/app-settings" replace />} />
          <Route path="/rls-diagnostics"       element={<Navigate to="/admin/rls-diagnostics" replace />} />
          {/* Container shorthand */}
          <Route path="/containers/:id"        element={<Navigate to="/boxes/container/:id" replace />} />
          {/* P3-b: approvals merged into ItemsHub tab */}
          <Route path="/admin/item-approvals" element={<Navigate to="/boxes/items?tab=approvals" replace />} />
          <Route
            path="/admin/supplier-price-import"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <PageTransition>
                  <SupplierPriceImport />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="*"
            element={
              <PageTransition>
                <NotFound />
              </PageTransition>
            }
          />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  );
}
