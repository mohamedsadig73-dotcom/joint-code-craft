import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Wrench, BarChart3, Users, ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  const systems = [
    {
      id: 'declarations',
      titleKey: 'systemTitle',
      descriptionKey: 'streamlineDesc',
      icon: FileText,
      color: 'from-blue-500 to-blue-600',
      path: '/dashboard',
      available: true,
    },
    {
      id: 'maintenance',
      titleKey: 'maintenanceSystem',
      descriptionKey: 'maintenanceSystem',
      icon: Wrench,
      color: 'from-green-500 to-green-600',
      path: '/maintenance',
      available: isAdmin || isManager,
    },
    {
      id: 'reports',
      titleKey: 'reportsTitle',
      descriptionKey: 'reportsSubtitle',
      icon: BarChart3,
      color: 'from-purple-500 to-purple-600',
      path: '/reports',
      available: isAdmin || isManager,
    },
    {
      id: 'admin',
      titleKey: 'adminDashboardTitle',
      descriptionKey: 'adminDashboardSubtitle',
      icon: Users,
      color: 'from-red-500 to-red-600',
      path: '/admin',
      available: isAdmin,
    },
  ];

  const availableSystems = systems.filter(system => system.available);
  const ArrowIcon = language === 'ar' ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">
            {t('welcome')}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('streamlineDesc')}
          </p>
          {user && (
            <p className="mt-4 text-lg">
              <span className="text-muted-foreground">{t('welcome')}, </span>
              <span className="font-semibold text-primary">{user.email}</span>
            </p>
          )}
        </div>

        {/* Systems Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {availableSystems.map((system) => {
            const Icon = system.icon;
            return (
              <Card
                key={system.id}
                className="group glass-card border-border/50 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer"
                onClick={() => navigate(system.path)}
              >
                <div className="p-8">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${system.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <h2 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">
                    {t(system.titleKey)}
                  </h2>
                  
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    {t(system.descriptionKey)}
                  </p>
                  
                  <Button
                    variant="ghost"
                    className="gap-2 group-hover:gap-4 transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(system.path);
                    }}
                  >
                    {t('view')}
                    <ArrowIcon className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Quick Stats */}
        <Card className="glass-card border-border/50 p-8">
          <h3 className="text-xl font-semibold mb-6">{t('overview')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">
                {isAdmin || isManager ? '2' : '1'}
              </div>
              <div className="text-sm text-muted-foreground">{t('dashboard')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-500 mb-2">✓</div>
              <div className="text-sm text-muted-foreground">{t('success')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-500 mb-2">24/7</div>
              <div className="text-sm text-muted-foreground">{t('loading')}</div>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
