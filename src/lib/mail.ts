import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

// Nodemailer transport built from SMTP_* env vars. Returns null (no-op) if
// SMTP isn't configured, so callers can skip sending rather than crash.

export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

let cachedTransport: Transporter | null | undefined;

export function getMailTransport(): Transporter | null {
  if (!isSmtpConfigured()) return null;
  if (cachedTransport !== undefined) return cachedTransport;

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  cachedTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: user ? { user, pass } : undefined,
  });

  return cachedTransport;
}

export interface MaintenanceEmailUser {
  email: string;
  name?: string | null;
}

export interface MaintenanceEmailItem {
  title: string;
  vehicleId: string;
  vehicleName: string;
  status: "DUE_SOON" | "OVERDUE";
  dueAtOdometer: number | null;
  dueAtDate: Date | null;
}

function getAppUrl(): string {
  return process.env.APP_URL || "http://localhost:3000";
}

function formatDue(item: MaintenanceEmailItem): string {
  const parts: string[] = [];
  if (item.dueAtOdometer != null) {
    parts.push(`${Math.round(item.dueAtOdometer).toLocaleString()} mi`);
  }
  if (item.dueAtDate != null) {
    parts.push(item.dueAtDate.toLocaleDateString("en-US"));
  }
  return parts.length > 0 ? parts.join(" or ") : "-";
}

export async function sendMaintenanceEmail(
  user: MaintenanceEmailUser,
  items: MaintenanceEmailItem[]
): Promise<void> {
  const transport = getMailTransport();
  if (!transport || items.length === 0) return;

  const appUrl = getAppUrl();
  const rows = items
    .map((item) => {
      const statusLabel = item.status === "OVERDUE" ? "Overdue" : "Due soon";
      const statusColor = item.status === "OVERDUE" ? "#dc2626" : "#d97706";
      const link = `${appUrl}/vehicles/${item.vehicleId}?tab=maintenance`;
      return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:${statusColor};font-weight:600;">${statusLabel}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${item.title}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${item.vehicleName}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${formatDue(item)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;"><a href="${link}">View</a></td>
        </tr>`;
    })
    .join("");

  const html = `
    <div style="font-family:sans-serif;color:#111827;">
      <h2 style="margin-bottom:4px;">Auto Tracker: maintenance reminders</h2>
      <p style="color:#6b7280;margin-top:0;">
        The following maintenance items need attention.
      </p>
      <table style="border-collapse:collapse;width:100%;max-width:640px;">
        <thead>
          <tr style="text-align:left;">
            <th style="padding:8px 12px;border-bottom:2px solid #111827;">Status</th>
            <th style="padding:8px 12px;border-bottom:2px solid #111827;">Item</th>
            <th style="padding:8px 12px;border-bottom:2px solid #111827;">Vehicle</th>
            <th style="padding:8px 12px;border-bottom:2px solid #111827;">Due</th>
            <th style="padding:8px 12px;border-bottom:2px solid #111827;"></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#6b7280;margin-top:24px;font-size:12px;">
        You're receiving this because email notifications are enabled on your
        Auto Tracker account. You can turn them off in Settings.
      </p>
    </div>`;

  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: user.email,
    subject: `Auto Tracker: ${items.length} maintenance item${items.length === 1 ? "" : "s"} need${items.length === 1 ? "s" : ""} attention`,
    html,
  });
}

export async function sendTestEmail(to: string): Promise<void> {
  const transport = getMailTransport();
  if (!transport) {
    throw new Error("SMTP is not configured.");
  }

  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: "Auto Tracker: test email",
    html: `
      <div style="font-family:sans-serif;color:#111827;">
        <p>This is a test email from Auto Tracker.</p>
        <p>If you received this, your SMTP configuration is working correctly.</p>
      </div>`,
  });
}
