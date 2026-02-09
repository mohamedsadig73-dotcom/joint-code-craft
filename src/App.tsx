import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
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
import { AnimatedRoutes } from "@/components/AnimatedRoutes";

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

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      {isAuthenticated && <NotificationListener />}
      {isAuthenticated && <Onboarding />}
      {isAuthenticated && <MobileBottomNav />}
      {isAuthenticated && <OfflineBanner />}
      <AnimatedRoutes />
    </>
  );
}

// App v4.1.1
const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <RegisterSW />
        <BrowserRouter>
          <LanguageProvider>
            <AuthProvider>
              <AppRoutes />
              <PWAInstallPrompt />
            </AuthProvider>
          </LanguageProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
