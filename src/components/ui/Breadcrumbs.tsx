import { ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

const routeLabels: Record<string, { en: string; ar: string }> = {
  '': { en: 'Dashboard', ar: 'لوحة التحكم' },
  'dashboard': { en: 'Dashboard', ar: 'لوحة التحكم' },
  'reports': { en: 'Reports', ar: 'التقارير' },
  'admin': { en: 'Admin', ar: 'الإدارة' },
  'maintenance': { en: 'Maintenance', ar: 'الصيانة' },
  'profile': { en: 'Profile', ar: 'الملف الشخصي' },
  'trash': { en: 'Trash', ar: 'المحذوفات' },
  'audit-logs': { en: 'Audit Logs', ar: 'سجل التدقيق' },
  'declaration': { en: 'Declaration', ar: 'إقرار' },
};

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const { language } = useLanguage();
  const location = useLocation();
  const isRTL = language === 'ar';
  const Separator = isRTL ? ChevronLeft : ChevronRight;

  // Auto-generate breadcrumbs from current path if not provided
  const pathSegments = location.pathname.split('/').filter(Boolean);
  
  const autoBreadcrumbs: BreadcrumbItem[] = items || [
    { label: routeLabels[''][language], href: '/' },
    ...pathSegments.map((segment, index) => {
      const href = '/' + pathSegments.slice(0, index + 1).join('/');
      const routeLabel = routeLabels[segment];
      
      // If segment is an ID (like declaration ID), use the previous segment's context
      const isId = !routeLabel && index > 0;
      const label = routeLabel 
        ? routeLabel[language]
        : isId 
          ? `#${segment.slice(0, 8)}...`
          : segment;
      
      return {
        label,
        href: index === pathSegments.length - 1 ? undefined : href,
      };
    }),
  ];

  if (autoBreadcrumbs.length <= 1) return null;

  return (
    <nav className={cn('flex items-center gap-1 text-sm mb-4', className)} aria-label="Breadcrumb">
      <ol className="flex items-center gap-1">
        {autoBreadcrumbs.map((item, index) => {
          const isLast = index === autoBreadcrumbs.length - 1;
          const isFirst = index === 0;
          
          return (
            <li key={index} className="flex items-center gap-1">
              {index > 0 && (
                <Separator className="w-4 h-4 text-muted-foreground" />
              )}
              {item.href && !isLast ? (
                <Link
                  to={item.href}
                  className={cn(
                    'text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1',
                    isFirst && 'font-medium'
                  )}
                >
                  {isFirst && <Home className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              ) : (
                <span className="text-foreground font-medium truncate max-w-[200px]">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
