const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const perPage = Math.min(parseInt(url.searchParams.get("per_page") || "10"), 30);

    if (!query.trim()) {
      return new Response(
        JSON.stringify({ repos: [], total_count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if it's a GitHub URL — fetch single repo
    const ghUrlMatch = query.trim().match(/github\.com\/([^/]+\/[^/]+)/);
    if (ghUrlMatch) {
      const fullName = ghUrlMatch[1].replace(/\.git$/, "");
      const ghResponse = await fetch(`https://api.github.com/repos/${fullName}`, {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Git-Sweepher-Dashboard",
        },
      });

      if (!ghResponse.ok) {
        return new Response(
          JSON.stringify({ repos: [], total_count: 0, error: "Repo not found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const item = await ghResponse.json();
      const repo = {
        github_id: item.id,
        name: item.full_name,
        description: item.description,
        url: item.html_url,
        stars: item.stargazers_count,
        forks: item.forks_count,
        language: item.language,
        topics: item.topics || [],
        created_at: item.created_at,
        updated_at: item.updated_at,
        owner_avatar: item.owner?.avatar_url,
      };

      return new Response(
        JSON.stringify({ repos: [repo], total_count: 1 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Otherwise, search GitHub
    const ghResponse = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&page=${page}&per_page=${perPage}`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Git-Sweepher-Dashboard",
        },
      }
    );

    if (!ghResponse.ok) {
      const errText = await ghResponse.text();
      console.error("GitHub API error:", ghResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "GitHub API error", status: ghResponse.status }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ghData = await ghResponse.json();
    const repos = (ghData.items || []).map((item: any) => ({
      github_id: item.id,
      name: item.full_name,
      description: item.description,
      url: item.html_url,
      stars: item.stargazers_count,
      forks: item.forks_count,
      language: item.language,
      topics: item.topics || [],
      created_at: item.created_at,
      updated_at: item.updated_at,
      owner_avatar: item.owner?.avatar_url,
    }));

    return new Response(
      JSON.stringify({ repos, total_count: ghData.total_count }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
