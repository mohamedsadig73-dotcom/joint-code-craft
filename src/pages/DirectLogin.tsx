import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function DirectLogin() {
  const navigate = useNavigate();

  useEffect(() => {
    const directLogin = async () => {
      try {
        // تسجيل الدخول مباشرة للمستخدم mohammad sadig
        const { data, error } = await supabase.auth.signInWithPassword({
          email: 'mohamedsadig73@gmail.com',
          password: 'a@1122334455@A',
        });

        if (error) {
          console.error('Login error:', error);
          alert('فشل تسجيل الدخول: ' + error.message);
          navigate('/login');
          return;
        }

        if (data.user) {
          console.log('Login successful');
          navigate('/');
        }
      } catch (error) {
        console.error('Error:', error);
        navigate('/login');
      }
    };

    directLogin();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">جاري تسجيل الدخول...</h2>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      </div>
    </div>
  );
}
