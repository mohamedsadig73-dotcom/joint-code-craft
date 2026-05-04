import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { NotificationListener } from "@/components/NotificationListener";
import { RegisterSW } from "@/components/RegisterSW";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Onboarding } from "@/components/Onboarding";
import { OfflineBanner } from "@/components/OfflineIndicator";
import { AnimatedRoutes } from '@/components/AnimatedRoutes';
import { UpdateChecker } from '@/components/UpdateChecker';
import { AppShell } from '@/components/layout/AppShell';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const AppRouter =
  typeof window !== "undefined" &&
  (window.location.protocol === "file:" || Boolean(window.electronAPI))
    ? HashRouter
    : BrowserRouter;

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // Routes that should render WITHOUT the unified AppShell chrome.
  // - Auth pages (no auth yet)
  // - Home / App Launcher (has its own contextual UI)
  // - Print/standalone pages
  const path = location.pathname;
  const noShellRoutes = [
    '/login',
    '/forgot-password',
    '/reset-password',
    '/install',
    '/',
  ];
  const noShellPrefixes = [
    '/boxes/card/',          // BoxCardPrint
    '/boxes/items/barcodes', // ItemBarcodePrint
  ];
  const useShell =
    isAuthenticated &&
    !noShellRoutes.includes(path) &&
    !noShellPrefixes.some((p) => path.startsWith(p));

  return (
    <>
      {isAuthenticated && <NotificationListener />}
      {isAuthenticated && <Onboarding />}
      {isAuthenticated && <MobileBottomNav />}
      {isAuthenticated && <OfflineBanner />}
      <UpdateChecker />
      {useShell ? (
        <AppShell>
          <AnimatedRoutes />
        </AppShell>
      ) : (
        <AnimatedRoutes />
      )}
    </>
  );
}

// App v4.3.3
const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <RegisterSW />
        <AppRouter>
          <LanguageProvider>
            <AuthProvider>
              <AppRoutes />
              <PWAInstallPrompt />
            </AuthProvider>
          </LanguageProvider>
        </AppRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
