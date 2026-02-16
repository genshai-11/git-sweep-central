import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Star, Trash2, ExternalLink, StickyNote, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AddRepoDialog, REPO_CATEGORIES } from "@/components/AddRepoDialog";

export default function Stars() {
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: starred = [] } = useQuery({
    queryKey: ["starred-repos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("starred_repos")
        .select("*, repositories(name, remote_url, account, category, tags)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: savedRepoUrls = new Set<string>() } = useQuery({
    queryKey: ["starred-repo-urls"],
    queryFn: async () => {
      const { data, error } = await supabase.from("repositories").select("remote_url");
      if (error) throw error;
      return new Set(data.map((r) => r.remote_url).filter(Boolean) as string[]);
    },
  });

  const removeStar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("starred_repos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["starred-repos"] });
      queryClient.invalidateQueries({ queryKey: ["starred-repo-ids"] });
      toast({ title: "Removed from stars" });
    },
  });

  // Collect all unique tags
  const allTags = [...new Set(starred.flatMap((s) => s.tags || []))].sort();

  const filtered = starred.filter((s) => {
    const repo = s.repositories as any;
    const name = repo?.name || "";
    if (search && !name.toLowerCase().includes(search.toLowerCase()) && !(s.description || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (tagFilter !== "all" && !(s.tags || []).includes(tagFilter)) return false;
    if (categoryFilter !== "all" && repo?.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stars Gallery</h1>
          <p className="text-sm text-muted-foreground">{starred.length} starred repos</p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Repo
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search starred repos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {REPO_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {allTags.length > 0 && (
          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {allTags.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Star className="mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No starred repos</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm">
              Star repos from the Repositories page or add new ones.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => {
            const repo = s.repositories as any;
            return (
              <Card key={s.id} className="group relative">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base font-mono">{repo?.name || "Unknown"}</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeStar.mutate(s.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    {repo?.account && <span className="text-xs text-muted-foreground">{repo.account}</span>}
                    {repo?.category && repo.category !== "uncategorized" && (
                      <Badge variant="secondary" className="text-[10px] capitalize">{repo.category}</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
                  <div className="flex flex-wrap gap-1.5">
                    {s.language && <Badge variant="secondary" className="text-xs">{s.language}</Badge>}
                    {(s.tags || []).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                  {s.personal_notes && (
                    <div className="flex items-start gap-1.5 rounded-md bg-muted p-2">
                      <StickyNote className="mt-0.5 h-3 w-3 text-muted-foreground shrink-0" />
                      <p className="text-xs text-muted-foreground">{s.personal_notes}</p>
                    </div>
                  )}
                  {repo?.remote_url && (
                    <a href={repo.remote_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <ExternalLink className="h-3 w-3" /> View on GitHub
                    </a>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AddRepoDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} savedRepoUrls={savedRepoUrls} />
    </div>
  );
}
