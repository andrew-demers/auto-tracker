"use client";

import { cn } from "@/lib/utils";
import { navItems } from "@/components/nav-items";
import { NavLink } from "@/components/nav-link";

// Client Component so the navItems array (which holds Lucide icon
// *components*, i.e. functions) never has to cross the Server -> Client
// boundary as a prop - it's just a static import inside the client bundle.
export function SidebarNav({ collapsed }: { collapsed?: boolean }) {
  return (
    <nav
      className={cn(
        "flex flex-1 flex-col gap-1 p-4",
        collapsed && "items-center px-2"
      )}
    >
      {navItems.map((item) => (
        <NavLink key={item.href} item={item} collapsed={collapsed} />
      ))}
    </nav>
  );
}
