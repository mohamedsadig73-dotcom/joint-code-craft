import { useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type ThemePreference = 'light' | 'dark' | 'system';

export function useThemePersistence() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  // Load theme from database on mount/login
  const loadThemeFromDB = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('theme_preference')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading theme preference:', error);
        return;
      }

      if (data?.theme_preference) {
        setTheme(data.theme_preference);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  }, [user?.id, setTheme]);

  // Save theme to database
  const saveThemeToDB = useCallback(async (newTheme: ThemePreference) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ theme_preference: newTheme })
        .eq('id', user.id);

      if (error) {
        console.error('Error saving theme preference:', error);
      }
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  }, [user?.id]);

  // Load theme on user login
  useEffect(() => {
    loadThemeFromDB();
  }, [loadThemeFromDB]);

  // Persist theme changes to database
  const setThemeWithPersistence = useCallback((newTheme: ThemePreference) => {
    setTheme(newTheme);
    saveThemeToDB(newTheme);
  }, [setTheme, saveThemeToDB]);

  return {
    theme: theme as ThemePreference | undefined,
    setTheme: setThemeWithPersistence,
    isLoading: false,
  };
}
