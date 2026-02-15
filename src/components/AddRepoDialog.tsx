import { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star, Plus, Loader2, Search, GitFork, ExternalLink, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SearchRepo {
  github_id: number;
  name: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  language: string | null;
  topics: string[];
  owner_avatar: string | null;
}

interface AddRepoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  savedRepoUrls: Set<string>;
}

export function AddRepoDialog({ open, onOpenChange, savedRepoUrls }: AddRepoDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchRepo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<SearchRepo | null>(null);
  const [personalNotes, setPersonalNotes] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-repos?q=${encodeURIComponent(searchQuery.trim())}&per_page=10`;
        const res = await fetch(url, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.repos || []);
        }
      } catch {
        // ignore
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const saveRepo = useMutation({
    mutationFn: async (repo: SearchRepo) => {
      const { data: repoData, error: repoErr } = await supabase
        .from("repositories")
        .insert({
          user_id: user!.id,
          name: repo.name,
          remote_url: repo.url,
          sync_status: "unknown" as const,
          exists_locally: false,
        })
        .select()
        .single();
      if (repoErr) throw repoErr;

      const { error: starErr } = await supabase.from("starred_repos").insert({
        user_id: user!.id,
        repo_id: repoData.id,
        description: repo.description || null,
        language: repo.language || null,
        tags: repo.topics || [],
        personal_notes: personalNotes || null,
      });
      if (starErr) throw starErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["starred-repo-urls"] });
      queryClient.invalidateQueries({ queryKey: ["starred-repos"] });
      queryClient.invalidateQueries({ queryKey: ["starred-repo-ids"] });
      queryClient.invalidateQueries({ queryKey: ["repositories"] });
      toast({ title: "Saved to Stars Gallery!" });
      handleReset();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleReset = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedRepo(null);
    setPersonalNotes("");
  }, []);

  const handleClose = (val: boolean) => {
    if (!val) handleReset();
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2">
            {selectedRepo && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedRepo(null)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {selectedRepo ? "Save Repo" : "Find a Repo"}
          </DialogTitle>
        </DialogHeader>

        {!selectedRepo ? (
          <div className="flex flex-col flex-1 min-h-0 px-5 pb-5">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search repos or paste a GitHub URL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>

            {/* Results */}
            <ScrollArea className="flex-1 mt-3 -mx-1">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-1 px-1">
                  {searchResults.map((repo) => {
                    const isSaved = savedRepoUrls.has(repo.url);
                    return (
                      <button
                        key={repo.github_id}
                        className="w-full text-left rounded-lg border border-transparent p-3 transition-colors hover:bg-accent hover:border-border disabled:opacity-50"
                        disabled={isSaved}
                        onClick={() => setSelectedRepo(repo)}
                      >
                        <div className="flex items-start gap-3">
                          {repo.owner_avatar && (
                            <img src={repo.owner_avatar} alt="" className="h-8 w-8 rounded-md flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono font-medium truncate">{repo.name}</span>
                              {isSaved && <Badge variant="secondary" className="text-[10px] shrink-0">Saved</Badge>}
                            </div>
                            {repo.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{repo.description}</p>
                            )}
                            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-0.5">
                                <Star className="h-3 w-3" /> {repo.stars.toLocaleString()}
                              </span>
                              <span className="flex items-center gap-0.5">
                                <GitFork className="h-3 w-3" /> {repo.forks.toLocaleString()}
                              </span>
                              {repo.language && <Badge variant="outline" className="text-[10px] py-0">{repo.language}</Badge>}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : searchQuery.trim().length >= 2 && !isSearching ? (
                <p className="text-center text-sm text-muted-foreground py-8">No repos found. Try a different search.</p>
              ) : (
                <div className="text-center py-8 space-y-1">
                  <Search className="mx-auto h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Search by name or paste a GitHub URL</p>
                </div>
              )}
            </ScrollArea>
          </div>
        ) : (
          /* Selected repo detail / save form */
          <div className="px-5 pb-5 space-y-4">
            <div className="flex items-start gap-3 rounded-lg border p-3 bg-muted/30">
              {selectedRepo.owner_avatar && (
                <img src={selectedRepo.owner_avatar} alt="" className="h-10 w-10 rounded-md" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono font-semibold truncate">{selectedRepo.name}</p>
                {selectedRepo.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{selectedRepo.description}</p>
                )}
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Star className="h-3 w-3" /> {selectedRepo.stars.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <GitFork className="h-3 w-3" /> {selectedRepo.forks.toLocaleString()}
                  </span>
                  {selectedRepo.language && <Badge variant="secondary" className="text-[10px]">{selectedRepo.language}</Badge>}
                  <a href={selectedRepo.url} target="_blank" rel="noopener noreferrer" className="ml-auto hover:text-foreground">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>

            {selectedRepo.topics.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedRepo.topics.slice(0, 8).map((t) => (
                  <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs">Personal Notes (optional)</Label>
              <Textarea
                placeholder="Why is this repo awesome? Your notes..."
                value={personalNotes}
                onChange={(e) => setPersonalNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button
              onClick={() => saveRepo.mutate(selectedRepo)}
              disabled={saveRepo.isPending}
              className="w-full"
            >
              {saveRepo.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Star className="mr-2 h-4 w-4" />}
              Save to Stars
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
