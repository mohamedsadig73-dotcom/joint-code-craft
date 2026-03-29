import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  Deno.env.get("ALLOWED_ORIGIN") ?? "https://dts-store.lovable.app",
  "https://dts-store.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
  "https://lovable.dev",
];

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  const allowedOrigin = origin && ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.app') || origin.endsWith('.lovable.dev')
  ) ? origin : ALLOWED_ORIGINS[0];
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
}

type NotificationType = 
  | 'user_deleted' 
  | 'declaration_status_changed' 
  | 'maintenance_reminder';

interface NotificationRequest {
  type: NotificationType;
  recipientEmail: string;
  recipientName?: string;
  data: Record<string, any>;
}

const getEmailTemplate = (type: NotificationType, data: Record<string, any>): { subject: string; html: string } => {
  const baseStyles = `
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; direction: rtl; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
      .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
      .info-box { background: white; padding: 15px; border-right: 4px solid #667eea; margin: 20px 0; border-radius: 4px; }
      .warning-box { background: #fef3cd; padding: 15px; border-right: 4px solid #ffc107; margin: 20px 0; border-radius: 4px; }
      .danger-box { background: #f8d7da; padding: 15px; border-right: 4px solid #dc3545; margin: 20px 0; border-radius: 4px; }
      .success-box { background: #d4edda; padding: 15px; border-right: 4px solid #28a745; margin: 20px 0; border-radius: 4px; }
      .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    </style>
  `;

  switch (type) {
    case 'user_deleted':
      return {
        subject: '⚠️ تم حذف حساب مستخدم',
        html: `
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
          <head><meta charset="utf-8">${baseStyles}</head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🗑️ إشعار حذف مستخدم</h1>
              </div>
              <div class="content">
                <p>مرحباً،</p>
                <p>نود إعلامك بأنه تم حذف حساب مستخدم من النظام.</p>
                
                <div class="danger-box">
                  <h3>📋 تفاصيل العملية</h3>
                  <p><strong>المستخدم المحذوف:</strong> ${data.deletedUsername || 'غير محدد'}</p>
                  <p><strong>البريد الإلكتروني:</strong> ${data.deletedEmail || 'غير محدد'}</p>
                  <p><strong>تم الحذف بواسطة:</strong> ${data.deletedBy || 'مدير النظام'}</p>
                  <p><strong>التاريخ:</strong> ${new Date().toLocaleString('ar-SA')}</p>
                </div>

                <p>إذا لم تكن على علم بهذا الإجراء، يرجى التواصل مع مدير النظام فوراً.</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} نظام تتبع الإقرارات. جميع الحقوق محفوظة.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

    case 'declaration_status_changed':
      const statusLabels: Record<string, string> = {
        draft: 'مسودة',
        pending_warehouse_signature: 'بانتظار توقيع المخزن',
        warehouse_signed: 'موقّع من المخزن',
        sent_to_admin_office: 'مُرسل إلى المكتب الإداري',
        received_by_admin_office: 'مستلم من المكتب الإداري',
        returned_to_warehouse: 'مُعاد إلى المخزن للأرشفة',
        archived: 'مؤرشف',
        rejected: 'مرفوض'
      };
      
      return {
        subject: `📋 تحديث حالة الإقرار: ${data.declarationId?.substring(0, 8) || ''}`,
        html: `
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
          <head><meta charset="utf-8">${baseStyles}</head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📋 تحديث حالة إقرار</h1>
              </div>
              <div class="content">
                <p>مرحباً ${data.recipientName || ''},</p>
                <p>تم تحديث حالة إقرار تتابعه.</p>
                
                <div class="info-box">
                  <h3>📄 تفاصيل الإقرار</h3>
                  <p><strong>رقم الإقرار:</strong> ${data.declarationId || 'غير محدد'}</p>
                  <p><strong>رقم الأرشيف:</strong> ${data.archiveNumber || '-'}</p>
                </div>

                <div class="${data.newStatus === 'rejected' ? 'danger-box' : data.newStatus === 'archived' ? 'success-box' : 'warning-box'}">
                  <h3>🔄 تغيير الحالة</h3>
                  <p><strong>من:</strong> ${statusLabels[data.oldStatus] || data.oldStatus}</p>
                  <p><strong>إلى:</strong> ${statusLabels[data.newStatus] || data.newStatus}</p>
                  <p><strong>التاريخ:</strong> ${new Date().toLocaleString('ar-SA')}</p>
                </div>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} نظام تتبع الإقرارات. جميع الحقوق محفوظة.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

    case 'maintenance_reminder':
      return {
        subject: `🔧 تذكير صيانة: ${data.itemName || ''}`,
        html: `
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
          <head><meta charset="utf-8">${baseStyles}</head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔧 تذكير بموعد صيانة</h1>
              </div>
              <div class="content">
                <p>مرحباً،</p>
                <p>هذا تذكير بموعد صيانة قادم أو متأخر.</p>
                
                <div class="${data.isOverdue ? 'danger-box' : 'warning-box'}">
                  <h3>${data.isOverdue ? '⚠️ صيانة متأخرة' : '📅 صيانة قادمة'}</h3>
                  <p><strong>البند:</strong> ${data.itemName || 'غير محدد'}</p>
                  <p><strong>الموقع:</strong> ${data.location || '-'}</p>
                  <p><strong>التاريخ المحدد:</strong> ${data.scheduledDate || 'غير محدد'}</p>
                  ${data.isOverdue ? `<p><strong>متأخر بـ:</strong> ${data.daysOverdue || 0} يوم</p>` : ''}
                </div>

                <div class="info-box">
                  <h3>📝 ملاحظات</h3>
                  <p>${data.notes || 'لا توجد ملاحظات'}</p>
                </div>

                <p>يرجى اتخاذ الإجراء المناسب في أقرب وقت ممكن.</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} نظام تتبع الإقرارات. جميع الحقوق محفوظة.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

    default:
      return {
        subject: 'إشعار من نظام تتبع الإقرارات',
        html: `
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
          <head><meta charset="utf-8">${baseStyles}</head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📬 إشعار جديد</h1>
              </div>
              <div class="content">
                <p>لديك إشعار جديد من نظام تتبع الإقرارات.</p>
                <div class="info-box">
                  <pre>${JSON.stringify(data, null, 2)}</pre>
                </div>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} نظام تتبع الإقرارات. جميع الحقوق محفوظة.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    // Allow service role OR authenticated users with manager/admin role
    let isAuthorized = false;
    
    if (authHeader === `Bearer ${supabaseServiceKey}`) {
      // Service role (for triggers/cron)
      isAuthorized = true;
    } else if (authHeader) {
      // Check user role
      const token = authHeader.replace("Bearer ", "");
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );

      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
      
      if (!authError && user) {
        const { data: userRole } = await supabaseClient
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        
        if (userRole && ['admin', 'manager'].includes(userRole.role)) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: "غير مصرح", message: "ليس لديك صلاحية لإرسال الإشعارات" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { type, recipientEmail, recipientName, data }: NotificationRequest = await req.json();

    if (!type || !recipientEmail) {
      return new Response(
        JSON.stringify({ error: "بيانات ناقصة", message: "يجب تحديد نوع الإشعار والبريد الإلكتروني" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { subject, html } = getEmailTemplate(type, { ...data, recipientName });

    const emailResponse = await resend.emails.send({
      from: "نظام تتبع الإقرارات <onboarding@resend.dev>",
      to: [recipientEmail],
      subject,
      html,
    });

    console.log(`Email sent successfully (${type}):`, emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "تم إرسال الإشعار بنجاح", id: emailResponse.data?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("[Internal] Send notification error:", {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    
    return new Response(
      JSON.stringify({ 
        error: "فشل إرسال الإشعار", 
        message: "حدث خطأ أثناء إرسال الإشعار. يرجى المحاولة مرة أخرى أو التواصل مع الدعم الفني.",
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
