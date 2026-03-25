import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const { t } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-9 w-9 rounded-full"
          aria-label={t('toggleTheme')}
        >
          {theme === 'dark' ? (
            <Moon className="h-5 w-5 transition-transform duration-200" />
          ) : (
            <Sun className="h-5 w-5 transition-transform duration-200" />
          )}
          <span className="sr-only">{t('toggleTheme')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-card">
        <DropdownMenuItem 
          onClick={() => setTheme("light")}
          className="gap-2 cursor-pointer"
        >
          <Sun className="h-4 w-4" />
          <span>{t('lightMode')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")}
          className="gap-2 cursor-pointer"
        >
          <Moon className="h-4 w-4" />
          <span>{t('darkMode')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("system")}
          className="gap-2 cursor-pointer"
        >
          <span className="h-4 w-4 flex items-center justify-center text-xs">💻</span>
          <span>{t('systemMode')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Simple toggle button variant
export function ThemeToggleSimple() {
  const { setTheme, theme } = useTheme();
  const { t } = useLanguage();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative h-9 w-9 rounded-full overflow-hidden"
      aria-label={t('toggleTheme')}
    >
      {theme === 'dark' ? (
        <Moon className="h-5 w-5 transition-all duration-200" />
      ) : (
        <Sun className="h-5 w-5 text-secondary transition-all duration-200" />
      )}
    </Button>
  );
}
