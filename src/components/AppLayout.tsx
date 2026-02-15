import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";

export function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      {/* pt-14 on mobile for top bar, md:pt-0 + md:ml-60 for desktop sidebar */}
      <main className="flex-1 pt-14 px-4 pb-6 md:pt-6 md:px-6 md:ml-60">
        <Outlet />
      </main>
    </div>
  );
}
