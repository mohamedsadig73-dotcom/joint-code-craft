import { useRef, useEffect, useState } from 'react';
import type * as echarts from 'echarts';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { CHART_FONT_FAMILY } from './chartTheme';

// Lazy load ECharts
let echartsModule: typeof import('echarts') | null = null;
const echartsPromise = import('echarts').then(m => { echartsModule = m; return m; });

interface RTLEChartProps {
  option: echarts.EChartsOption;
  className?: string;
  style?: React.CSSProperties;
  loading?: boolean;
  theme?: 'light' | 'dark';
  onInit?: (chart: echarts.ECharts) => void;
}

export function RTLEChart({ 
  option, 
  className, 
  style = { height: '300px' },
  loading = false,
  theme,
  onInit
}: RTLEChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [ready, setReady] = useState(!!echartsModule);

  const isDark = theme === 'dark' || 
    (typeof window !== 'undefined' && document.documentElement.classList.contains('dark'));

  // Load ECharts lazily
  useEffect(() => {
    if (!echartsModule) {
      echartsPromise.then(() => setReady(true));
    }
  }, []);

  useEffect(() => {
    if (!chartRef.current || !ready || !echartsModule) return;

    chartInstance.current = echartsModule.init(chartRef.current, isDark ? 'dark' : undefined, {
      renderer: 'canvas',
      locale: isRTL ? 'AR' : 'EN'
    });

    if (onInit && chartInstance.current) {
      onInit(chartInstance.current);
    }

    const resizeObserver = new ResizeObserver(() => {
      chartInstance.current?.resize();
    });
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chartInstance.current?.dispose();
    };
  }, [isDark, isRTL, onInit, ready]);

  useEffect(() => {
    if (!chartInstance.current) return;

    const rtlOption = applyRTLToOption(option, isRTL);
    chartInstance.current.setOption(rtlOption, true);
    
    if (loading) {
      chartInstance.current.showLoading({
        text: isRTL ? 'جاري التحميل...' : 'Loading...',
        color: 'hsl(var(--primary))',
        textColor: 'hsl(var(--foreground))',
        maskColor: 'hsla(var(--background), 0.8)',
        fontSize: 14,
        fontFamily: CHART_FONT_FAMILY,
      });
    } else {
      chartInstance.current.hideLoading();
    }
  }, [option, loading, isRTL]);

  // Re-initialize on theme change
  useEffect(() => {
    if (!ready || !echartsModule) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          if (chartRef.current && chartInstance.current) {
            chartInstance.current.dispose();
            const newIsDark = document.documentElement.classList.contains('dark');
            chartInstance.current = echartsModule!.init(chartRef.current, newIsDark ? 'dark' : undefined);
            const rtlOption = applyRTLToOption(option, isRTL);
            chartInstance.current.setOption(rtlOption);
          }
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, [option, isRTL, ready]);

  return (
    <div 
      ref={chartRef} 
      className={cn('w-full', className)}
      style={style}
      dir={isRTL ? 'rtl' : 'ltr'}
    />
  );
}

function applyRTLToOption(option: echarts.EChartsOption, isRTL: boolean): echarts.EChartsOption {
  if (!isRTL) return option;

  const rtlOption = { ...option };

  if (rtlOption.xAxis) {
    const xAxis = Array.isArray(rtlOption.xAxis) ? rtlOption.xAxis : [rtlOption.xAxis];
    rtlOption.xAxis = xAxis.map((axis: any) => ({
      ...axis,
      inverse: true,
      axisLabel: { ...axis?.axisLabel, fontFamily: CHART_FONT_FAMILY }
    }));
  }

  if (rtlOption.yAxis) {
    const yAxis = Array.isArray(rtlOption.yAxis) ? rtlOption.yAxis : [rtlOption.yAxis];
    rtlOption.yAxis = yAxis.map((axis: any) => ({
      ...axis,
      position: axis?.position === 'left' ? 'right' : axis?.position === 'right' ? 'left' : 'right',
      axisLabel: { ...axis?.axisLabel, fontFamily: CHART_FONT_FAMILY }
    }));
  }

  if (rtlOption.legend) {
    rtlOption.legend = {
      ...rtlOption.legend,
      right: 'auto',
      left: 20,
      textStyle: { ...(rtlOption.legend as any)?.textStyle, fontFamily: CHART_FONT_FAMILY }
    };
  }

  if (rtlOption.tooltip) {
    rtlOption.tooltip = {
      ...rtlOption.tooltip,
      textStyle: { ...(rtlOption.tooltip as any)?.textStyle, fontFamily: CHART_FONT_FAMILY }
    };
  }

  if (rtlOption.title) {
    rtlOption.title = {
      ...rtlOption.title,
      left: 'right',
      textStyle: { ...(rtlOption.title as any)?.textStyle, fontFamily: CHART_FONT_FAMILY }
    };
  }

  return rtlOption;
}

export default RTLEChart;
