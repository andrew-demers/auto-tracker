import { requireUser } from "@/lib/auth-guards";
import { getVehicles } from "@/actions/vehicles";
import { ImportUploadForm } from "@/components/import/import-upload-form";

export default async function ImportPage() {
  await requireUser();
  const vehicles = await getVehicles();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-[28px] font-semibold tracking-[-0.6px]">Import CSV</h1>
        <p className="text-sm text-muted-foreground">
          Bring in fuel logs or expenses from a spreadsheet or another app.
        </p>
      </div>
      <ImportUploadForm vehicles={vehicles.map((v) => ({ id: v.id, name: v.name }))} />
    </div>
  );
}
