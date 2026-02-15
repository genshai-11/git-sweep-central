import { useState } from "react";
import { LayoutDashboard, GitBranch, Star, History, LogOut, TrendingUp, Menu, X } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/repos", icon: GitBranch, label: "Repositories" },
  { to: "/discover", icon: TrendingUp, label: "Discover" },
  { to: "/stars", icon: Star, label: "Stars Gallery" },
  { to: "/history", icon: History, label: "History" },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { signOut, user } = useAuth();

  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary">
          <GitBranch className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        <span className="font-mono text-sm font-bold text-sidebar-accent-foreground tracking-tight">
          Git-Sweepher
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
            onClick={onNavigate}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-3 py-3 space-y-2">
        <div className="flex items-center justify-between px-2">
          <span className="text-xs text-sidebar-foreground truncate max-w-[140px]">
            {user?.email}
          </span>
          <ThemeToggle />
        </div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </>
  );
}

export function AppSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu on route change
  const handleNavigate = () => setMobileOpen(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center gap-3 border-b border-sidebar-border bg-sidebar px-4 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="text-sidebar-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary">
            <GitBranch className="h-3.5 w-3.5 text-sidebar-primary-foreground" />
          </div>
          <span className="font-mono text-sm font-bold text-sidebar-accent-foreground">Git-Sweepher</span>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile slide-out sidebar */}
      <aside
        className={`fixed left-0 top-14 z-40 flex h-[calc(100vh-3.5rem)] w-64 flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-200 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent onNavigate={handleNavigate} />
      </aside>

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-60 flex-col bg-sidebar border-r border-sidebar-border md:flex">
        <SidebarContent />
      </aside>
    </>
  );
}
