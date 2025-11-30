import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Wrench, BarChart3, Users, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  const systems = [
    {
      id: 'declarations',
      title: 'نظام إدارة الإقرارات',
      description: 'إدارة إقرارات الدخول والخروج، متابعة الحالات، والتوقيعات الإلكترونية',
      icon: FileText,
      color: 'from-blue-500 to-blue-600',
      path: '/dashboard',
      available: true,
    },
    {
      id: 'maintenance',
      title: 'نظام الصيانة الدورية',
      description: 'إدارة جداول الصيانة، الأصول، الموردين، والتقارير الشاملة',
      icon: Wrench,
      color: 'from-green-500 to-green-600',
      path: '/maintenance',
      available: isAdmin || isManager,
    },
    {
      id: 'reports',
      title: 'التقارير والإحصائيات',
      description: 'تقارير تفصيلية وتحليلات شاملة عن الإقرارات والصيانة',
      icon: BarChart3,
      color: 'from-purple-500 to-purple-600',
      path: '/reports',
      available: isAdmin || isManager,
    },
    {
      id: 'admin',
      title: 'لوحة الإدارة',
      description: 'إدارة المستخدمين، الصلاحيات، والإعدادات العامة للنظام',
      icon: Users,
      color: 'from-red-500 to-red-600',
      path: '/admin',
      available: isAdmin,
    },
  ];

  const availableSystems = systems.filter(system => system.available);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">
            مرحباً بك في نظام إدارة المخزن
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            نظام متكامل لإدارة الإقرارات والصيانة الدورية بكفاءة وسهولة
          </p>
          {user && (
            <p className="mt-4 text-lg">
              <span className="text-muted-foreground">مرحباً، </span>
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
                    {system.title}
                  </h2>
                  
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    {system.description}
                  </p>
                  
                  <Button
                    variant="ghost"
                    className="gap-2 group-hover:gap-4 transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(system.path);
                    }}
                  >
                    الدخول إلى النظام
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Quick Stats */}
        <Card className="glass-card border-border/50 p-8">
          <h3 className="text-xl font-semibold mb-6">نظرة سريعة</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">
                {isAdmin || isManager ? '2' : '1'}
              </div>
              <div className="text-sm text-muted-foreground">الأنظمة المتاحة</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-500 mb-2">✓</div>
              <div className="text-sm text-muted-foreground">نشط ومتصل</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-500 mb-2">24/7</div>
              <div className="text-sm text-muted-foreground">متاح دائماً</div>
            </div>
          </div>
        </Card>

        {/* Features */}
        <div className="mt-12 text-center">
          <h3 className="text-2xl font-semibold mb-6">مميزات النظام</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { title: 'واجهة سهلة الاستخدام', icon: '🎨' },
              { title: 'تقارير تفصيلية', icon: '📊' },
              { title: 'إشعارات فورية', icon: '🔔' },
              { title: 'آمن ومحمي', icon: '🔒' },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="p-6 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="text-4xl mb-3">{feature.icon}</div>
                <div className="font-medium">{feature.title}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
