import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { NotificationCenter } from '@/components/NotificationCenter';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { ThemeToggleSimple } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { Globe } from 'lucide-react';

/**
 * Optional unified AppShell using Shadcn Sidebar (Phase B).
 * Opt-in: pages keep working with <Navigation /> until migrated.
 * Wrap any page with <AppShell>{children}</AppShell> to use the sidebar layout.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { toggleLanguage, t } = useLanguage();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center justify-between border-b px-2 sticky top-0 bg-background/80 backdrop-blur-md z-40">
            <SidebarTrigger />
            <div className="flex items-center gap-1.5 ltr-flex">
              <div className="hidden lg:block"><OfflineIndicator /></div>
              <div className="hidden md:block"><ThemeToggleSimple /></div>
              <Button variant="ghost" size="icon" onClick={toggleLanguage} title={t('switchLanguage')}>
                <Globe className="w-4 h-4" />
              </Button>
              <NotificationCenter />
            </div>
          </header>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
