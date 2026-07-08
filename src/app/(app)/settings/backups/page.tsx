import { Cloud, CloudOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Forbidden } from "@/components/settings/forbidden";
import { BackupNowButton } from "@/components/settings/backup-now-button";
import { DisconnectDriveButton } from "@/components/settings/disconnect-drive-button";
import { BackupRecordsTable } from "@/components/settings/backup-records-table";
import { requireUser } from "@/lib/auth-guards";
import { getBackupSettingsData } from "@/actions/backup";
import { isGoogleOAuthConfigured } from "@/lib/google-oauth";

export default async function BackupsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    return <Forbidden />;
  }

  const { error } = await searchParams;
  const data = await getBackupSettingsData();
  const oauthConfigured = isGoogleOAuthConfigured();
  const retentionCount = Number(process.env.BACKUP_RETENTION_COUNT) || 14;

  return (
    <div className="grid gap-6">
      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Google Drive connection</CardTitle>
          <CardDescription>
            Daily backups of the database and uploaded receipts are zipped and uploaded to a
            dedicated Auto Tracker Backups folder in the connected account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-muted">
                {data.connected ? (
                  <Cloud className="size-4 text-muted-foreground" />
                ) : (
                  <CloudOff className="size-4 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">{data.connected ? data.email : "Not connected"}</p>
                <p className="text-xs text-muted-foreground">
                  {data.connected
                    ? "Connected for daily automatic backups."
                    : oauthConfigured
                      ? "Connect a Google account to enable cloud backups."
                      : "Set GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET to enable this feature."}
                </p>
              </div>
            </div>
            {data.connected ? (
              <DisconnectDriveButton />
            ) : oauthConfigured ? (
              <Button render={<a href="/api/backup/google/start" />} nativeButton={false}>
                Connect Google Drive
              </Button>
            ) : (
              <Button disabled>Connect Google Drive</Button>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Retention</p>
              <p className="text-xs text-muted-foreground">
                Set via the BACKUP_RETENTION_COUNT environment variable.
              </p>
            </div>
            <Badge variant="secondary">{retentionCount} backups</Badge>
          </div>

          <div>
            <BackupNowButton disabled={!data.connected} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent backups</CardTitle>
        </CardHeader>
        <CardContent>
          <BackupRecordsTable records={data.records} />
        </CardContent>
      </Card>
    </div>
  );
}
