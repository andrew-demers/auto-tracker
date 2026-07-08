"use client";

import { useTransition } from "react";
import { CloudUpload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { runBackupNow } from "@/actions/backup";

export function BackupNowButton({ disabled }: { disabled?: boolean }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await runBackupNow();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Backup completed successfully.");
    });
  }

  return (
    <Button type="button" variant="outline" onClick={handleClick} disabled={disabled || isPending}>
      <CloudUpload className="size-4" />
      {isPending ? "Backing up..." : "Back up now"}
    </Button>
  );
}
