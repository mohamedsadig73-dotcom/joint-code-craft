import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'manager' | 'user';
  allowedRoles?: Array<'admin' | 'manager' | 'user'>;
}

/**
 * مكون حماية الصفحات حسب الصلاحيات
 * 
 * @param requiredRole - الصلاحية المطلوبة للوصول (admin, manager, أو user)
 * @param allowedRoles - مصفوفة من الصلاحيات المسموح بها
 * 
 * ترتيب الأولوية: admin > manager > user
 * 
 * أمثلة الاستخدام:
 * - <ProtectedRoute requiredRole="admin">...</ProtectedRoute>
 * - <ProtectedRoute allowedRoles={['admin', 'manager']}>...</ProtectedRoute>
 */
export function ProtectedRoute({ 
  children, 
  requiredRole, 
  allowedRoles 
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // انتظار تحميل بيانات المستخدم
    if (loading) return;

    // التحقق من تسجيل الدخول
    if (!isAuthenticated || !user) {
      toast({
        variant: 'destructive',
        title: 'غير مصرح',
        description: 'يجب تسجيل الدخول للوصول إلى هذه الصفحة',
      });
      navigate('/login', { replace: true });
      return;
    }

    // التحقق من الصلاحيات
    const roleHierarchy = { admin: 3, manager: 2, user: 1 };
    const userRoleLevel = roleHierarchy[user.role];

    // إذا تم تحديد صلاحية واحدة مطلوبة
    if (requiredRole) {
      const requiredRoleLevel = roleHierarchy[requiredRole];
      if (userRoleLevel < requiredRoleLevel) {
        toast({
          variant: 'destructive',
          title: 'ممنوع الوصول',
          description: 'ليس لديك صلاحية الوصول لهذه الصفحة',
        });
        navigate('/', { replace: true });
        return;
      }
    }

    // إذا تم تحديد مصفوفة من الصلاحيات المسموح بها
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      toast({
        variant: 'destructive',
        title: 'ممنوع الوصول',
        description: 'ليس لديك صلاحية الوصول لهذه الصفحة',
      });
      navigate('/', { replace: true });
      return;
    }
  }, [loading, isAuthenticated, user, requiredRole, allowedRoles, navigate, toast]);

  // إظهار شاشة تحميل أثناء التحقق
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  // إذا نجحت جميع عمليات التحقق، عرض المحتوى
  if (isAuthenticated && user) {
    return <>{children}</>;
  }

  return null;
}
