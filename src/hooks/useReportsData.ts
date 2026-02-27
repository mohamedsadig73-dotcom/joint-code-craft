import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { statusLabels, statusLabelsEn, CHART_COLORS, statusColorMap } from '@/constants/statusLabels';
import { differenceInDays, format, startOfDay, endOfDay, startOfYear, endOfYear, getYear } from 'date-fns';

export interface ReportsData {
  // Users
  totalUsers: number;
  adminCount: number;
  managerCount: number;
  userCount: number;
  // Declarations
  totalDeclarations: number;
  monthlyGrowth: number;
  completionRate: number;
  avgProcessingDays: number;
  pendingCount: number;
  overdueCount: number;
  // Distributions
  statusDistribution: { status: string; count: number; label: string; color: string }[];
  typeDistribution: { type: string; count: number; percentage: number }[];
  // Trends
  monthlyTrends: { month: string; دخول: number; خروج: number; total: number; completed: number }[];
  weeklyActivity: { day: string; count: number }[];
  hourlyDistribution: { hour: number; count: number }[];
  // Rankings
  topSenders: { username: string; count: number; percentage: number }[];
  // Activities
  recentActivities: { id: string; username: string; message: string; timestamp: string; action: string }[];
  // Funnel
  funnelData: { stage: string; count: number; color: string }[];
}

const initialData: ReportsData = {
  totalUsers: 0, adminCount: 0, managerCount: 0, userCount: 0,
  totalDeclarations: 0, monthlyGrowth: 0, completionRate: 0, avgProcessingDays: 0,
  pendingCount: 0, overdueCount: 0,
  statusDistribution: [], typeDistribution: [],
  monthlyTrends: [], weeklyActivity: [], hourlyDistribution: [],
  topSenders: [], recentActivities: [], funnelData: [],
};

