import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Star, ExternalLink, TrendingUp, Plus, Loader2, GitFork } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TrendingRepo {
  github_id: number;
  name: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  language: string | null;
  topics: string[];
  created_at: string;
  owner_avatar: string | null;
}

const TOPIC_GROUPS = [
  {
    label: "AI & ML",
    topics: [
      { value: "ai-ml", label: "Machine Learning" },
      { value: "llm", label: "LLMs" },
      { value: "ai-agents", label: "AI Agents" },
      { value: "ai-engineering", label: "AI Engineering" },
      { value: "computer-vision", label: "Computer Vision" },
      { value: "nlp", label: "NLP" },
    ],
  },
  {
    label: "Development",
    topics: [
      { value: "web-dev", label: "Web Dev" },
      { value: "frontend", label: "Frontend" },
      { value: "backend", label: "Backend" },
      { value: "fullstack", label: "Fullstack" },
      { value: "mobile", label: "Mobile" },
      { value: "cli-tools", label: "CLI Tools" },
    ],
  },
  {
    label: "Infrastructure",
    topics: [
      { value: "devops", label: "DevOps" },
      { value: "cloud", label: "Cloud" },
      { value: "database", label: "Database" },
      { value: "api", label: "APIs" },
    ],
  },
  {
    label: "Data & Science",
    topics: [
      { value: "data-science", label: "Data Science" },
      { value: "data-engineering", label: "Data Eng" },
    ],
  },
  {
    label: "Security & Web3",
    topics: [
      { value: "security", label: "Security" },
      { value: "blockchain", label: "Blockchain" },
    ],
  },
  {
    label: "Languages & Other",
    topics: [
      { value: "rust", label: "Rust" },
      { value: "go", label: "Go" },
      { value: "python", label: "Python" },
      { value: "typescript", label: "TypeScript" },
      { value: "game-dev", label: "Game Dev" },
      { value: "tutorials", label: "Tutorials" },
      { value: "awesome-lists", label: "Awesome Lists" },
    ],
  },
];

const PERIODS = [
  { value: "daily", label: "Today" },
  { value: "weekly", label: "This Week" },
  { value: "monthly", label: "This Month" },
];

