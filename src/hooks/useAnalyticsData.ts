import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { statusLabels } from '@/constants/statusLabels';
import { differenceInDays, subMonths, format, startOfMonth } from 'date-fns';

export interface AnalyticsData {
  totalDeclarations: number;
  monthlyGrowth: number;
  weeklyGrowth: number;
  avgProcessingDays: number;
  completionRate: number;
  pendingCount: number;
  overdueCount: number;
  statusDistribution: { status: string; count: number; label: string; color: string }[];
  typeDistribution: { type: string; count: number; percentage: number }[];
  monthlyTrend: { month: string; total: number; دخول: number; خروج: number; completed: number }[];
  weeklyActivity: { day: string; count: number }[];
  topSenders: { username: string; count: number; percentage: number }[];
  performanceMetrics: { metric: string; value: number; target: number; fill: string }[];
  hourlyDistribution: { hour: string; count: number }[];
}

export const STATUS_COLORS: Record<string, string> = {
  draft: '#94a3b8',
  pending_warehouse_signature: '#f59e0b',
  warehouse_signed: '#3b82f6',
  sent_to_admin_office: '#8b5cf6',
  received_by_admin_office: '#06b6d4',
  returned_to_warehouse: '#f97316',
  archived: '#22c55e',
  rejected: '#ef4444',
};

const initialData: AnalyticsData = {
  totalDeclarations: 0,
  monthlyGrowth: 0,
  weeklyGrowth: 0,
  avgProcessingDays: 0,
  completionRate: 0,
  pendingCount: 0,
  overdueCount: 0,
  statusDistribution: [],
  typeDistribution: [],
  monthlyTrend: [],
  weeklyActivity: [],
  topSenders: [],
  performanceMetrics: [],
  hourlyDistribution: [],
};

