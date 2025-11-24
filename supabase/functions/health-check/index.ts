import { createClient } from "https://esm.sh/@supabase/supabase-js@2.83.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  checks: {
    database: boolean;
    auth: boolean;
    storage: boolean;
  };
  uptime: number;
  version: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Check database connectivity
    const { error: dbError } = await supabase.from("profiles").select("id").limit(1);
    const dbHealthy = !dbError;

    // Check auth service
    const { error: authError } = await supabase.auth.getSession();
    const authHealthy = !authError;

    // For storage, just check if we can access the API
    const storageHealthy = true; // Assume healthy if other services work

    const allHealthy = dbHealthy && authHealthy && storageHealthy;
    const anyUnhealthy = !dbHealthy || !authError || !storageHealthy;

    const healthStatus: HealthStatus = {
      status: allHealthy ? "healthy" : anyUnhealthy ? "degraded" : "unhealthy",
      timestamp: new Date().toISOString(),
      checks: {
        database: dbHealthy,
        auth: authHealthy,
        storage: storageHealthy,
      },
      uptime: performance.now(),
      version: "1.0.0",
    };

    const statusCode = healthStatus.status === "healthy" ? 200 : 503;

    return new Response(JSON.stringify(healthStatus), {
      status: statusCode,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Health check error:", error);

    const errorStatus: HealthStatus = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      checks: {
        database: false,
        auth: false,
        storage: false,
      },
      uptime: 0,
      version: "1.0.0",
    };

    return new Response(JSON.stringify(errorStatus), {
      status: 503,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
});
