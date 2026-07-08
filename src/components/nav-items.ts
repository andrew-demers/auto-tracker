import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Car, Settings } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vehicles", label: "Vehicles", icon: Car },
  { href: "/settings/profile", label: "Settings", icon: Settings },
];
