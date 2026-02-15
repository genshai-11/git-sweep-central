const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOPIC_QUERIES: Record<string, string> = {
  // AI & ML
  "ai-ml": "machine-learning",
  "llm": "large-language-model",
  "ai-agents": "ai-agent",
  "ai-engineering": "ai",
  "computer-vision": "computer-vision",
  "nlp": "natural-language-processing",
  // Development
  "web-dev": "react",
  "frontend": "frontend",
  "backend": "backend",
  "fullstack": "fullstack",
  "mobile": "react-native",
  "cli-tools": "command-line",
  // Infrastructure
  "devops": "kubernetes",
  "cloud": "cloud-native",
  "database": "database",
  "api": "api",
  // Data & Science
  "data-science": "data-science",
  "data-engineering": "data-engineering",
  // Security & Infra
  "security": "cybersecurity",
  "blockchain": "blockchain",
  // Other
  "game-dev": "game-engine",
  "rust": "rust",
  "go": "golang",
  "python": "python",
  "typescript": "typescript",
  "tutorials": "tutorial",
  "awesome-lists": "awesome",
};

const PERIOD_MIN_STARS: Record<string, number> = {
  daily: 100,
  weekly: 500,
  monthly: 200,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const topic = url.searchParams.get("topic") || "ai-ml";
    const period = url.searchParams.get("period") || "weekly";
    const page = parseInt(url.searchParams.get("page") || "1");
    const perPage = Math.min(parseInt(url.searchParams.get("per_page") || "20"), 30);

    const now = new Date();
    let since: Date;
    switch (period) {
      case "daily":
        since = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
        break;
      case "monthly":
        since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "weekly":
      default:
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
    }

    const dateStr = since.toISOString().split("T")[0];
    const minStars = PERIOD_MIN_STARS[period] || 500;
    const topicKeyword = TOPIC_QUERIES[topic] || topic;

    // Simple reliable query: topic + recent push + min stars
    const query = `topic:${topicKeyword} pushed:>${dateStr} stars:>=${minStars}`;

    console.log("Search query:", query);

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
      JSON.stringify({ repos, total_count: ghData.total_count, page, per_page: perPage }),
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
