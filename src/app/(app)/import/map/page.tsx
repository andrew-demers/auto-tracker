import { requireUser } from "@/lib/auth-guards";
import { ImportMapWizard } from "@/components/import/import-map-wizard";

export default async function ImportMapPage() {
  await requireUser();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-[28px] font-semibold tracking-[-0.6px]">Map columns</h1>
        <p className="text-sm text-muted-foreground">
          Match your CSV columns to Auto Tracker fields, then review the preview below.
        </p>
      </div>
      <ImportMapWizard />
    </div>
  );
}
