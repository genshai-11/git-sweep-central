import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitBranch, HardDrive, AlertTriangle, Trash2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function Dashboard() {
  const { data: repos = [] } = useQuery({
    queryKey: ["repositories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("repositories").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: recentLogs = [] } = useQuery({
    queryKey: ["recent-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("action_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const totalRepos = repos.length;
  const totalSize = repos.reduce((sum, r) => sum + (r.size_bytes || 0), 0);
  const unsyncedCount = repos.filter((r) => r.sync_status !== "synced").length;
  const deletedCount = repos.filter((r) => !r.exists_locally).length;

  const syncData = [
    { name: "Synced", value: repos.filter((r) => r.sync_status === "synced").length, color: "hsl(var(--chart-synced))" },
    { name: "Behind", value: repos.filter((r) => r.sync_status === "behind").length, color: "hsl(var(--chart-behind))" },
    { name: "Dirty", value: repos.filter((r) => r.sync_status === "dirty").length, color: "hsl(var(--chart-dirty))" },
    { name: "Unknown", value: repos.filter((r) => r.sync_status === "unknown").length, color: "hsl(var(--chart-unknown))" },
  ].filter((d) => d.value > 0);

  const accountData = repos.reduce((acc, r) => {
    const key = r.account || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const accountChartData = Object.entries(accountData).map(([name, value]) => ({ name, value }));

  const stats = [
    { label: "Total Repos", value: totalRepos, icon: GitBranch, color: "text-primary" },
    { label: "Total Size", value: formatBytes(totalSize), icon: HardDrive, color: "text-accent" },
    { label: "Unsynced", value: unsyncedCount, icon: AlertTriangle, color: "text-warning" },
    { label: "Deleted Local", value: deletedCount, icon: Trash2, color: "text-destructive" },
  ];

  const dirtyRepos = repos.filter((r) => r.sync_status === "dirty");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your repository landscape</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`rounded-lg bg-muted p-2.5 ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sync Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[220px]">
            {syncData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={syncData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {syncData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data yet</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Repos by Account</CardTitle>
          </CardHeader>
          <CardContent className="h-[220px]">
            {accountChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={accountChartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Warnings */}
      {dirtyRepos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Uncommitted Changes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dirtyRepos.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <span className="font-mono text-sm font-medium">{r.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{r.local_path}</span>
                  </div>
                  <Badge variant="destructive" className="text-xs">dirty</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {totalRepos === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <GitBranch className="mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No repositories yet</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm">
              Run <code className="font-mono text-primary">git-sweepher scan</code> from your CLI to start populating the dashboard.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
