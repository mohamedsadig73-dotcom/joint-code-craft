import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';

function AllProviders({ children, dir = 'rtl' }: { children: ReactNode; dir?: 'rtl' | 'ltr' }) {
  // Mirror app: set <html dir> for RTL-aware components
  if (typeof document !== 'undefined') document.documentElement.dir = dir;
  return <LanguageProvider>{children}</LanguageProvider>;
}

export function renderRTL(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: ({ children }) => <AllProviders dir="rtl">{children}</AllProviders>, ...options });
}

export function renderLTR(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: ({ children }) => <AllProviders dir="ltr">{children}</AllProviders>, ...options });
}

export * from '@testing-library/react';
