import Link from "next/link";
import { Car } from "lucide-react";
import { SidebarNav } from "@/components/sidebar-nav";

export function AppSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Car className="size-4" />
          </span>
          <span>Auto Tracker</span>
        </Link>
      </div>
      <SidebarNav />
      <div className="border-t p-4 text-xs text-muted-foreground">
        Auto Tracker &middot; self-hosted
      </div>
    </aside>
  );
}
