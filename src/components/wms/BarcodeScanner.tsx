import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Scan, Camera, X, Keyboard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface BarcodeScannerProps {
  onProductFound: (product: { id: string; name: string; sku: string; barcode: string | null }) => void;
  buttonText?: string;
  buttonVariant?: 'default' | 'outline' | 'ghost' | 'secondary';
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onProductFound,
  buttonText,
  buttonVariant = 'outline',
  buttonSize = 'sm'
}) => {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'manual' | 'camera'>('manual');
  const [barcode, setBarcode] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && mode === 'manual') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, mode]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      console.error('Camera error:', err);
      setError(language === 'ar' ? 'فشل في فتح الكاميرا' : 'Failed to access camera');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleModeChange = (newMode: 'manual' | 'camera') => {
    if (newMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    setMode(newMode);
    setError('');
  };

  const searchProduct = async (code: string) => {
    if (!code.trim()) return;
    
    setSearching(true);
    setError('');

    // Search by barcode or SKU
    const { data, error: searchError } = await supabase
      .from('wms_products')
      .select('id, name, sku, barcode')
      .or(`barcode.eq.${code},sku.ilike.${code}`)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (searchError) {
      setError(language === 'ar' ? 'خطأ في البحث' : 'Search error');
    } else if (data) {
      onProductFound(data);
      setOpen(false);
      setBarcode('');
      stopCamera();
    } else {
      setError(language === 'ar' ? 'المنتج غير موجود' : 'Product not found');
    }

    setSearching(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchProduct(barcode);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Many barcode scanners send Enter after the code
    if (e.key === 'Enter') {
      e.preventDefault();
      searchProduct(barcode);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setBarcode('');
    setError('');
    stopCamera();
    setMode('manual');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size={buttonSize}>
          <Scan className="h-4 w-4 me-2" />
          {buttonText || (language === 'ar' ? 'مسح باركود' : 'Scan Barcode')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            {language === 'ar' ? 'مسح الباركود' : 'Scan Barcode'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode Toggle */}
          <div className="flex gap-2">
            <Button
              variant={mode === 'manual' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => handleModeChange('manual')}
            >
              <Keyboard className="h-4 w-4 me-2" />
              {language === 'ar' ? 'إدخال يدوي' : 'Manual Input'}
            </Button>
            <Button
              variant={mode === 'camera' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => handleModeChange('camera')}
            >
              <Camera className="h-4 w-4 me-2" />
              {language === 'ar' ? 'الكاميرا' : 'Camera'}
            </Button>
          </div>

          {mode === 'manual' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  ref={inputRef}
                  placeholder={language === 'ar' ? 'أدخل الباركود أو رمز SKU...' : 'Enter barcode or SKU...'}
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  className="text-lg text-center font-mono"
                />
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {language === 'ar' 
                    ? 'استخدم ماسح الباركود المتصل أو أدخل الرمز يدوياً'
                    : 'Use a connected barcode scanner or enter the code manually'}
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={searching || !barcode.trim()}>
                {searching 
                  ? (language === 'ar' ? 'جاري البحث...' : 'Searching...') 
                  : (language === 'ar' ? 'بحث' : 'Search')}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                {cameraActive ? (
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">
                      {language === 'ar' ? 'جاري تحميل الكاميرا...' : 'Loading camera...'}
                    </p>
                  </div>
                )}
                {/* Scan overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-3/4 h-1/3 border-2 border-primary rounded-lg opacity-50" />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Input
                  placeholder={language === 'ar' ? 'أو أدخل الباركود يدوياً' : 'Or enter barcode manually'}
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="font-mono"
                />
                <Button onClick={() => searchProduct(barcode)} disabled={searching || !barcode.trim()}>
                  {language === 'ar' ? 'بحث' : 'Search'}
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                {language === 'ar' 
                  ? 'ملاحظة: مسح الكاميرا يتطلب مكتبة باركود متقدمة. استخدم الإدخال اليدوي حالياً.'
                  : 'Note: Camera scanning requires an advanced barcode library. Use manual input for now.'}
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-center text-sm">
              {error}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeScanner;