export default function Discover() {
  const [topic, setTopic] = useState("ai-ml");
  const [period, setPeriod] = useState("weekly");
  const [manualUrl, setManualUrl] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: trendingData, isLoading, error } = useQuery({
    queryKey: ["trending", topic, period],
    queryFn: async () => {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-trending?topic=${topic}&period=${period}&per_page=20`;
      const res = await fetch(url, {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch trending repos");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  const { data: starredRepoUrls = new Set<string>() } = useQuery({
    queryKey: ["starred-repo-urls"],
    queryFn: async () => {
      const { data, error } = await supabase.from("starred_repos").select("*, repositories(remote_url)");
      if (error) throw error;
      return new Set(data.map((s: any) => s.repositories?.remote_url).filter(Boolean));
    },
  });

  const saveRepo = useMutation({
    mutationFn: async ({
      name,
      remoteUrl,
      description,
      language,
      topics,
      notes,
    }: {
      name: string;
      remoteUrl: string;
      description?: string;
      language?: string;
      topics?: string[];
      notes?: string;
    }) => {
      // First create the repo entry
      const { data: repo, error: repoErr } = await supabase
        .from("repositories")
        .insert({
          user_id: user!.id,
          name,
          remote_url: remoteUrl,
          sync_status: "unknown" as const,
          exists_locally: false,
        })
        .select()
        .single();
      if (repoErr) throw repoErr;

      // Then star it
      const { error: starErr } = await supabase.from("starred_repos").insert({
        user_id: user!.id,
        repo_id: repo.id,
        description: description || null,
        language: language || null,
        tags: topics || [],
        personal_notes: notes || null,
      });
      if (starErr) throw starErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["starred-repo-urls"] });
      queryClient.invalidateQueries({ queryKey: ["starred-repos"] });
      queryClient.invalidateQueries({ queryKey: ["starred-repo-ids"] });
      queryClient.invalidateQueries({ queryKey: ["repositories"] });
      toast({ title: "Saved to Stars Gallery!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSaveManual = () => {
    if (!manualUrl.trim()) return;
    const name = manualUrl.replace(/https?:\/\/github\.com\//, "").replace(/\.git$/, "") || manualUrl;
    saveRepo.mutate({
      name,
      remoteUrl: manualUrl,
      description: manualDesc || undefined,
      notes: manualNotes || undefined,
    });
    setManualUrl("");
    setManualDesc("");
    setManualNotes("");
    setDialogOpen(false);
  };

  const trendingRepos: TrendingRepo[] = trendingData?.repos || [];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Discover</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Trending repos & save awesome finds</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="w-full sm:w-auto">
              <Plus className="mr-1.5 h-4 w-4" />
              Add Repo Manually
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save a Repo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>GitHub URL</Label>
                <Input
                  placeholder="https://github.com/owner/repo"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input
                  placeholder="What makes this repo awesome?"
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Personal Notes (optional)</Label>
                <Textarea
                  placeholder="Your notes..."
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <Button
                onClick={handleSaveManual}
                disabled={!manualUrl.trim() || saveRepo.isPending}
                className="w-full"
              >
                {saveRepo.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Star className="mr-2 h-4 w-4" />}
                Save to Stars
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Topic</Label>
          <Select value={topic} onValueChange={setTopic}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TOPIC_GROUPS.map((group) => (
                <div key={group.label}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{group.label}</div>
                  {group.topics.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Period</Label>
          <Tabs value={period} onValueChange={setPeriod}>
            <TabsList>
              {PERIODS.map((p) => (
                <TabsTrigger key={p.value} value={p.value} className="text-xs">
                  {p.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Fetching trending repos...</span>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Failed to fetch trending repos. GitHub API rate limit may have been reached. Try again later.
          </CardContent>
        </Card>
      ) : trendingRepos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <TrendingUp className="mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No trending repos found</h3>
            <p className="mt-1 text-sm text-muted-foreground">Try a different topic or time period.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {trendingRepos.map((repo) => {
            const isSaved = starredRepoUrls instanceof Set && starredRepoUrls.has(repo.url);
            return (
              <Card key={repo.github_id} className="group flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    {repo.owner_avatar && (
                      <img
                        src={repo.owner_avatar}
                        alt=""
                        className="h-8 w-8 rounded-md"
                        loading="lazy"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-mono leading-tight truncate">
                        {repo.name}
                      </CardTitle>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <Star className="h-3 w-3" /> {repo.stars.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <GitFork className="h-3 w-3" /> {repo.forks.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between space-y-3">
                  {repo.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{repo.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {repo.language && (
                      <Badge variant="secondary" className="text-xs">{repo.language}</Badge>
                    )}
                    {repo.topics.slice(0, 3).map((t) => (
                      <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      variant={isSaved ? "secondary" : "default"}
                      className="flex-1 text-xs"
                      disabled={isSaved || saveRepo.isPending}
                      onClick={() =>
                        saveRepo.mutate({
                          name: repo.name,
                          remoteUrl: repo.url,
                          description: repo.description || undefined,
                          language: repo.language || undefined,
                          topics: repo.topics,
                        })
                      }
                    >
                      <Star className={`mr-1 h-3 w-3 ${isSaved ? "fill-warning text-warning" : ""}`} />
                      {isSaved ? "Saved" : "Save"}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs" asChild>
                      <a href={repo.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {trendingData?.total_count > 0 && (
        <p className="text-xs text-center text-muted-foreground">
          Showing {trendingRepos.length} of {trendingData.total_count.toLocaleString()} results
        </p>
      )}
    </div>
  );
}
