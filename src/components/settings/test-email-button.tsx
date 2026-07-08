"use client";

import { useTransition } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { sendTestEmailAction } from "@/actions/notifications";

export function TestEmailButton({ disabled }: { disabled?: boolean }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await sendTestEmailAction();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Test email sent - check your inbox.");
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={disabled || isPending}
    >
      <Send className="size-4" />
      {isPending ? "Sending..." : "Send test email"}
    </Button>
  );
}
