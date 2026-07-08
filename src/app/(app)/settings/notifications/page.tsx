import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TestEmailButton } from "@/components/settings/test-email-button";
import { isSmtpConfigured } from "@/lib/mail";

export default function NotificationsSettingsPage() {
  const smtpConfigured = isSmtpConfigured();
  const notificationsEnabled = process.env.NOTIFICATIONS_ENABLED === "true";

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Email notifications</CardTitle>
          <CardDescription>
            Maintenance due/overdue reminders are emailed daily to every user
            with notifications enabled (see your Profile page).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium">SMTP server</p>
              <p className="text-xs text-muted-foreground break-words">
                Configured via SMTP_HOST/SMTP_PORT/SMTP_USER/etc. environment
                variables.
              </p>
            </div>
            <Badge
              variant={smtpConfigured ? "secondary" : "outline"}
              className="self-start sm:self-auto"
            >
              {smtpConfigured ? "Configured" : "Not configured"}
            </Badge>
          </div>
          <div className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium">Daily reminder job</p>
              <p className="text-xs text-muted-foreground break-words">
                Controlled via the NOTIFICATIONS_ENABLED environment variable.
              </p>
            </div>
            <Badge
              variant={notificationsEnabled ? "secondary" : "outline"}
              className="self-start sm:self-auto"
            >
              {notificationsEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <div>
            <TestEmailButton disabled={!smtpConfigured} />
            {!smtpConfigured ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Set SMTP_HOST and SMTP_FROM to enable sending email.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
