import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Star, Trash2, ExternalLink, StickyNote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Stars() {
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: starred = [] } = useQuery({
    queryKey: ["starred-repos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("starred_repos")
        .select("*, repositories(name, remote_url, account)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const removeStar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("starred_repos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["starred-repos"] });
      toast({ title: "Removed from stars" });
    },
  });

  const filtered = starred.filter((s) => {
    const name = (s.repositories as any)?.name || "";
    if (search && !name.toLowerCase().includes(search.toLowerCase()) && !(s.description || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Stars Gallery</h1>
        <p className="text-sm text-muted-foreground">{starred.length} starred repos</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search starred repos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Star className="mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No starred repos</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm">
              Star interesting repos from the CLI to build your collection.
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
                  {repo?.account && (
                    <span className="text-xs text-muted-foreground">{repo.account}</span>
                  )}
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
                    <a
                      href={repo.remote_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View on GitHub
                    </a>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