export function useReportsData() {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const isAr = language === 'ar';

  const currentYear = getYear(new Date());
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const saved = localStorage.getItem('reports_selected_year');
    if (saved) {
      const y = parseInt(saved);
      if (y >= currentYear - 5 && y <= currentYear) return y;
    }
    return currentYear;
  });

  const [dateFrom, setDateFrom] = useState<Date>(startOfYear(new Date(selectedYear, 0, 1)));
  const [dateTo, setDateTo] = useState<Date>(endOfYear(new Date(selectedYear, 0, 1)));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportsData>(initialData);

  const availableYears = useMemo(() => {
    const years = [];
    for (let y = currentYear; y >= currentYear - 5; y--) years.push(y);
    return years;
  }, [currentYear]);

  const handleYearChange = useCallback((year: string) => {
    const y = parseInt(year);
    setSelectedYear(y);
    setDateFrom(startOfYear(new Date(y, 0, 1)));
    setDateTo(endOfYear(new Date(y, 0, 1)));
    localStorage.setItem('reports_selected_year', year);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const from = startOfDay(dateFrom).toISOString();
      const to = endOfDay(dateTo).toISOString();

      const [rolesRes, declRes, activitiesRes] = await Promise.all([
        supabase.from('user_roles').select('role'),
        supabase.from('declarations')
          .select('id, status, type, created_at, updated_at, sender:profiles!sender_id(username)')
          .is('deleted_at', null)
          .gte('created_at', from)
          .lte('created_at', to),
        supabase.from('declaration_status_history')
          .select('id, declaration_id, old_status, new_status, changed_at, changed_by, notes, profiles:profiles!declaration_status_history_changed_by_fkey(username)')
          .gte('changed_at', from)
          .lte('changed_at', to)
          .order('changed_at', { ascending: false })
          .limit(20),
      ]);

      if (rolesRes.error) throw rolesRes.error;
      if (declRes.error) throw declRes.error;

      const roles = rolesRes.data || [];
      const decls = declRes.data || [];
      const activities = activitiesRes.data || [];
      const now = new Date();

      // Users
      const adminCount = roles.filter(r => r.role === 'admin').length;
      const managerCount = roles.filter(r => r.role === 'manager').length;
      const userCount = roles.filter(r => r.role === 'user').length;

      // Status distribution
      const statusCounts: Record<string, number> = {};
      decls.forEach(d => { statusCounts[d.status] = (statusCounts[d.status] || 0) + 1; });
      const labels = isAr ? statusLabels : statusLabelsEn;
      const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
        status, count,
        label: labels[status] || status,
        color: statusColorMap[status] || CHART_COLORS.user,
      }));

      // Type distribution
      const typeCounts: Record<string, number> = {};
      decls.forEach(d => { typeCounts[d.type] = (typeCounts[d.type] || 0) + 1; });
      const typeDistribution = Object.entries(typeCounts).map(([type, count]) => ({
        type, count, percentage: decls.length > 0 ? Math.round((count / decls.length) * 100) : 0,
      }));

      // Monthly trends
      const monthlyMap: Record<string, { دخول: number; خروج: number; total: number; completed: number }> = {};
      decls.forEach(d => {
        const key = format(new Date(d.created_at), 'yyyy-MM');
        if (!monthlyMap[key]) monthlyMap[key] = { دخول: 0, خروج: 0, total: 0, completed: 0 };
        monthlyMap[key].total++;
        if (d.type === 'دخول') monthlyMap[key].دخول++;
        if (d.type === 'خروج') monthlyMap[key].خروج++;
        if (d.status === 'archived') monthlyMap[key].completed++;
      });
      const monthlyTrends = Object.entries(monthlyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, v]) => ({
          month: new Date(month + '-01').toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { month: 'short' }),
          ...v,
        }));

      // Weekly activity
      const weekDays = isAr
        ? [t('sunday'), t('monday'), t('tuesday'), t('wednesday'), t('thursday'), t('friday'), t('saturday')]
        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weekMap: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      decls.forEach(d => { weekMap[new Date(d.created_at).getDay()]++; });
      const weeklyActivity = Object.entries(weekMap).map(([day, count]) => ({
        day: weekDays[parseInt(day)], count,
      }));

      // Hourly distribution
      const hourMap: Record<number, number> = {};
      for (let i = 0; i < 24; i++) hourMap[i] = 0;
      decls.forEach(d => { hourMap[new Date(d.created_at).getHours()]++; });
      const hourlyDistribution = Object.entries(hourMap).map(([h, count]) => ({
        hour: parseInt(h), count,
      }));

      // Top senders
      const senderMap: Record<string, number> = {};
      decls.forEach(d => {
        const name = (d.sender as any)?.username || t('unknown');
        senderMap[name] = (senderMap[name] || 0) + 1;
      });
      const topSenders = Object.entries(senderMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([username, count]) => ({
          username, count,
          percentage: decls.length > 0 ? Math.round((count / decls.length) * 100) : 0,
        }));

      // Metrics
      const archived = decls.filter(d => d.status === 'archived');
      let totalDays = 0;
      archived.forEach(d => { totalDays += Math.max(1, differenceInDays(new Date(d.updated_at), new Date(d.created_at))); });
      const avgProcessingDays = archived.length > 0 ? Math.round(totalDays / archived.length) : 0;
      const completionRate = decls.length > 0 ? Math.round((archived.length / decls.length) * 100) : 0;
      const pendingCount = decls.filter(d => ['pending_warehouse_signature', 'warehouse_signed', 'sent_to_admin_office'].includes(d.status)).length;
      const overdueCount = decls.filter(d => {
        if (!['pending_warehouse_signature', 'sent_to_admin_office'].includes(d.status)) return false;
        return differenceInDays(now, new Date(d.created_at)) > 7;
      }).length;

      // Monthly growth
      const thisMonthDecls = decls.filter(d => {
        const date = new Date(d.created_at);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }).length;
      const lastMonthDecls = decls.filter(d => {
        const date = new Date(d.created_at);
        const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return date.getMonth() === lm.getMonth() && date.getFullYear() === lm.getFullYear();
      }).length;
      const monthlyGrowth = lastMonthDecls > 0 ? Math.round(((thisMonthDecls - lastMonthDecls) / lastMonthDecls) * 100) : 0;

      // Funnel data (declaration lifecycle stages)
      const funnelStages = [
        { key: 'draft', label: labels['draft'] || 'Draft' },
        { key: 'pending_warehouse_signature', label: labels['pending_warehouse_signature'] || 'Pending' },
        { key: 'warehouse_signed', label: labels['warehouse_signed'] || 'Signed' },
        { key: 'sent_to_admin_office', label: labels['sent_to_admin_office'] || 'Sent' },
        { key: 'received_by_admin_office', label: labels['received_by_admin_office'] || 'Received' },
        { key: 'archived', label: labels['archived'] || 'Archived' },
      ];
      // Cumulative: how many passed through each stage (sum of current + later stages)
      const funnelData = funnelStages.map((stage, idx) => {
        const laterStages = funnelStages.slice(idx).map(s => s.key);
        const count = decls.filter(d => laterStages.includes(d.status) || 
          (d.status === 'returned_to_warehouse' && idx <= 2) ||
          (d.status === 'rejected' && idx <= 3)
        ).length;
        return {
          stage: stage.label,
          count: Math.max(count, statusCounts[stage.key] || 0),
          color: statusColorMap[stage.key] || CHART_COLORS.user,
        };
      });
      // Sort descending for funnel shape
      funnelData.sort((a, b) => b.count - a.count);

      // Recent activities
      const recentActivities = activities.map(a => ({
        id: a.id,
        username: (a.profiles as any)?.username || t('unknown'),
        message: `${isAr ? 'غيّر حالة الإقرار' : 'Changed declaration status'} ${a.declaration_id?.slice(0, 8)}`,
        timestamp: a.changed_at,
        action: `${a.old_status || '—'} → ${a.new_status}`,
      }));

      setData({
        totalUsers: roles.length, adminCount, managerCount, userCount,
        totalDeclarations: decls.length, monthlyGrowth, completionRate, avgProcessingDays,
        pendingCount, overdueCount,
        statusDistribution, typeDistribution,
        monthlyTrends, weeklyActivity, hourlyDistribution,
        topSenders, recentActivities, funnelData,
      });
    } catch (error: any) {
      toast({ variant: 'destructive', title: t('error'), description: error.message });
    } finally {
      setLoading(false);
    }
  }, [toast, t, language, dateFrom, dateTo, isAr]);

  return {
    data, loading, loadData,
    selectedYear, handleYearChange, availableYears,
    dateFrom, setDateFrom, dateTo, setDateTo,
  };
}
