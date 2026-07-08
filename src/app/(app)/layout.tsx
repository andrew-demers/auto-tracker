import { requireUser } from "@/lib/auth-guards";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { UserNav } from "@/components/user-nav";
import { QuickFuelUpButton } from "@/components/fuel-ups/quick-fuel-up-button";
import { getVehicleOptions } from "@/actions/vehicles";
import { getLastActiveVehicleId } from "@/lib/last-active-vehicle";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const [vehicles, lastActiveVehicleId] = await Promise.all([
    getVehicleOptions(),
    getLastActiveVehicleId(user.id),
  ]);

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background px-4 lg:px-8">
          <div className="flex items-center gap-2">
            <MobileNav />
          </div>
          <div className="flex items-center gap-2">
            <QuickFuelUpButton vehicles={vehicles} defaultVehicleId={lastActiveVehicleId} />
            <UserNav user={user} />
          </div>
        </header>
        <main className="flex-1 bg-muted/30 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
