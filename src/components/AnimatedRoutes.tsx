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
          {/* Root route - show Dashboard if authenticated, redirect to login if not */}
          <Route
            path="/"
            element={
              loading ? (
                <PageLoader />
              ) : shouldShowAuthenticatedContent ? (
                <ProtectedRoute>
                  <PageTransition>
                    <Dashboard />
                  </PageTransition>
                </ProtectedRoute>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          {/* Legacy /landing route - redirect to root */}
          <Route path="/landing" element={<Navigate to="/" replace />} />
          {/* Legacy /dashboard route - redirect to root */}
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
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
