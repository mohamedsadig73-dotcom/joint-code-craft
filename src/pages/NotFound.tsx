import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Home, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const { t, language } = useLanguage();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div 
      className="flex min-h-screen items-center justify-center bg-background"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="text-center space-y-6 p-8">
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-12 h-12 text-destructive" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-foreground">404</h1>
          <h2 className="text-2xl font-semibold text-foreground">
            {t('pageNotFound')}
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            {t('pageNotFoundDesc')}
          </p>
        </div>
        
        <Button asChild size="lg" className="gap-2">
          <Link to="/">
            <Home className="w-4 h-4" />
            {t('returnToHome')}
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;