export function useAnalyticsData(timeRange: string) {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData>(initialData);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      
      const now = new Date();
      let startDate: Date;
      switch (timeRange) {
        case '1month': startDate = subMonths(now, 1); break;
        case '3months': startDate = subMonths(now, 3); break;
        case '1year': startDate = subMonths(now, 12); break;
        default: startDate = subMonths(now, 6);
      }

      const { data: declarations, error } = await supabase
        .from('declarations')
        .select(`*, sender:profiles!sender_id(username)`)
        .is('deleted_at', null)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const allDeclarations = declarations || [];
      
      // Calculate growth rates
      const lastMonth = subMonths(now, 1);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const thisMonthCount = allDeclarations.filter(d => new Date(d.created_at) >= startOfMonth(now)).length;
      const lastMonthCount = allDeclarations.filter(d => {
        const date = new Date(d.created_at);
        return date >= startOfMonth(lastMonth) && date < startOfMonth(now);
      }).length;
      
      const thisWeekCount = allDeclarations.filter(d => new Date(d.created_at) >= lastWeek).length;
      const prevWeekCount = allDeclarations.filter(d => {
        const date = new Date(d.created_at);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        return date >= twoWeeksAgo && date < lastWeek;
      }).length;

      const monthlyGrowth = lastMonthCount > 0 ? ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100 : 0;
      const weeklyGrowth = prevWeekCount > 0 ? ((thisWeekCount - prevWeekCount) / prevWeekCount) * 100 : 0;

      // Status distribution
      const statusCounts: Record<string, number> = {};
      allDeclarations.forEach(d => {
        statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;
      });
      const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
        label: statusLabels[status] || status,
        color: STATUS_COLORS[status] || '#94a3b8',
      }));

      // Type distribution
      const typeCounts: Record<string, number> = {};
      allDeclarations.forEach(d => {
        typeCounts[d.type] = (typeCounts[d.type] || 0) + 1;
      });
      const typeDistribution = Object.entries(typeCounts).map(([type, count]) => ({
        type,
        count,
        percentage: Math.round((count / allDeclarations.length) * 100),
      }));

      // Monthly trend
      const monthlyData: Record<string, { total: number; دخول: number; خروج: number; completed: number }> = {};
      allDeclarations.forEach(d => {
        const monthKey = format(new Date(d.created_at), 'yyyy-MM');
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { total: 0, دخول: 0, خروج: 0, completed: 0 };
        }
        monthlyData[monthKey].total++;
        if (d.type === 'دخول') monthlyData[monthKey].دخول++;
        if (d.type === 'خروج') monthlyData[monthKey].خروج++;
        if (d.status === 'archived') monthlyData[monthKey].completed++;
      });
      
      const monthlyTrend = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, values]) => ({
          month: format(new Date(month + '-01'), 'MMM'),
          ...values,
        }));

      // Weekly activity with translated day names
      const weekDaysEn = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const weeklyActivityData: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      allDeclarations.forEach(d => {
        const day = new Date(d.created_at).getDay();
        weeklyActivityData[day]++;
      });
      const weeklyActivity = Object.entries(weeklyActivityData).map(([day, count]) => ({
        day: t(weekDaysEn[parseInt(day)]),
        count,
      }));

      // Hourly distribution
      const hourlyData: Record<number, number> = {};
      for (let i = 0; i < 24; i++) hourlyData[i] = 0;
      allDeclarations.forEach(d => {
        const hour = new Date(d.created_at).getHours();
        hourlyData[hour]++;
      });
      const hourlyDistribution = Object.entries(hourlyData).map(([hour, count]) => ({
        hour: `${hour}:00`,
        count,
      }));

      // Top senders
      const senderCounts: Record<string, number> = {};
      allDeclarations.forEach(d => {
        const username = d.sender?.username || t('unknown');
        senderCounts[username] = (senderCounts[username] || 0) + 1;
      });
      const topSenders = Object.entries(senderCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([username, count]) => ({
          username,
          count,
          percentage: Math.round((count / allDeclarations.length) * 100),
        }));

      // Calculate metrics
      const archivedDeclarations = allDeclarations.filter(d => d.status === 'archived');
      let totalDays = 0;
      archivedDeclarations.forEach(d => {
        totalDays += differenceInDays(new Date(d.updated_at), new Date(d.created_at));
      });
      const avgProcessingDays = archivedDeclarations.length > 0 ? Math.round(totalDays / archivedDeclarations.length) : 0;
      const completionRate = allDeclarations.length > 0 ? Math.round((archivedDeclarations.length / allDeclarations.length) * 100) : 0;
      const pendingCount = allDeclarations.filter(d => 
        ['pending_warehouse_signature', 'warehouse_signed', 'sent_to_admin_office'].includes(d.status)
      ).length;
      const overdueCount = allDeclarations.filter(d => {
        if (!['pending_warehouse_signature', 'sent_to_admin_office'].includes(d.status)) return false;
        return differenceInDays(now, new Date(d.created_at)) > 7;
      }).length;

      // Performance metrics for radial chart
      const performanceMetrics = [
        { metric: t('completionRateMetric'), value: completionRate, target: 100, fill: '#22c55e' },
        { metric: t('processingSpeedMetric'), value: Math.max(0, 100 - avgProcessingDays * 10), target: 100, fill: '#3b82f6' },
        { metric: t('efficiencyMetric'), value: Math.round(100 - (pendingCount / Math.max(allDeclarations.length, 1)) * 100), target: 100, fill: '#f59e0b' },
      ];

      setData({
        totalDeclarations: allDeclarations.length,
        monthlyGrowth,
        weeklyGrowth,
        avgProcessingDays,
        completionRate,
        pendingCount,
        overdueCount,
        statusDistribution,
        typeDistribution,
        monthlyTrend,
        weeklyActivity,
        topSenders,
        performanceMetrics,
        hourlyDistribution,
      });

    } catch (error: any) {
      toast({ variant: 'destructive', title: t('error'), description: error.message });
    } finally {
      setLoading(false);
    }
  }, [timeRange, toast, t, language]);

  return { data, loading, loadAnalytics };
}
