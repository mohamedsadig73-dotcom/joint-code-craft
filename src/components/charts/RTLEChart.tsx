import { useRef, useEffect } from 'react';
import * as echarts from 'echarts';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

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

  // Detect dark mode
  const isDark = theme === 'dark' || 
    (typeof window !== 'undefined' && document.documentElement.classList.contains('dark'));

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart
    chartInstance.current = echarts.init(chartRef.current, isDark ? 'dark' : undefined, {
      renderer: 'canvas',
      locale: isRTL ? 'AR' : 'EN'
    });

    if (onInit && chartInstance.current) {
      onInit(chartInstance.current);
    }

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      chartInstance.current?.resize();
    });
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chartInstance.current?.dispose();
    };
  }, [isDark, isRTL, onInit]);

  useEffect(() => {
    if (!chartInstance.current) return;

    // Apply RTL transformations to options
    const rtlOption = applyRTLToOption(option, isRTL);
    
    chartInstance.current.setOption(rtlOption, true);
    
    if (loading) {
      chartInstance.current.showLoading({
        text: isRTL ? 'جاري التحميل...' : 'Loading...',
        color: 'hsl(var(--primary))',
        textColor: 'hsl(var(--foreground))',
        maskColor: 'hsla(var(--background), 0.8)',
        fontSize: 14,
        fontFamily: 'IBM Plex Sans Arabic, IBM Plex Sans, sans-serif'
      });
    } else {
      chartInstance.current.hideLoading();
    }
  }, [option, loading, isRTL]);

  // Re-initialize on theme change
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          if (chartRef.current && chartInstance.current) {
            chartInstance.current.dispose();
            const newIsDark = document.documentElement.classList.contains('dark');
            chartInstance.current = echarts.init(chartRef.current, newIsDark ? 'dark' : undefined);
            const rtlOption = applyRTLToOption(option, isRTL);
            chartInstance.current.setOption(rtlOption);
          }
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, [option, isRTL]);

  return (
    <div 
      ref={chartRef} 
      className={cn('w-full', className)}
      style={style}
      dir={isRTL ? 'rtl' : 'ltr'}
    />
  );
}

// Helper function to apply RTL transformations to chart options
function applyRTLToOption(option: echarts.EChartsOption, isRTL: boolean): echarts.EChartsOption {
  if (!isRTL) return option;

  const rtlOption = { ...option };

  // Reverse xAxis for RTL
  if (rtlOption.xAxis) {
    const xAxis = Array.isArray(rtlOption.xAxis) ? rtlOption.xAxis : [rtlOption.xAxis];
    rtlOption.xAxis = xAxis.map((axis: any) => ({
      ...axis,
      inverse: true,
      axisLabel: {
        ...axis?.axisLabel,
        fontFamily: 'IBM Plex Sans Arabic, IBM Plex Sans, sans-serif'
      }
    }));
  }

  // Adjust yAxis position for RTL
  if (rtlOption.yAxis) {
    const yAxis = Array.isArray(rtlOption.yAxis) ? rtlOption.yAxis : [rtlOption.yAxis];
    rtlOption.yAxis = yAxis.map((axis: any) => ({
      ...axis,
      position: axis?.position === 'left' ? 'right' : axis?.position === 'right' ? 'left' : 'right',
      axisLabel: {
        ...axis?.axisLabel,
        fontFamily: 'IBM Plex Sans Arabic, IBM Plex Sans, sans-serif'
      }
    }));
  }

  // Adjust legend position for RTL
  if (rtlOption.legend) {
    rtlOption.legend = {
      ...rtlOption.legend,
      right: isRTL ? 'auto' : (rtlOption.legend as any)?.right,
      left: isRTL ? 20 : (rtlOption.legend as any)?.left,
      textStyle: {
        ...(rtlOption.legend as any)?.textStyle,
        fontFamily: 'IBM Plex Sans Arabic, IBM Plex Sans, sans-serif'
      }
    };
  }

  // Adjust tooltip
  if (rtlOption.tooltip) {
    rtlOption.tooltip = {
      ...rtlOption.tooltip,
      textStyle: {
        ...(rtlOption.tooltip as any)?.textStyle,
        fontFamily: 'IBM Plex Sans Arabic, IBM Plex Sans, sans-serif'
      }
    };
  }

  // Adjust title
  if (rtlOption.title) {
    rtlOption.title = {
      ...rtlOption.title,
      left: isRTL ? 'right' : (rtlOption.title as any)?.left,
      textStyle: {
        ...(rtlOption.title as any)?.textStyle,
        fontFamily: 'IBM Plex Sans Arabic, IBM Plex Sans, sans-serif'
      }
    };
  }

  return rtlOption;
}

export default RTLEChart;
