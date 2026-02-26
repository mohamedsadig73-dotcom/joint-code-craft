import { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('pwa-prompt-dismissed')) return;
    if (isStandalone()) return;

    // Show iOS prompt after 3 seconds
    if (isIOS()) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    // Listen for install prompt (Android/Desktop)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setShowPrompt(false);
      setDeferredPrompt(null);
    } else {
      // iOS - navigate to install page for instructions
      navigate('/install');
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (!showPrompt) return null;

  const isiOS = isIOS();

  return (
    <div className="fixed bottom-20 left-3 right-3 md:left-auto md:right-4 md:w-80 z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-card border border-border/50 rounded-xl shadow-xl p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            {isiOS ? (
              <Share className="w-5 h-5 text-primary shrink-0" />
            ) : (
              <Download className="w-5 h-5 text-primary shrink-0" />
            )}
            <h3 className="font-semibold text-sm">ثبّت التطبيق على جهازك</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleDismiss}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {isiOS
            ? 'أضف التطبيق للشاشة الرئيسية للوصول السريع'
            : 'ثبّت التطبيق للوصول السريع والعمل بدون إنترنت'
          }
        </p>
        <div className="flex gap-2">
          <Button onClick={handleInstall} className="flex-1 gap-2" size="sm">
            {isiOS ? (
              <>
                <Share className="w-3.5 h-3.5" />
                طريقة التثبيت
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                تثبيت
              </>
            )}
          </Button>
          <Button onClick={handleDismiss} variant="outline" size="sm">
            لاحقاً
          </Button>
        </div>
      </div>
    </div>
  );
}
