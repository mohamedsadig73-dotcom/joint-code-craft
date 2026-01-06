import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  Deno.env.get("ALLOWED_ORIGIN") ?? "https://lovable.dev",
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

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Verify request has service role authorization (for cron jobs) or valid admin JWT
    const authHeader = req.headers.get("Authorization");
    
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized - Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if it's a service role key (for cron) or user JWT
    const token = authHeader.replace("Bearer ", "");
    
    // If it's the service role key, allow access (for scheduled jobs)
    if (token === supabaseServiceKey) {
      console.log("Service role authentication successful");
    } else {
      // Verify JWT token and check if user is admin
      const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey);
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
      
      if (authError || !user) {
        console.error("Invalid JWT token:", authError?.message);
        return new Response(
          JSON.stringify({ error: "Unauthorized - Invalid token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if user has admin or manager role
      const { data: roles, error: roleError } = await supabaseAuth
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'manager']);

      if (roleError || !roles || roles.length === 0) {
        console.error("User lacks required role:", roleError?.message);
        return new Response(
          JSON.stringify({ error: "Forbidden - Admin or manager role required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.log("User authenticated with role:", roles[0].role);
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // استدعاء دالة التحقق من الإشعارات
    const { error } = await supabase.rpc('check_maintenance_notifications');

    if (error) {
      console.error("Error checking maintenance notifications:", error);
      throw error;
    }

    console.log("Maintenance notifications checked successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Notifications checked" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    // Log detailed error server-side for debugging
    console.error("[Internal] Maintenance check error:", {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    
    // Return safe generic message to client
    return new Response(
      JSON.stringify({ 
        error: "Maintenance check failed",
        message: "An error occurred while checking maintenance schedule. Please try again or contact support if the issue persists.",
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
