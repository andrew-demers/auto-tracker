"use server";

import { requireUser } from "@/lib/auth-guards";
import { isSmtpConfigured, sendTestEmail } from "@/lib/mail";

export async function sendTestEmailAction(): Promise<{ error?: string }> {
  const user = await requireUser();

  if (!isSmtpConfigured()) {
    return { error: "SMTP is not configured." };
  }

  try {
    await sendTestEmail(user.email);
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to send test email.",
    };
  }
}
