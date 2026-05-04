import { ReactNode, useEffect, useState } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { NotificationCenter } from '@/components/NotificationCenter';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { ThemeToggleSimple } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { Globe } from 'lucide-react';

/**
 * Unified AppShell using Shadcn Sidebar.
 * Single source of truth for: SidebarTrigger, NotificationCenter,
 * ThemeToggle, Language toggle, OfflineIndicator. Pages must NOT
 * render duplicates of these.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { toggleLanguage, t } = useLanguage();
  // Collapse sidebar by default on tablets (<1024px) for content space.
  const [defaultOpen, setDefaultOpen] = useState<boolean>(() =>
    typeof window === 'undefined' ? true : window.innerWidth >= 1024
  );
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setDefaultOpen(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return (
    <SidebarProvider key={defaultOpen ? 'open' : 'closed'} defaultOpen={defaultOpen}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 border-s border-border/40">
          <header className="h-12 flex items-center justify-between border-b px-2 sticky top-0 bg-background/80 backdrop-blur-md z-40">
            <SidebarTrigger className="ms-1" />
            <div className="flex items-center gap-1.5 ltr-flex">
              <div className="hidden lg:block"><OfflineIndicator /></div>
              <div className="hidden md:block"><ThemeToggleSimple /></div>
              <Button variant="ghost" size="icon" onClick={toggleLanguage} title={t('switchLanguage')}>
                <Globe className="w-4 h-4" />
              </Button>
              <NotificationCenter />
            </div>
          </header>
          <main className="flex-1 min-w-0 pb-16 md:pb-0">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
