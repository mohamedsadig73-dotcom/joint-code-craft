import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useToast } from '@/hooks/use-toast';

export function RegisterSW() {
  const { toast } = useToast();

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      toast({
        title: 'تحديث متاح',
        description: 'نسخة جديدة من التطبيق متاحة',
        action: (
          <button
            onClick={() => {
              updateServiceWorker(true);
              setNeedRefresh(false);
            }}
            className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-sm"
          >
            تحديث الآن
          </button>
        ),
      });
    }
  }, [needRefresh, toast, updateServiceWorker, setNeedRefresh]);

  return null;
}
