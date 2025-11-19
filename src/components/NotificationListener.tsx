import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Bell, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface Notification {
  id: string;
  user_id: string;
  declaration_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export function NotificationListener() {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    console.log('🔔 Setting up notification listener for user:', user.id);

    // Subscribe to realtime notifications
    const channel = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🔔 New notification received:', payload);
          const notification = payload.new as Notification;
          
          // Show toast notification
          const icon = notification.type === 'success' 
            ? CheckCircle 
            : notification.type === 'error' 
            ? AlertCircle 
            : Info;

          toast({
            title: (
              <div className="flex items-center gap-2">
                {icon === CheckCircle && <CheckCircle className="w-4 h-4 text-green-500" />}
                {icon === AlertCircle && <AlertCircle className="w-4 h-4 text-red-500" />}
                {icon === Info && <Info className="w-4 h-4 text-blue-500" />}
                <span>{notification.title}</span>
              </div>
            ) as any,
            description: notification.message,
            variant: notification.type === 'error' ? 'destructive' : 'default',
          });

          // Play notification sound
          playNotificationSound();
        }
      )
      .subscribe((status) => {
        console.log('🔔 Notification channel status:', status);
      });

    return () => {
      console.log('🔔 Cleaning up notification listener');
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  return null;
}

function playNotificationSound() {
  try {
    // Create a simple notification beep using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
}
