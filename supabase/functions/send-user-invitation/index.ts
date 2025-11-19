import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  role: 'admin' | 'manager' | 'user';
  invitedBy: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: userRole } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!userRole || userRole.role !== "admin") {
      throw new Error("Only admins can send invitations");
    }

    const { email, role, invitedBy }: InvitationRequest = await req.json();

    console.log(`Sending invitation to ${email} with role ${role}`);

    // Create user with temporary password
    const tempPassword = crypto.randomUUID();
    const { data: newUser, error: signUpError } = await supabaseClient.auth.admin.createUser({
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
    const { error: roleError } = await supabaseClient
      .from("user_roles")
      .insert({
        user_id: newUser.user?.id,
        role: role,
      });

    if (roleError) {
      console.error("Error assigning role:", roleError);
    }

    // Generate password reset link
    const { data: resetData, error: resetError } = await supabaseClient.auth.admin.generateLink({
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
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-user-invitation function:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
