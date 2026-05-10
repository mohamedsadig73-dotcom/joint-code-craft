import { Suspense, lazy, memo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PageTransition } from '@/components/PageTransition';
import { Loader2 } from 'lucide-react';

// Lazy load pages with preload hints for critical pages
const Login = lazy(() => import('@/pages/Login'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const Home = lazy(() => import('@/pages/Home'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const ReportsAnalytics = lazy(() => import('@/pages/ReportsAnalytics'));
const Profile = lazy(() => import('@/pages/Profile'));
const DeclarationDetails = lazy(() => import('@/pages/DeclarationDetails'));
const Maintenance = lazy(() => import('@/pages/Maintenance'));
const MaintenanceItemDetails = lazy(() => import('@/pages/MaintenanceItemDetails'));
const AuditLogs = lazy(() => import('@/pages/AuditLogs'));
const ManagerDashboard = lazy(() => import('@/pages/ManagerDashboard'));
const InstallApp = lazy(() => import('@/pages/InstallApp'));
const LeaveTracking = lazy(() => import('@/pages/LeaveTracking'));
const PettyCash = lazy(() => import('@/pages/PettyCash'));
const HolidayAttendance = lazy(() => import('@/pages/HolidayAttendance'));
const HolidayAttendanceDetail = lazy(() => import('@/pages/HolidayAttendanceDetail'));
const EmployeesManagement = lazy(() => import('@/pages/EmployeesManagement'));
const UpdateLog = lazy(() => import('@/pages/UpdateLog'));
const UpdateDiagnostics = lazy(() => import('@/pages/UpdateDiagnostics'));
const BoxesManagement = lazy(() => import('@/pages/BoxesManagement'));
const BoxCardPrint = lazy(() => import('@/pages/BoxCardPrint'));
const ContainerDetails = lazy(() => import('@/pages/ContainerDetails'));
const BoxesDataAdmin = lazy(() => import('@/pages/BoxesDataAdmin'));
const ItemsMaster = lazy(() => import('@/pages/ItemsMaster'));
const ItemsMasterImport = lazy(() => import('@/pages/ItemsMasterImport'));
const ItemDetails = lazy(() => import('@/pages/ItemDetails'));
const ItemImageHistory = lazy(() => import('@/pages/ItemImageHistory'));
const PrintDiagnostics = lazy(() => import('@/pages/PrintDiagnostics'));
const Inventory = lazy(() => import('@/pages/Inventory'));
const WmsDashboard = lazy(() => import('@/pages/WmsDashboard'));
const WmsReports = lazy(() => import('@/pages/WmsReports'));
const WmsLayout = lazy(() => import('@/features/wms/layout/WmsLayout'));
const WmsDashboardNew = lazy(() => import('@/features/wms/pages/Dashboard'));
const WmsItemsNew = lazy(() => import('@/features/wms/pages/Items'));
const WmsCategories = lazy(() => import('@/features/wms/pages/Categories'));
const WmsUnits = lazy(() => import('@/features/wms/pages/Units'));
const WmsWarehouses = lazy(() => import('@/features/wms/pages/Warehouses'));
const WmsLocationsNew = lazy(() => import('@/features/wms/pages/Locations'));
const WmsReceiptsNew = lazy(() => import('@/features/wms/pages/Receipts'));
const WmsIssuesNew = lazy(() => import('@/features/wms/pages/Issues'));
const WmsTransfersNew = lazy(() => import('@/features/wms/pages/Transfers'));
const WmsStocktakeNew = lazy(() => import('@/features/wms/pages/Stocktake'));
const WmsApprovalsNew = lazy(() => import('@/features/wms/pages/Approvals'));
const WmsAlertsNew = lazy(() => import('@/features/wms/pages/Alerts'));
const WmsReportsNew = lazy(() => import('@/features/wms/pages/Reports'));
const WmsTxnEditor = lazy(() => import('@/features/wms/pages/TxnEditor'));
const WmsItemsReport = lazy(() => import('@/features/wms/pages/ItemsReport'));
const WmsMovementsReport = lazy(() => import('@/features/wms/pages/MovementsReport'));
const WmsDepartments = lazy(() => import('@/features/wms/pages/Departments'));
const WmsAdjustments = lazy(() => import('@/features/wms/pages/Adjustments'));
const WmsTransferRequests = lazy(() => import('@/features/wms/pages/TransferRequests'));
const WmsInquiryItems = lazy(() => import('@/features/wms/pages/InquiryItems'));
const WmsItemCard = lazy(() => import('@/features/wms/pages/ItemCard'));
const WmsStocktakeEditor = lazy(() => import('@/features/wms/pages/StocktakeEditor'));
const NotFound = lazy(() => import('@/pages/NotFound'));

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
          {/* Root route - show Home (App Launcher) if authenticated */}
          <Route
            path="/"
            element={
              loading ? (
                <PageLoader />
              ) : shouldShowAuthenticatedContent ? (
                <ProtectedRoute>
                  <PageTransition>
                    <Home />
                  </PageTransition>
                </ProtectedRoute>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          {/* Declarations route */}
          <Route
            path="/declarations"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <Dashboard />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          {/* Legacy /landing and /dashboard routes */}
          <Route path="/landing" element={<Navigate to="/" replace />} />
          <Route path="/dashboard" element={<Navigate to="/declarations" replace />} />
          <Route
            path="/reports-analytics"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <ReportsAnalytics />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route path="/reports" element={<Navigate to="/reports-analytics" replace />} />
          <Route path="/analytics" element={<Navigate to="/reports-analytics" replace />} />
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
                <Navigate to="/wms/items" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/boxes/items/import"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <PageTransition>
                  <ItemsMasterImport />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/boxes/items/:id"
            element={
              <ProtectedRoute>
                <RedirectItemToWms />
              </ProtectedRoute>
            }
          />
          <Route
            path="/boxes/items-image-history"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <ItemImageHistory />
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
                <Navigate to="/wms" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wms"
            element={
              <ProtectedRoute>
                <WmsLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<WmsDashboardNew />} />
            <Route path="items" element={<WmsItemsNew />} />
            <Route path="categories" element={<WmsCategories />} />
            <Route path="units" element={<WmsUnits />} />
            <Route path="warehouses" element={<WmsWarehouses />} />
            <Route path="locations" element={<WmsLocationsNew />} />
            <Route path="receipts" element={<WmsReceiptsNew />} />
            <Route path="issues" element={<WmsIssuesNew />} />
            <Route path="transfers" element={<WmsTransfersNew />} />
            <Route path="stocktake" element={<WmsStocktakeNew />} />
            <Route path="stocktake/new" element={<WmsStocktakeEditor />} />
            <Route path="stocktake/:id" element={<WmsStocktakeEditor />} />
            <Route path="items/:id" element={<WmsItemCard />} />
            <Route path="approvals" element={<WmsApprovalsNew />} />
            <Route path="alerts" element={<WmsAlertsNew />} />
            <Route path="reports" element={<WmsReportsNew />} />
            <Route path="departments" element={<WmsDepartments />} />
            <Route path="adjustments" element={<WmsAdjustments />} />
            <Route path="transfer-requests" element={<WmsTransferRequests />} />
            <Route path="inquiry/items" element={<WmsInquiryItems />} />
            <Route path="inquiry/card" element={<WmsItemCard />} />
            <Route path="reports/items" element={<WmsItemsReport />} />
            <Route path="reports/movements" element={<WmsMovementsReport />} />
            <Route path="txn/:type/new" element={<WmsTxnEditor />} />
            <Route path="txn/:type/:id" element={<WmsTxnEditor />} />
            <Route path="reports/legacy" element={<WmsReports />} />
            <Route path="dashboard-legacy" element={<WmsDashboard />} />
          </Route>
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
  );
}
