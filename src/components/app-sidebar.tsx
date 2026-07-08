"use client";

import * as React from "react";
import Link from "next/link";
import { Car, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SidebarNav } from "@/components/sidebar-nav";

const COLLAPSED_STORAGE_KEY = "auto-tracker:sidebar-collapsed";

export function AppSidebar() {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    // Read the persisted preference after mount only - localStorage isn't
    // available during SSR, and reading it eagerly would cause a hydration
    // mismatch (same "mounted" guard pattern as ThemeToggle).
    const stored = window.localStorage.getItem(COLLAPSED_STORAGE_KEY);
    if (stored === "true") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(true);
    }
    setMounted(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex",
        collapsed ? "w-16" : "w-64",
        mounted && "transition-[width] duration-200"
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center gap-2 border-b px-6",
          collapsed && "justify-center px-0"
        )}
      >
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Car className="size-4" />
          </span>
          {!collapsed && <span>Auto Tracker</span>}
        </Link>
      </div>
      <SidebarNav collapsed={collapsed} />
      <div
        className={cn(
          "border-t p-2",
          collapsed && "flex justify-center"
        )}
      >
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className={cn(collapsed ? "size-8 justify-center p-0" : "w-full justify-start gap-2")}
                onClick={toggleCollapsed}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              />
            }
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <>
                <PanelLeftClose className="size-4" />
                Collapse
              </>
            )}
          </TooltipTrigger>
          <TooltipContent side="right">
            {collapsed ? "Expand sidebar" : "Collapse sidebar"}
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
