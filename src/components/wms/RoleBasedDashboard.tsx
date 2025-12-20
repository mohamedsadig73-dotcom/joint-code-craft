import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  ArrowDownToLine, 
  ArrowUpFromLine,
  AlertTriangle,
  Users,
  Target,
  BarChart3,
  ShoppingCart,
  Settings,
  Eye,
  ClipboardList
} from 'lucide-react';

interface QuickAction {
  icon: React.ElementType;
  label: { ar: string; en: string };
  description: { ar: string; en: string };
  path: string;
  color: string;
  roles: ('admin' | 'manager' | 'user')[];
}

const quickActions: QuickAction[] = [
  // Admin & Manager actions
  {
    icon: Target,
    label: { ar: 'تقارير KPI المتقدمة', en: 'Advanced KPI Reports' },
    description: { ar: 'عرض مؤشرات الأداء الرئيسية', en: 'View key performance indicators' },
    path: '/wms/advanced-reports',
    color: 'bg-purple-500/10 text-purple-600',
    roles: ['admin', 'manager']
  },
  {
    icon: Users,
    label: { ar: 'إنتاجية العمال', en: 'Worker Productivity' },
    description: { ar: 'تتبع أداء الموظفين', en: 'Track employee performance' },
    path: '/wms/worker-productivity',
    color: 'bg-blue-500/10 text-blue-600',
    roles: ['admin', 'manager']
  },
  {
    icon: ShoppingCart,
    label: { ar: 'التجديد التلقائي', en: 'Auto Replenishment' },
    description: { ar: 'إنشاء أوامر شراء تلقائية', en: 'Create automatic purchase orders' },
    path: '/wms/alerts',
    color: 'bg-orange-500/10 text-orange-600',
    roles: ['admin', 'manager']
  },
  {
    icon: Settings,
    label: { ar: 'إدارة المواقع', en: 'Manage Locations' },
    description: { ar: 'إعداد مواقع التخزين', en: 'Configure storage locations' },
    path: '/wms/locations',
    color: 'bg-indigo-500/10 text-indigo-600',
    roles: ['admin']
  },
  // Manager actions
  {
    icon: ArrowDownToLine,
    label: { ar: 'أوامر الاستلام', en: 'Inbound Orders' },
    description: { ar: 'إدارة الاستلام', en: 'Manage receiving' },
    path: '/wms/inbound',
    color: 'bg-green-500/10 text-green-600',
    roles: ['admin', 'manager', 'user']
  },
  {
    icon: ArrowUpFromLine,
    label: { ar: 'أوامر الصرف', en: 'Outbound Orders' },
    description: { ar: 'إدارة الشحن', en: 'Manage shipping' },
    path: '/wms/outbound',
    color: 'bg-blue-500/10 text-blue-600',
    roles: ['admin', 'manager', 'user']
  },
  // User actions
  {
    icon: Package,
    label: { ar: 'المخزون', en: 'Inventory' },
    description: { ar: 'عرض المخزون الحالي', en: 'View current inventory' },
    path: '/wms/inventory',
    color: 'bg-teal-500/10 text-teal-600',
    roles: ['admin', 'manager', 'user']
  },
  {
    icon: Eye,
    label: { ar: 'المنتجات', en: 'Products' },
    description: { ar: 'عرض كتالوج المنتجات', en: 'Browse product catalog' },
    path: '/wms/products',
    color: 'bg-cyan-500/10 text-cyan-600',
    roles: ['admin', 'manager', 'user']
  },
  {
    icon: ClipboardList,
    label: { ar: 'الحركات', en: 'Transactions' },
    description: { ar: 'عرض سجل الحركات', en: 'View transaction history' },
    path: '/wms/transactions',
    color: 'bg-gray-500/10 text-gray-600',
    roles: ['admin', 'manager', 'user']
  },
  {
    icon: BarChart3,
    label: { ar: 'التقارير', en: 'Reports' },
    description: { ar: 'عرض تقارير المستودع', en: 'View warehouse reports' },
    path: '/wms/reports',
    color: 'bg-pink-500/10 text-pink-600',
    roles: ['admin', 'manager', 'user']
  }
];

export const RoleBasedDashboard: React.FC = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const userRole = user?.role || 'user';

  // Filter actions based on user role
  const availableActions = quickActions.filter(action => 
    action.roles.includes(userRole as 'admin' | 'manager' | 'user')
  );

  const getRoleLabel = () => {
    switch (userRole) {
      case 'admin':
        return language === 'ar' ? 'مدير النظام' : 'System Admin';
      case 'manager':
        return language === 'ar' ? 'مدير المستودع' : 'Warehouse Manager';
      default:
        return language === 'ar' ? 'موظف المستودع' : 'Warehouse Staff';
    }
  };

  const getRoleDescription = () => {
    switch (userRole) {
      case 'admin':
        return language === 'ar' 
          ? 'لديك صلاحيات كاملة للوصول إلى جميع وظائف النظام'
          : 'You have full access to all system features';
      case 'manager':
        return language === 'ar'
          ? 'يمكنك إدارة العمليات والموظفين وعرض التقارير'
          : 'You can manage operations, staff, and view reports';
      default:
        return language === 'ar'
          ? 'يمكنك تنفيذ عمليات المستودع الأساسية'
          : 'You can perform basic warehouse operations';
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {language === 'ar' ? 'الإجراءات السريعة' : 'Quick Actions'}
              <Badge variant="secondary" className="capitalize">{getRoleLabel()}</Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{getRoleDescription()}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {availableActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2 hover:shadow-md transition-all"
                onClick={() => navigate(action.path)}
              >
                <div className={`p-3 rounded-lg ${action.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-center">{action.label[language]}</span>
                <span className="text-xs text-muted-foreground text-center line-clamp-2">
                  {action.description[language]}
                </span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
