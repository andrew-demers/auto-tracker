"use client";

import { useState, useTransition } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
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
import { resetUserPassword } from "@/actions/users";

export function ResetPasswordButton({
  userId,
  userEmail,
}: {
  userId: string;
  userEmail: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setTemporaryPassword(null);
      setCopied(false);
    }
  }

  function handleReset() {
    startTransition(async () => {
      const result = await resetUserPassword(userId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      if (result?.temporaryPassword) {
        setTemporaryPassword(result.temporaryPassword);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Reset password" />
        }
      >
        <KeyRound className="size-4" />
      </DialogTrigger>
      <DialogContent>
        {temporaryPassword ? (
          <>
            <DialogHeader>
              <DialogTitle>Password reset</DialogTitle>
              <DialogDescription>
                Share this new temporary password with {userEmail} - it won&apos;t
                be shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-lg border bg-muted px-3 py-2 font-mono text-sm">
              <span className="flex-1 truncate">{temporaryPassword}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  navigator.clipboard.writeText(temporaryPassword);
                  setCopied(true);
                  toast.success("Copied to clipboard.");
                }}
              >
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Reset password for {userEmail}?</DialogTitle>
              <DialogDescription>
                This generates a new temporary password. The old password
                will stop working immediately.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleReset} disabled={isPending}>
                {isPending ? "Resetting..." : "Reset password"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
