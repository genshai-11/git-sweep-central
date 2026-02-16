import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, ExternalLink, Star, Plus, RefreshCw, Terminal, Copy, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { AddRepoDialog, REPO_CATEGORIES } from "@/components/AddRepoDialog";

const statusColors: Record<string, string> = {
  synced: "bg-success text-success-foreground",
  behind: "bg-warning text-warning-foreground",
  dirty: "bg-destructive text-destructive-foreground",
  unknown: "bg-muted text-muted-foreground",
};

export default function Repos() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ["repositories"] });
    queryClient.invalidateQueries({ queryKey: ["starred-repo-ids"] });
    toast({ title: "Data refreshed" });
  };

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const syncCommands = [
    { label: "Scan all projects", cmd: "npx git-sweepher scan-all", desc: "Tự động tìm tất cả repos trong các thư mục phổ biến" },
    { label: "Scan thư mục cụ thể", cmd: "npx git-sweepher scan ~/Projects", desc: "Scan một thư mục cụ thể" },
    { label: "Scan toàn bộ Home", cmd: "npx git-sweepher scan ~/ -d 8", desc: "Scan toàn bộ thư mục home (chậm hơn)" },
  ];

  const { data: repos = [] } = useQuery({
    queryKey: ["repositories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("repositories").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: starredRepoIds = new Set<string>() } = useQuery({
    queryKey: ["starred-repo-ids"],
    queryFn: async () => {
      const { data, error } = await supabase.from("starred_repos").select("repo_id");
      if (error) throw error;
      return new Set(data.map((s) => s.repo_id));
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

  const toggleStar = useMutation({
    mutationFn: async ({ repoId, isStarred }: { repoId: string; isStarred: boolean }) => {
      if (isStarred) {
        const { error } = await supabase.from("starred_repos").delete().eq("repo_id", repoId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("starred_repos").insert({ repo_id: repoId, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: (_, { isStarred }) => {
      queryClient.invalidateQueries({ queryKey: ["starred-repo-ids"] });
      queryClient.invalidateQueries({ queryKey: ["starred-repos"] });
      toast({ title: isStarred ? "Removed from stars" : "Added to stars" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const accounts = [...new Set(repos.map((r) => r.account).filter(Boolean))];

  const filtered = repos.filter((r) => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && r.sync_status !== statusFilter) return false;
    if (accountFilter !== "all" && r.account !== accountFilter) return false;
    if (categoryFilter !== "all" && (r as any).category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Repositories</h1>
          <p className="text-sm text-muted-foreground">{repos.length} repos tracked</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { refreshData(); }}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button variant="secondary" onClick={() => setSyncDialogOpen(true)}>
            <Terminal className="mr-2 h-4 w-4" /> Sync from CLI
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Repo
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search repos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="synced">Synced</SelectItem>
            <SelectItem value="behind">Behind</SelectItem>
            <SelectItem value="dirty">Dirty</SelectItem>
            <SelectItem value="unknown">Unknown</SelectItem>
          </SelectContent>
        </Select>
        <Select value={accountFilter} onValueChange={setAccountFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Account" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Accounts</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a} value={a!}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead className="hidden md:table-cell">Local Path</TableHead>
              <TableHead className="hidden lg:table-cell">Account</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Last Scan</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Remote</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {repos.length === 0 ? "No repos found. Add one or run CLI scan." : "No matching repos."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((repo) => {
                const isStarred = starredRepoIds instanceof Set && starredRepoIds.has(repo.id);
                return (
                  <TableRow key={repo.id}>
                    <TableCell className="pr-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => toggleStar.mutate({ repoId: repo.id, isStarred })}
                        disabled={toggleStar.isPending}
                      >
                        <Star className={`h-4 w-4 ${isStarred ? "fill-warning text-warning" : "text-muted-foreground"}`} />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">{repo.name}</span>
                        {!repo.exists_locally && <Badge variant="outline" className="text-xs">deleted</Badge>}
                        {((repo as any).tags || []).length > 0 && (
                          <div className="hidden lg:flex gap-1">
                            {((repo as any).tags as string[]).slice(0, 2).map((t) => (
                              <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="secondary" className="text-xs capitalize">{(repo as any).category || "uncategorized"}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="font-mono text-xs text-muted-foreground">{repo.local_path || "—"}</span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-sm">{repo.account || "—"}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${statusColors[repo.sync_status] || ""}`}>{repo.sync_status}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {repo.last_scan ? formatDistanceToNow(new Date(repo.last_scan), { addSuffix: true }) : "—"}
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell">
                      {repo.remote_url && (
                        <a href={repo.remote_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-primary hover:underline">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AddRepoDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} savedRepoUrls={savedRepoUrls} />

      {/* Sync CLI Dialog */}
      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" /> Sync Repositories from CLI
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Chạy lệnh bên dưới trong terminal để scan và đồng bộ tất cả repos từ máy tính lên dashboard.
          </p>
          <div className="space-y-3 mt-2">
            {syncCommands.map(({ label, cmd, desc }) => (
              <div key={cmd} className="rounded-lg border p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{label}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => copyCommand(cmd)}
                  >
                    {copiedCmd === cmd ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <code className="block text-xs font-mono bg-muted rounded px-2 py-1.5 select-all">{cmd}</code>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
            <p><strong>Lần đầu?</strong> Chạy <code className="bg-muted px-1 rounded">npx git-sweepher login</code> trước để đăng nhập.</p>
            <p>Sau khi scan xong, nhấn <strong>Refresh</strong> để cập nhật dashboard.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
