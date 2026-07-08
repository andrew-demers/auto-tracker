// Next.js instrumentation hook - runs once when the server starts.
// Registers the daily maintenance-reminder email cron job and the daily
// Google Drive backup cron job. Guarded so it only runs in the Node.js
// runtime (not edge) and only registers once, even across dev hot-reloads.

let cronRegistered = false;

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (cronRegistered) return;
  cronRegistered = true;

  const [{ default: cron }, { checkAndNotify }, { runBackup }, { prisma }] = await Promise.all([
    import("node-cron"),
    import("@/lib/notifications"),
    import("@/lib/backup"),
    import("@/lib/prisma"),
  ]);

  // Daily at 8:00 AM server-local time.
  cron.schedule("0 8 * * *", () => {
    checkAndNotify()
      .then((result) => {
        if (result.ran) {
          console.log(
            `[notifications] checkAndNotify: ${result.emailsSent} email(s) sent for ${result.itemsFlagged} newly-due item(s).`
          );
        } else {
          console.log(`[notifications] checkAndNotify skipped: ${result.reason}`);
        }
      })
      .catch((err) => {
        console.error("[notifications] checkAndNotify failed:", err);
      });
  });

  // Daily at 3:00 AM server-local time. Checked dynamically on every run
  // (rather than once at boot) so connecting Drive later doesn't require a
  // restart for backups to start happening.
  cron.schedule("0 3 * * *", async () => {
    try {
      const integration = await prisma.backupIntegration.findUnique({
        where: { id: "singleton" },
      });
      if (!integration?.googleRefreshTokenEnc) {
        console.log("[backup] Daily backup skipped: Google Drive is not connected.");
        return;
      }
      const result = await runBackup();
      if (result.ran) {
        console.log("[backup] Daily backup completed successfully.");
      } else {
        console.log(`[backup] Daily backup did not run: ${result.reason}`);
      }
    } catch (err) {
      console.error("[backup] Daily backup failed:", err);
    }
  });

  console.log("[notifications] Daily maintenance-reminder cron job registered (0 8 * * *).");
  console.log("[backup] Daily Google Drive backup cron job registered (0 3 * * *).");
}
