import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type CalendarType = 'gregorian' | 'hijri';

interface CalendarContextType {
  calendarType: CalendarType;
  setCalendarType: (type: CalendarType) => Promise<void>;
  loading: boolean;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export function CalendarProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [calendarType, setCalendarTypeState] = useState<CalendarType>('gregorian');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadCalendarPreference();
    } else {
      setCalendarTypeState('gregorian');
      setLoading(false);
    }
  }, [user]);

  const loadCalendarPreference = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('calendar_preference')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      if (data?.calendar_preference) {
        setCalendarTypeState(data.calendar_preference as CalendarType);
      }
    } catch (error) {
      console.error('Error loading calendar preference:', error);
    } finally {
      setLoading(false);
    }
  };

  const setCalendarType = async (type: CalendarType) => {
    try {
      if (!user) {
        setCalendarTypeState(type);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ calendar_preference: type })
        .eq('id', user.id);

      if (error) throw error;

      setCalendarTypeState(type);
      
      toast({
        title: 'تم التحديث',
        description: `تم تغيير نوع التقويم إلى ${type === 'hijri' ? 'الهجري' : 'الميلادي'}`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: error.message || 'فشل تحديث نوع التقويم',
      });
    }
  };

  return (
    <CalendarContext.Provider value={{ calendarType, setCalendarType, loading }}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
}