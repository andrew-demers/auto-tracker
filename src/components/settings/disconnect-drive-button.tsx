"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { disconnectGoogleDrive } from "@/actions/backup";

export function DisconnectDriveButton() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDisconnect() {
    startTransition(async () => {
      const result = await disconnectGoogleDrive();
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Google Drive disconnected.");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Disconnect</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disconnect Google Drive?</DialogTitle>
          <DialogDescription>
            This revokes Auto Tracker&apos;s access and stops the daily automatic backup. Existing
            backup files already in Drive are not deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDisconnect} disabled={isPending}>
            {isPending ? "Disconnecting..." : "Disconnect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
