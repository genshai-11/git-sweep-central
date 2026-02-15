import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitBranch, Trash2, Search as SearchIcon, Star, Upload, Copy, History } from "lucide-react";
import { format } from "date-fns";

const actionIcons: Record<string, any> = {
  push: Upload,
  delete_local: Trash2,
  scan: SearchIcon,
  star: Star,
  unstar: Star,
  clone: Copy,
};

const actionColors: Record<string, string> = {
  push: "text-primary",
  delete_local: "text-destructive",
  scan: "text-accent",
  star: "text-warning",
  unstar: "text-muted-foreground",
  clone: "text-primary",
};

export default function HistoryPage() {
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: logs = [] } = useQuery({
    queryKey: ["action-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("action_logs")
        .select("*, repositories(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const filtered = typeFilter === "all" ? logs : logs.filter((l) => l.action_type === typeFilter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Action History</h1>
        <p className="text-sm text-muted-foreground">Timeline of CLI operations</p>
      </div>

      <Select value={typeFilter} onValueChange={setTypeFilter}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Actions</SelectItem>
          <SelectItem value="push">Push</SelectItem>
          <SelectItem value="delete_local">Delete</SelectItem>
          <SelectItem value="scan">Scan</SelectItem>
          <SelectItem value="star">Star</SelectItem>
          <SelectItem value="clone">Clone</SelectItem>
        </SelectContent>
      </Select>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <History className="mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No actions yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Actions from the CLI will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
          <div className="space-y-4">
            {filtered.map((log) => {
              const Icon = actionIcons[log.action_type] || GitBranch;
              const repo = log.repositories as any;
              return (
                <div key={log.id} className="relative flex items-start gap-4 pl-10">
                  <div className={`absolute left-3 top-2 rounded-full bg-background border-2 border-border p-1 ${actionColors[log.action_type] || ""}`}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <Card className="flex-1">
                    <CardContent className="flex items-center justify-between p-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-mono">{log.action_type}</Badge>
                          {repo?.name && (
                            <span className="font-mono text-sm">{repo.name}</span>
                          )}
                        </div>
                        {log.details && <p className="text-xs text-muted-foreground">{log.details}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          className={`text-xs ${log.result === "success" ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}`}
                        >
                          {log.result}
                        </Badge>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.created_at), "MMM d, HH:mm")}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
