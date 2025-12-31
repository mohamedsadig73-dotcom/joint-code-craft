import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Wallet, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react';
import { formatNumber } from '@/utils/numberFormat';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardStats {
  totalExpenses: number;
  monthlyExpenses: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  topCostCenter: string;
  topVendor: string;
}

export function PettyCashDashboard() {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data: expenses, error } = await supabase
        .from('petty_cash_expenses')
        .select('*');

      if (error) throw error;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.total_amount || 0), 0) || 0;
      const monthlyExpenses = expenses
        ?.filter(e => new Date(e.expense_date) >= startOfMonth)
        .reduce((sum, e) => sum + Number(e.total_amount || 0), 0) || 0;

      const pendingCount = expenses?.filter(e => e.status === 'pending').length || 0;
      const approvedCount = expenses?.filter(e => e.status === 'approved').length || 0;
      const rejectedCount = expenses?.filter(e => e.status === 'rejected').length || 0;

      // Find top cost center
      const costCenterCounts = expenses?.reduce((acc, e) => {
        acc[e.cost_center] = (acc[e.cost_center] || 0) + Number(e.total_amount || 0);
        return acc;
      }, {} as Record<string, number>) || {};
      
      const topCostCenter = Object.entries(costCenterCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || '-';

      // Find top vendor
      const vendorCounts = expenses?.reduce((acc, e) => {
        acc[e.vendor_name] = (acc[e.vendor_name] || 0) + Number(e.total_amount || 0);
        return acc;
      }, {} as Record<string, number>) || {};
      
      const topVendor = Object.entries(vendorCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || '-';

      setStats({
        totalExpenses,
        monthlyExpenses,
        pendingCount,
        approvedCount,
        rejectedCount,
        topCostCenter,
        topVendor
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: t('totalExpenses'),
      value: `${formatNumber(stats?.totalExpenses || 0)} ${t('currency')}`,
      icon: Wallet,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      title: t('monthlyExpenses'),
      value: `${formatNumber(stats?.monthlyExpenses || 0)} ${t('currency')}`,
      icon: TrendingUp,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: t('pendingApproval'),
      value: stats?.pendingCount || 0,
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10'
    },
    {
      title: t('approved'),
      value: stats?.approvedCount || 0,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="glass-card">
            <CardHeader className={`flex flex-row items-center justify-between pb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${isRTL ? 'text-right' : 'text-left'}`}>
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">{t('topCostCenter')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{stats?.topCostCenter}</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">{t('topVendor')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{stats?.topVendor}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
