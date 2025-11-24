import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CalendarProvider } from "@/contexts/CalendarContext";
import { NotificationListener } from "@/components/NotificationListener";
import { RegisterSW } from "@/components/RegisterSW";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Lazy load pages for better performance
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Manage = lazy(() => import("./pages/Manage"));
const Trash = lazy(() => import("./pages/Trash"));
const Reports = lazy(() => import("./pages/Reports"));
const Profile = lazy(() => import("./pages/Profile"));
const DeclarationDetails = lazy(() => import("./pages/DeclarationDetails"));
const DeclarationTimeline = lazy(() => import("./pages/DeclarationTimeline"));
const InstallApp = lazy(() => import("./pages/InstallApp"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <>
      {isAuthenticated && <NotificationListener />}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route 
            path="/login" 
            element={
              loading ? (
                <PageLoader />
              ) : isAuthenticated ? (
                <Navigate to="/" replace />
              ) : (
                <Login />
              )
            } 
          />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/install" element={<InstallApp />} />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/manage" 
            element={
              <ProtectedRoute>
                <Manage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/trash" 
            element={
              <ProtectedRoute>
                <Trash />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/declaration/:id" 
            element={
              <ProtectedRoute>
                <DeclarationDetails />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/declaration/:id/timeline" 
            element={
              <ProtectedRoute>
                <DeclarationTimeline />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RegisterSW />
      <BrowserRouter>
        <AuthProvider>
          <LanguageProvider>
            <CalendarProvider>
              <AppRoutes />
              <PWAInstallPrompt />
            </CalendarProvider>
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
