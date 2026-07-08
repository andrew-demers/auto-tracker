import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Car, BarChart3, Settings } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vehicles", label: "Vehicles", icon: Car },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/settings/profile", label: "Settings", icon: Settings },
];
