import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Car, UploadCloud, Settings } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vehicles", label: "Vehicles", icon: Car },
  { href: "/import", label: "Import CSV", icon: UploadCloud },
  { href: "/settings/profile", label: "Settings", icon: Settings },
];
