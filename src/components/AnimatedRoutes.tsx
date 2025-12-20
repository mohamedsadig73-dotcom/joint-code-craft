import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PageTransition } from '@/components/PageTransition';
import { Loader2 } from 'lucide-react';

// Lazy load pages
const Landing = lazy(() => import('@/pages/Landing'));
const Login = lazy(() => import('@/pages/Login'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const ReportsAnalytics = lazy(() => import('@/pages/ReportsAnalytics'));
const Profile = lazy(() => import('@/pages/Profile'));
const DeclarationDetails = lazy(() => import('@/pages/DeclarationDetails'));
const Maintenance = lazy(() => import('@/pages/Maintenance'));
const MaintenanceItemDetails = lazy(() => import('@/pages/MaintenanceItemDetails'));
const AuditLogs = lazy(() => import('@/pages/AuditLogs'));
const InstallApp = lazy(() => import('@/pages/InstallApp'));
const NotFound = lazy(() => import('@/pages/NotFound'));

// WMS Pages
const WMSDashboard = lazy(() => import('@/pages/WMS/WMSDashboard'));
const WMSProducts = lazy(() => import('@/pages/WMS/WMSProducts'));
const WMSLocations = lazy(() => import('@/pages/WMS/WMSLocations'));
const WMSInventory = lazy(() => import('@/pages/WMS/WMSInventory'));
const WMSSuppliers = lazy(() => import('@/pages/WMS/WMSSuppliers'));
const WMSInbound = lazy(() => import('@/pages/WMS/WMSInbound'));
const WMSInboundDetails = lazy(() => import('@/pages/WMS/WMSInboundDetails'));
const WMSOutbound = lazy(() => import('@/pages/WMS/WMSOutbound'));
const WMSOutboundDetails = lazy(() => import('@/pages/WMS/WMSOutboundDetails'));
const WMSTransactions = lazy(() => import('@/pages/WMS/WMSTransactions'));
const WMSCycleCount = lazy(() => import('@/pages/WMS/WMSCycleCount'));
const WMSReports = lazy(() => import('@/pages/WMS/WMSReports'));
const WMSAlerts = lazy(() => import('@/pages/WMS/WMSAlerts'));
const WMSShipments = lazy(() => import('@/pages/WMS/WMSShipments'));
const WMSRMA = lazy(() => import('@/pages/WMS/WMSRMA'));
const WMSCrossDock = lazy(() => import('@/pages/WMS/WMSCrossDock'));
const WMSSerialNumbers = lazy(() => import('@/pages/WMS/WMSSerialNumbers'));
const WMSAdvancedReports = lazy(() => import('@/pages/WMS/WMSAdvancedReports'));
const WMSWorkerProductivity = lazy(() => import('@/pages/WMS/WMSWorkerProductivity'));
const WMSCustomers = lazy(() => import('@/pages/WMS/WMSCustomers'));
const WMSCustomerPortal = lazy(() => import('@/pages/WMS/WMSCustomerPortal'));
const WMSPredictiveAnalytics = lazy(() => import('@/pages/WMS/WMSPredictiveAnalytics'));
const WMS3PLTenants = lazy(() => import('@/pages/WMS/WMS3PLTenants'));
const WMSBilling = lazy(() => import('@/pages/WMS/WMSBilling'));
const WMSEcommerce = lazy(() => import('@/pages/WMS/WMSEcommerce'));
const WMSTemperatureZones = lazy(() => import('@/pages/WMS/WMSTemperatureZones'));
const WMSMES = lazy(() => import('@/pages/WMS/WMSMES'));
// Enhanced Loading component
const PageLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4" role="status" aria-label="Loading">
    <div className="relative">
      <div className="absolute inset-0 rounded-full bg-secondary/20 animate-ping" />
      <Loader2 className="h-12 w-12 text-secondary animate-spin" />
    </div>
    <p className="text-muted-foreground text-sm animate-pulse">Loading...</p>
  </div>
);

export function AnimatedRoutes() {
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={location.pathname}>
          <Route
            path="/login"
            element={
              loading ? (
                <PageLoader />
              ) : isAuthenticated ? (
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
          <Route
            path="/landing"
            element={
              <PageTransition>
                <Landing />
              </PageTransition>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <Dashboard />
                </PageTransition>
              </ProtectedRoute>
            }
          />
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
            path="/audit-logs"
            element={
              <ProtectedRoute requiredRole="admin">
                <PageTransition>
                  <AuditLogs />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          {/* WMS Routes */}
          <Route
            path="/wms"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <WMSDashboard />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/wms/products"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <WMSProducts />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/wms/locations"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <WMSLocations />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/wms/suppliers"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <WMSSuppliers />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/wms/inbound"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <WMSInbound />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/wms/inbound/:id"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <WMSInboundDetails />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/wms/outbound"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <WMSOutbound />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/wms/outbound/:id"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <WMSOutboundDetails />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/wms/transactions"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <WMSTransactions />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/wms/cycle-count"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <WMSCycleCount />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/wms/inventory"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <WMSInventory />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/wms/reports"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <WMSReports />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/wms/alerts"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <WMSAlerts />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/wms/shipments"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <WMSShipments />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/wms/rma"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <WMSRMA />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/wms/cross-dock"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <WMSCrossDock />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/wms/serial-numbers"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <WMSSerialNumbers />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/wms/advanced-reports"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <WMSAdvancedReports />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/wms/worker-productivity"
            element={
              <ProtectedRoute requiredRole="manager">
                <PageTransition>
                  <WMSWorkerProductivity />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/wms/customers"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <WMSCustomers />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/wms/customer-portal"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <WMSCustomerPortal />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/wms/predictive-analytics"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <WMSPredictiveAnalytics />
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
    </AnimatePresence>
  );
}
