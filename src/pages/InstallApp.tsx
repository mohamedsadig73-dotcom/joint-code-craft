import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, Monitor, Download, CheckCircle, ArrowLeft } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallApp() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="gap-2 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          العودة للرئيسية
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3">تثبيت التطبيق</h1>
          <p className="text-muted-foreground text-lg">
            ثبّت التطبيق على جهازك للوصول السريع والعمل بدون إنترنت
          </p>
        </div>

        {isInstalled ? (
          <Card className="glass-card border-border/50 mb-6">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <h2 className="text-2xl font-bold mb-2">التطبيق مثبت بالفعل!</h2>
              <p className="text-muted-foreground">
                يمكنك الآن الوصول إلى التطبيق من الشاشة الرئيسية لجهازك
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Android/Desktop Install */}
            {deferredPrompt && !isIOS && (
              <Card className="glass-card border-border/50 mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    تثبيت سريع
                  </CardTitle>
                  <CardDescription>
                    انقر على الزر أدناه لتثبيت التطبيق مباشرة
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleInstall}
                    className="w-full gap-2 text-lg py-6"
                    size="lg"
                  >
                    <Download className="w-5 h-5" />
                    تثبيت التطبيق الآن
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* iOS Instructions */}
            {isIOS && (
              <Card className="glass-card border-border/50 mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5" />
                    تثبيت على iPhone أو iPad
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ol className="list-decimal list-inside space-y-3 text-right">
                    <li className="text-lg">
                      اضغط على زر <strong>المشاركة</strong> في شريط الأدوات السفلي
                      <span className="block text-sm text-muted-foreground mt-1">
                        (الأيقونة المربعة مع السهم للأعلى)
                      </span>
                    </li>
                    <li className="text-lg">
                      مرر للأسفل واختر <strong>"إضافة إلى الشاشة الرئيسية"</strong>
                    </li>
                    <li className="text-lg">
                      اضغط على <strong>"إضافة"</strong> في الزاوية العلوية اليمنى
                    </li>
                  </ol>
                </CardContent>
              </Card>
            )}

            {/* Desktop Instructions */}
            {!isIOS && !deferredPrompt && (
              <Card className="glass-card border-border/50 mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="w-5 h-5" />
                    تثبيت على الكمبيوتر
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg">Google Chrome:</h3>
                    <ol className="list-decimal list-inside space-y-2">
                      <li>انقر على أيقونة القائمة (⋮) في الزاوية العلوية</li>
                      <li>اختر "حفظ وم شاركة" ثم "تثبيت التطبيق"</li>
                    </ol>
                  </div>

                  <div className="space-y-3 pt-4">
                    <h3 className="font-semibold text-lg">Microsoft Edge:</h3>
                    <ol className="list-decimal list-inside space-y-2">
                      <li>انقر على أيقونة (⋯) في الزاوية العلوية</li>
                      <li>اختر "التطبيقات" ثم "تثبيت هذا الموقع كتطبيق"</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Features */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">🚀 الوصول السريع</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                افتح التطبيق مباشرة من الشاشة الرئيسية دون الحاجة لفتح المتصفح
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">📱 تجربة أصلية</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                يعمل التطبيق بشكل كامل الشاشة مثل التطبيقات الأصلية
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">⚡ أداء أفضل</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                تحميل أسرع وأداء محسّن مع إمكانية التخزين المؤقت
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">🔔 إشعارات فورية</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                احصل على تنبيهات فورية عند تحديث حالة الإقرارات
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
