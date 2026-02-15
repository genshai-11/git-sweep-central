import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RepoPayload {
  name: string;
  local_path?: string;
  remote_url?: string;
  account?: string;
  sync_status?: "synced" | "behind" | "dirty" | "unknown";
  size_bytes?: number;
  exists_locally?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const repos: RepoPayload[] = Array.isArray(body.repositories) ? body.repositories : [];

    if (repos.length === 0) {
      return new Response(JSON.stringify({ error: "No repositories provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let upserted = 0;
    let errors: string[] = [];

    for (const repo of repos) {
      if (!repo.name) {
        errors.push("Missing name for a repository entry");
        continue;
      }

      // Upsert by name + user_id: update if exists, insert if not
      const { data: existing } = await supabase
        .from("repositories")
        .select("id")
        .eq("user_id", userId)
        .eq("name", repo.name)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("repositories")
          .update({
            local_path: repo.local_path,
            remote_url: repo.remote_url,
            account: repo.account,
            sync_status: repo.sync_status || "unknown",
            size_bytes: repo.size_bytes || 0,
            exists_locally: repo.exists_locally ?? true,
            last_scan: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) errors.push(`Update ${repo.name}: ${error.message}`);
        else upserted++;
      } else {
        const { error } = await supabase.from("repositories").insert({
          user_id: userId,
          name: repo.name,
          local_path: repo.local_path,
          remote_url: repo.remote_url,
          account: repo.account,
          sync_status: repo.sync_status || "unknown",
          size_bytes: repo.size_bytes || 0,
          exists_locally: repo.exists_locally ?? true,
          last_scan: new Date().toISOString(),
        });

        if (error) errors.push(`Insert ${repo.name}: ${error.message}`);
        else upserted++;
      }
    }

    // Log the scan action
    await supabase.from("action_logs").insert({
      user_id: userId,
      action_type: "scan",
      details: `Synced ${upserted}/${repos.length} repositories`,
      result: errors.length === 0 ? "success" : "partial",
    });

    return new Response(
      JSON.stringify({
        success: true,
        upserted,
        total: repos.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("cli-sync error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
