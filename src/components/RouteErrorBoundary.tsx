import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isChunkLoadError, trackChunkError } from '@/utils/chunkErrorTracking';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
  isChunkError: boolean;
}

export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null, isChunkError: false };

  static getDerivedStateFromError(error: Error): State {
    return { error, isChunkError: isChunkLoadError(error) };
  }

  componentDidCatch(error: Error) {
    if (isChunkLoadError(error)) {
      trackChunkError(error, false);
    } else {
      // eslint-disable-next-line no-console
      console.error('[RouteErrorBoundary]', error);
    }
  }

  handleRetry = () => {
    this.setState({ error: null, isChunkError: false });
  };

  handleHardReload = () => {
    try {
      sessionStorage.removeItem('__chunk_reload_once__');
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = '/';
  };

  render() {
    if (!this.state.error) return this.props.children;

    const isAr =
      typeof document !== 'undefined' && document.documentElement.lang === 'ar';
    const t = (ar: string, en: string) => (isAr ? ar : en);

    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center bg-background"
        role="alert"
      >
        <div className="rounded-full bg-destructive/10 p-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
        </div>
        <div className="space-y-2 max-w-md">
          <h1 className="text-2xl font-bold">
            {this.state.isChunkError
              ? t('تعذر تحميل الصفحة', 'Failed to load page')
              : t('حدث خطأ غير متوقع', 'Something went wrong')}
          </h1>
          <p className="text-muted-foreground text-sm">
            {this.state.isChunkError
              ? t(
                  'يبدو أن إصداراً جديداً نُشر للتو. أعد المحاولة أو حمّل التطبيق من جديد.',
                  'A new version was just deployed. Retry or reload the app.'
                )
              : this.state.error?.message ||
                t('يمكنك إعادة المحاولة أو العودة للرئيسية', 'You can retry or go home')}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button onClick={this.handleRetry} variant="outline">
            <RefreshCw className="h-4 w-4 me-2" />
            {t('إعادة المحاولة', 'Retry')}
          </Button>
          <Button onClick={this.handleHardReload}>
            <RefreshCw className="h-4 w-4 me-2" />
            {t('تحميل التطبيق من جديد', 'Reload app')}
          </Button>
          <Button onClick={this.handleHome} variant="ghost">
            <Home className="h-4 w-4 me-2" />
            {t('الرئيسية', 'Home')}
          </Button>
        </div>
      </div>
    );
  }
}