import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, CheckCircle, ArrowLeft, Share, Plus, Smartphone, Monitor, Chrome } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Platform = 'ios' | 'android' | 'desktop';

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

function isSafari(): boolean {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true;
}

export default function InstallApp() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform] = useState<Platform>(detectPlatform);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
    setInstalling(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">تثبيت التطبيق</h1>
        </div>

        {/* App Info Card */}
        <Card className="border-border/50 mb-6 overflow-hidden">
          <div className="bg-gradient-to-l from-primary/20 to-primary/5 p-6 text-center">
            <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <img src="/pwa-icon-192.png" alt="DTS" className="w-12 h-12 rounded-xl" />
            </div>
            <h2 className="text-lg font-bold mb-1">نظام إدارة الإقرارات</h2>
            <p className="text-sm text-muted-foreground">DMS - الإصدار 4.1</p>
          </div>
        </Card>

        {isInstalled ? (
          <Card className="border-green-500/30 bg-green-500/5 mb-6">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="w-14 h-14 mx-auto mb-3 text-green-500" />
              <h2 className="text-xl font-bold mb-2">التطبيق مثبّت ✓</h2>
              <p className="text-sm text-muted-foreground">
                يمكنك فتحه من الشاشة الرئيسية لجهازك
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Native Install Button (Android/Desktop with prompt) */}
            {deferredPrompt && (
              <Button
                onClick={handleInstall}
                disabled={installing}
                className="w-full gap-3 text-base py-6 mb-6 shadow-lg"
                size="lg"
              >
                <Download className="w-5 h-5" />
                {installing ? 'جاري التثبيت...' : 'تثبيت التطبيق الآن'}
              </Button>
            )}

            {/* iOS Instructions */}
            {platform === 'ios' && (
              <Card className="border-border/50 mb-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-primary" />
                    التثبيت على الآيفون
                  </CardTitle>
                  {!isSafari() && (
                    <p className="text-xs text-destructive font-medium mt-1">
                      ⚠️ يجب استخدام متصفح Safari للتثبيت
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Step 1 */}
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold shrink-0">1</div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">اضغط على زر المشاركة</p>
                      <div className="flex items-center gap-2 mt-2 p-3 rounded-lg bg-muted/50">
                        <Share className="w-6 h-6 text-primary" />
                        <span className="text-xs text-muted-foreground">الأيقونة المربعة مع السهم في الأسفل</span>
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold shrink-0">2</div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">اختر "إضافة إلى الشاشة الرئيسية"</p>
                      <div className="flex items-center gap-2 mt-2 p-3 rounded-lg bg-muted/50">
                        <Plus className="w-5 h-5 text-primary" />
                        <span className="text-xs text-muted-foreground">مرر القائمة للأسفل حتى تجدها</span>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold shrink-0">3</div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">اضغط "إضافة" في الأعلى</p>
                      <p className="text-xs text-muted-foreground mt-1">سيظهر التطبيق على شاشتك الرئيسية</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Android without prompt */}
            {platform === 'android' && !deferredPrompt && (
              <Card className="border-border/50 mb-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Chrome className="w-5 h-5 text-primary" />
                    التثبيت من Chrome
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold shrink-0">1</div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">اضغط على القائمة ⋮ في الأعلى</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold shrink-0">2</div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية"</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold shrink-0">3</div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">اضغط "تثبيت"</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Desktop without prompt */}
            {platform === 'desktop' && !deferredPrompt && (
              <Card className="border-border/50 mb-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-primary" />
                    التثبيت على الكمبيوتر
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p>• <strong>Chrome:</strong> القائمة ⋮ → حفظ ومشاركة → تثبيت التطبيق</p>
                  <p>• <strong>Edge:</strong> القائمة ⋯ → التطبيقات → تثبيت هذا الموقع</p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Features */}
        <h3 className="font-semibold text-sm text-muted-foreground mb-3">مميزات التطبيق المثبت</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '🚀', title: 'وصول سريع', desc: 'من الشاشة الرئيسية' },
            { icon: '📱', title: 'شاشة كاملة', desc: 'بدون شريط المتصفح' },
            { icon: '⚡', title: 'أداء أفضل', desc: 'تحميل أسرع' },
            { icon: '🔔', title: 'إشعارات', desc: 'تنبيهات فورية' },
          ].map((f) => (
            <Card key={f.title} className="border-border/30">
              <CardContent className="p-3 text-center">
                <span className="text-2xl">{f.icon}</span>
                <p className="font-medium text-xs mt-1">{f.title}</p>
                <p className="text-[10px] text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
