import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const invitationSchema = z.object({
  email: z.string().email().max(255),
  role: z.enum(['admin', 'manager', 'user']),
  invitedBy: z.string().trim().min(1).max(100)
});

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

interface InvitationRequest {
  email: string;
  role: 'admin' | 'manager' | 'user';
  invitedBy: string;
}

// Rate Limiting Function
async function checkRateLimit(
  supabase: any,
  identifier: string,
  endpoint: string,
  maxRequests: number = 10,
  windowMinutes: number = 15
): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date();
  windowStart.setMinutes(windowStart.getMinutes() - windowMinutes);

  try {
    // البحث عن السجلات الحالية
    const { data: existing, error: fetchError } = await supabase
      .from('rate_limit_tracking')
      .select('*')
      .eq('identifier', identifier)
      .eq('endpoint', endpoint)
      .gte('window_start', windowStart.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Rate limit fetch error:', fetchError);
      return { allowed: true, remaining: maxRequests };
    }

    if (!existing || existing.length === 0) {
      // إنشاء سجل جديد
      const { error: insertError } = await supabase
        .from('rate_limit_tracking')
        .insert({
          identifier,
          endpoint,
          request_count: 1,
          window_start: new Date().toISOString()
        });

      if (insertError) {
        console.error('Rate limit insert error:', insertError);
      }

      return { allowed: true, remaining: maxRequests - 1 };
    }

    const record = existing[0];
    const currentCount = record.request_count || 0;

    if (currentCount >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    // تحديث العداد
    const { error: updateError } = await supabase
      .from('rate_limit_tracking')
      .update({ 
        request_count: currentCount + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', record.id);

    if (updateError) {
      console.error('Rate limit update error:', updateError);
    }

    return { allowed: true, remaining: maxRequests - currentCount - 1 };
  } catch (error) {
    console.error('Rate limiting error:', error);
    return { allowed: true, remaining: maxRequests };
  }
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "غير مصرح", message: "يجب تسجيل الدخول للوصول إلى هذه الوظيفة" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Create client with anon key and user's JWT for authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      }
    );

    // Get authenticated user using the JWT token
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error in send-user-invitation:", authError);
      return new Response(
        JSON.stringify({ error: "غير مصرح", message: "جلسة غير صالحة. يرجى تسجيل الدخول مرة أخرى" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if user is admin
    const { data: userRole } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!userRole || userRole.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "غير مصرح", message: "هذه الوظيفة متاحة للمسؤولين فقط" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create service role client for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Rate Limiting Check - Use service role client to bypass RLS
    const rateLimitResult = await checkRateLimit(
      supabaseAdmin,  // Use service role client for rate limiting
      user.id,
      'send-user-invitation',
      10, // 10 requests
      15  // per 15 minutes
    );

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: 'تجاوز الحد المسموح',
          message: 'لقد تجاوزت الحد المسموح من الطلبات. يرجى المحاولة بعد 15 دقيقة',
          remaining: 0
        }),
        {
          status: 429,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + 15 * 60 * 1000).toISOString()
          }
        }
      );
    }

    const requestBody = await req.json();
    
    // Validate input
    const validationResult = invitationSchema.safeParse(requestBody);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid input",
          details: validationResult.error.errors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { email, role, invitedBy } = validationResult.data;

    console.log(`Processing invitation for role: ${role}`);

    // Create user with temporary password
    const tempPassword = crypto.randomUUID();
    const { data: newUser, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        invited_by: invitedBy,
        role: role,
      }
    });

    if (signUpError) {
      console.error("Error creating user:", signUpError);
      throw signUpError;
    }

    console.log("User created successfully:", newUser.user?.id);

    // Assign role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: newUser.user?.id,
        role: role,
      });

    if (roleError) {
      console.error("Error assigning role:", roleError);
    }

    // Generate password reset link
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
    });

    if (resetError) {
      console.error("Error generating reset link:", resetError);
      throw resetError;
    }

    console.log("Password reset link generated");

    // Send invitation email
    const roleLabels = {
      admin: 'مدير النظام',
      manager: 'مدير فرعي',
      user: 'مستخدم'
    };

    const emailResponse = await resend.emails.send({
      from: "نظام تتبع الإقرارات <onboarding@resend.dev>",
      to: [email],
      subject: "دعوة للانضمام إلى نظام تتبع الإقرارات",
      html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .info-box { background: white; padding: 15px; border-right: 4px solid #667eea; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 مرحباً بك في نظام تتبع الإقرارات</h1>
            </div>
            <div class="content">
              <p>تم دعوتك بواسطة <strong>${invitedBy}</strong> للانضمام إلى نظام تتبع الإقرارات.</p>
              
              <div class="info-box">
                <h3>📋 معلومات حسابك</h3>
                <p><strong>البريد الإلكتروني:</strong> ${email}</p>
                <p><strong>الصلاحية:</strong> ${roleLabels[role]}</p>
              </div>

              <p>لإكمال تسجيلك وتعيين كلمة المرور الخاصة بك، يرجى الضغط على الزر أدناه:</p>
              
              <div style="text-align: center;">
                <a href="${resetData.properties.action_link}" class="button">
                  تعيين كلمة المرور والدخول
                </a>
              </div>

              <p style="color: #666; font-size: 14px;">
                ملاحظة: هذا الرابط صالح لمدة 24 ساعة فقط.
              </p>

              <div class="info-box">
                <h3>🔒 بعد تعيين كلمة المرور</h3>
                <p>سيمكنك تسجيل الدخول إلى النظام باستخدام بريدك الإلكتروني وكلمة المرور الجديدة.</p>
              </div>
            </div>
            <div class="footer">
              <p>© 2025 نظام تتبع الإقرارات. جميع الحقوق محفوظة.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        userId: newUser.user?.id,
        message: "تم إرسال الدعوة بنجاح",
        rateLimit: {
          remaining: rateLimitResult.remaining
        }
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    // Log detailed error server-side for debugging
    console.error("[Internal] Send invitation error:", {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    
    const corsHeaders = getCorsHeaders(req);
    
    // Return safe generic message to client
    return new Response(
      JSON.stringify({
        error: "فشل إرسال الدعوة",
        message: "حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
