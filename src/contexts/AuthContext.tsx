import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface User {
  id: string;
  username: string;
  role: 'admin' | 'manager' | 'user';
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, username: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let rolesChannel: any = null;
    let mounted = true;

    const initAuth = async () => {
      try {
        console.log('Initializing auth...');
        
        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            if (!mounted) return;
            
            console.log('Auth state changed:', event, session?.user?.email);
            setSession(session);
            
            // Defer Supabase calls with setTimeout to prevent deadlock
            if (session?.user) {
              setTimeout(() => {
                if (mounted) {
                  loadUserProfile(session.user);
                }
              }, 0);
            } else {
              setUser(null);
              setLoading(false);
            }
          }
        );

        // Check for existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          setLoading(false);
          return;
        }
        
        if (!mounted) return;
        
        console.log('Existing session:', session?.user?.email);
        setSession(session);
        
        if (session?.user) {
          await loadUserProfile(session.user);
          
          // Set up realtime subscription for role changes after we have the user
          rolesChannel = supabase
            .channel('user_roles_changes')
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'user_roles',
                filter: `user_id=eq.${session.user.id}`,
              },
              () => {
                // Reload user profile when roles change
                if (mounted && session?.user) {
                  loadUserProfile(session.user);
                }
              }
            )
            .subscribe();
        } else {
          setLoading(false);
        }

        return subscription;
      } catch (error) {
        console.error('Auth initialization error:', error);
        setLoading(false);
      }
    };

    const subscription = initAuth();

    return () => {
      mounted = false;
      subscription.then(sub => sub?.unsubscribe());
      if (rolesChannel) {
        rolesChannel.unsubscribe();
      }
    };
  }, []);

  const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    const timeoutId = setTimeout(() => {
      console.error('Profile loading timeout');
      setUser({
        id: supabaseUser.id,
        username: supabaseUser.email?.split('@')[0] || 'User',
        email: supabaseUser.email || '',
        role: 'user',
      });
      setLoading(false);
    }, 10000); // 10 seconds timeout

    try {
      console.log('Loading profile for user:', supabaseUser.id);
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
      }

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', supabaseUser.id);
      
      if (roleError) {
        console.error('Role fetch error:', roleError);
      }
      
      clearTimeout(timeoutId);
      
      // Get highest priority role (admin > manager > user)
      const roles = (roleData || []).map((r: any) => r.role);
      const role = roles.includes('admin') ? 'admin' : roles.includes('manager') ? 'manager' : 'user';

      const username = (profile as any)?.username
        || (supabaseUser.user_metadata as any)?.username
        || supabaseUser.email?.split('@')[0]
        || 'User';

      const email = (profile as any)?.email || supabaseUser.email || '';

      console.log('Setting user with role:', role);

      setUser({
        id: (profile as any)?.id || supabaseUser.id,
        username,
        email,
        role,
      });
      
      setLoading(false);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error loading profile:', error);
      // حتى لو فشل جلب الملف الشخصي، نبقي المستخدم مسجلًا مع دور افتراضي
      const username = (supabaseUser.user_metadata as any)?.username
        || supabaseUser.email?.split('@')[0]
        || 'User';

      setUser({
        id: supabaseUser.id,
        username,
        email: supabaseUser.email || '',
        role: 'user',
      });
      
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user && data.session) {
        setSession(data.session);
        await loadUserProfile(data.user);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const signup = async (email: string, password: string, username: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isAuthenticated: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
