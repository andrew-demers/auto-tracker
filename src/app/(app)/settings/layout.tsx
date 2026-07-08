import { requireUser } from "@/lib/auth-guards";
import { SettingsNav } from "@/components/settings/settings-nav";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  const items = [
    { href: "/settings/profile", label: "Profile" },
    { href: "/settings/notifications", label: "Notifications" },
  ];
  if (user.role === "ADMIN") {
    items.push({ href: "/settings/users", label: "Users" });
    items.push({ href: "/settings/backups", label: "Backups" });
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account{user.role === "ADMIN" ? " and users" : ""}.
        </p>
      </div>
      <SettingsNav items={items} />
      {children}
    </div>
  );
}
