import { Navigation } from '@/components/Navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  Archive,
  Plus,
  TrendingUp,
  Users,
  Activity
} from 'lucide-react';

export default function Dashboard() {
  const { t } = useLanguage();

  const stats = [
    { 
      label: t('unsigned'), 
      value: 24, 
      icon: FileText, 
      color: 'text-unsigned',
      bgColor: 'bg-unsigned/10'
    },
    { 
      label: t('pending'), 
      value: 18, 
      icon: Clock, 
      color: 'text-pending',
      bgColor: 'bg-pending/10'
    },
    { 
      label: t('approved'), 
      value: 156, 
      icon: CheckCircle, 
      color: 'text-approved',
      bgColor: 'bg-approved/10'
    },
    { 
      label: t('archived'), 
      value: 892, 
      icon: Archive, 
      color: 'text-archived',
      bgColor: 'bg-archived/10'
    },
  ];

  const recentActivity = [
    { id: 'DEC-2024-001', action: 'Approved', user: 'Sarah Ahmed', time: '5 min ago' },
    { id: 'DEC-2024-002', action: 'Pending', user: 'Ali Hassan', time: '12 min ago' },
    { id: 'DEC-2024-003', action: 'Signed', user: 'Omar Khalil', time: '1 hour ago' },
    { id: 'DEC-2024-004', action: 'Created', user: 'Fatima Ali', time: '2 hours ago' },
  ];

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <section className="text-center py-12 mb-8 glass-card rounded-2xl p-8">
          <h2 className="text-4xl font-bold mb-4 gradient-text">
            {t('streamlineWorkflow')}
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            {t('streamlineDesc')}
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-2">
              <Plus className="w-5 h-5" />
              {t('addDeclaration')}
            </Button>
            <Button size="lg" variant="outline" className="gap-2">
              <TrendingUp className="w-5 h-5" />
              {t('viewReports')}
            </Button>
          </div>
        </section>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card 
                key={stat.label} 
                className="glass-card border-border/50 hover:scale-105 transition-transform cursor-pointer"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    <TrendingUp className="w-4 h-4 text-success" />
                  </div>
                  <div className="text-3xl font-bold mb-1">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Activity & Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                {t('recentActivity')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div 
                    key={activity.id}
                    className="flex items-center justify-between p-3 glass-card rounded-lg hover:bg-muted/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-secondary" />
                      <div>
                        <p className="font-medium text-sm">{activity.id}</p>
                        <p className="text-xs text-muted-foreground">{activity.user}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                System Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Declarations</span>
                  <span className="text-2xl font-bold">1,090</span>
                </div>
                <div className="w-full bg-muted/20 rounded-full h-2">
                  <div className="bg-secondary h-2 rounded-full" style={{ width: '85%' }} />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Completion Rate</span>
                  <span className="text-2xl font-bold">94%</span>
                </div>
                <div className="w-full bg-muted/20 rounded-full h-2">
                  <div className="bg-approved h-2 rounded-full" style={{ width: '94%' }} />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active Users</span>
                  <span className="text-2xl font-bold">42</span>
                </div>
                <div className="w-full bg-muted/20 rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '68%' }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
