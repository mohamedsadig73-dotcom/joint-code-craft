import { memo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText, Target, Clock, Zap, Users, Shield, UserCheck,
  ArrowUpRight, ArrowDownRight, Minus, AlertTriangle,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ReportsData } from '@/hooks/useReportsData';

interface ReportsKPICardsProps {
  data: ReportsData;
}

function Trend({ value }: { value: number }) {
  if (value > 0) return <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 text-xs font-semibold"><ArrowUpRight className="w-3.5 h-3.5" />+{value}%</span>;
  if (value < 0) return <span className="text-red-600 dark:text-red-400 flex items-center gap-0.5 text-xs font-semibold"><ArrowDownRight className="w-3.5 h-3.5" />{value}%</span>;
  return <span className="text-muted-foreground flex items-center gap-0.5 text-xs"><Minus className="w-3.5 h-3.5" />0%</span>;
}

interface KPIProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  trend?: number;
  badge?: { text: string; variant: 'destructive' | 'default' | 'secondary' };
  iconBg: string;
  iconColor: string;
}

function KPI({ icon: Icon, label, value, trend, badge, iconBg, iconColor }: KPIProps) {
  return (
    <Card className="glass-card border-border/50 p-4 hover:shadow-md transition-shadow" role="region" aria-label={label}>
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2 rounded-xl ${iconBg}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} aria-hidden="true" />
        </div>
        {trend !== undefined && <Trend value={trend} />}
        {badge && <Badge variant={badge.variant} className="text-[10px] px-1.5 py-0.5">{badge.text}</Badge>}
      </div>
      <div className="text-2xl md:text-3xl font-bold mb-0.5 tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground leading-tight">{label}</div>
    </Card>
  );
}

export const ReportsKPICards = memo(function ReportsKPICards({ data }: ReportsKPICardsProps) {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3 mb-6">
      <KPI icon={FileText} label={t('totalDeclarations')} value={data.totalDeclarations} trend={data.monthlyGrowth} iconBg="bg-primary/10" iconColor="text-primary" />
      <KPI icon={Target} label={isAr ? 'نسبة الإنجاز' : 'Completion'} value={`${data.completionRate}%`} iconBg="bg-emerald-500/10" iconColor="text-emerald-600 dark:text-emerald-400" />
      <KPI icon={Clock} label={isAr ? 'متوسط المعالجة' : 'Avg. Processing'} value={`${data.avgProcessingDays} ${isAr ? 'يوم' : 'd'}`} iconBg="bg-blue-500/10" iconColor="text-blue-600 dark:text-blue-400" />
      <KPI icon={Zap} label={isAr ? 'قيد المعالجة' : 'In Progress'} value={data.pendingCount} badge={data.overdueCount > 0 ? { text: `${data.overdueCount} ${isAr ? 'متأخر' : 'overdue'}`, variant: 'destructive' } : undefined} iconBg="bg-amber-500/10" iconColor="text-amber-600 dark:text-amber-400" />
      <KPI icon={Users} label={isAr ? 'إجمالي المستخدمين' : 'Total Users'} value={data.totalUsers} iconBg="bg-violet-500/10" iconColor="text-violet-600 dark:text-violet-400" />
      <KPI icon={Shield} label={isAr ? 'المديرين' : 'Admins'} value={data.adminCount + data.managerCount} iconBg="bg-rose-500/10" iconColor="text-rose-600 dark:text-rose-400" />
    </div>
  );
});
