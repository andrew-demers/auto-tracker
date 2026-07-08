# Auto Tracker

A self-hosted, multi-user vehicle mileage/fuel/maintenance tracking web app (imperial units + USD only). Built with Next.js (App Router), Prisma + SQLite, and Auth.js. Inspired by [May](https://github.com/dannymcc/may) and Fuelio.

Everyone who logs in shares one fleet - there's no per-vehicle ownership or privacy. It's designed for a household or small group tracking a shared set of vehicles, not a multi-tenant SaaS.

## Features

- **Vehicles** - track make/model/year, fuel type, tank capacity, photo, and notes for any number of vehicles.
- **Fuel-ups** - log odometer, gallons, price/gallon, total cost, full-vs-partial tank, station, and notes. MPG is computed automatically across full-tank fill-ups.
- **Expenses** - track maintenance, repairs, insurance, registration, parking/tolls, accessories, and other costs, each optionally tied to an odometer reading.
- **Maintenance reminders** - interval-based (miles and/or months) reminders with OK / Due soon / Overdue status, and a one-click "mark completed" flow that can also log a linked expense.
- **Receipt attachments** - attach photos (JPEG/PNG/WEBP/HEIC) or PDFs to any fuel-up or expense.
- **Email notifications** - a daily digest email to any user with notifications enabled when a maintenance item becomes due soon or overdue.
- **CSV import** - bring in fuel logs or expenses from another app or spreadsheet via a 3-step upload -> map columns -> execute wizard.
- **Google Drive backup** - a daily encrypted-at-rest, automatic backup of the database and uploaded receipts to a dedicated Drive folder, with configurable retention.
- **Dashboard & charts** - fleet-wide spend/MPG/reminders at a glance, plus per-vehicle cost-over-time and MPG-trend charts.
- **Multi-user** - admin and regular user roles; admins manage users and backups, everyone else shares the same data.
- **Dark/light mode.**

## Quick start (Docker)

```bash
git clone <this repo>
cd auto-tracker
cp .env.example .env
# edit .env - at minimum, set AUTH_SECRET (openssl rand -base64 32)
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000) and check the container logs for the first admin's credentials:

```bash
docker compose logs app | grep -A4 "first admin account"
```

Sign in with those credentials, then change the password from **Settings > Profile**. See [First login](#first-login) below for details.

> **Building behind a corporate/TLS-inspecting proxy?** If `docker compose up -d` (or `docker build`) fails with `apk`/`npm` errors like `TLS: server certificate not trusted`, see [`certs/README.md`](./certs) - drop your organization's root CA `.crt`/`.pem` file in `certs/` and rebuild.

## Quick start (local dev, no Docker)

```bash
npm install
npx prisma migrate dev   # applies migrations and seeds the first admin user
npm run dev
```

Copy `.env.example` to `.env` first and fill in values for your setup (SQLite defaults to `file:./dev.db` locally, no Docker required).

## First login

On first startup with an empty database, the seed script creates one `ADMIN` user:

- If `ADMIN_EMAIL`/`ADMIN_PASSWORD` are set in `.env`, those are used.
- Otherwise it defaults to `admin@localhost` with a randomly generated password, printed once to the container/console logs in a banner like:

```
========================================
  Auto Tracker - first admin account created

  Email:    admin@localhost
  Password: <randomly generated>

  This password was randomly generated - save it now.
  Sign in and change this password from Settings > Profile.
========================================
```

This only runs once - if any users already exist, the seed step is a no-op. Change the password (and email, if you used the default) from **Settings > Profile** right away.

## Adding more users (admin)

As an admin, go to **Settings > Users > Add user**. Provide an email and name; you can set a temporary password or let the app generate one (shown once - copy it before closing the dialog). New users see the same shared fleet immediately. Admins can also change a user's role, toggle their notification preference, reset their password, or remove them (you can't remove or demote the last remaining admin).

## CSV import

From the sidebar, choose **Import CSV**:

1. **Upload** - pick a data type (Fuel Logs or Expenses), the vehicle to import into, and a `.csv` file (max 5MB / ~20,000 rows).
2. **Map columns** - the app auto-suggests a mapping from your CSV headers (e.g. `mileage`/`miles`/`odo` all map to Odometer); adjust any dropdown, pick a date format (or leave it on Auto-detect), and review the preview of the first 10 rows. Required fields are marked with `*`.
3. **Execute** - valid rows are inserted in one transaction; invalid rows are skipped with a specific reason (e.g. "row 14: odometer is not a valid number") shown in the results summary.

Fuel log columns: date\*, odometer\*, gallons\*, price/gallon, total cost (at least one of the last two is required - the other is computed), full tank (defaults to yes if unmapped), station, notes. Expense columns: date\*, category\* (matched case-insensitively, falling back to "Other"), cost\*, odometer, vendor, notes. No unit conversion is performed - values are trusted as-is (miles/gallons/USD).

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `file:/data/auto-tracker.db` (Docker) / `file:./dev.db` (local) | SQLite connection string. |
| `AUTH_SECRET` | *(required)* | Signs/encrypts session JWTs and derives the key used to encrypt the stored Google Drive refresh token. Generate with `openssl rand -base64 32`. |
| `ADMIN_EMAIL` | `admin@localhost` | Email for the first seeded admin user. |
| `ADMIN_PASSWORD` | *(random, printed to logs)* | Password for the first seeded admin user. |
| `UPLOADS_DIR` | `/data/uploads` (Docker) / `./data/uploads` (local) | Directory where receipt attachments are stored. |
| `SMTP_HOST` | *(unset)* | SMTP server host. Leave unset to disable all email sending. |
| `SMTP_PORT` | `587` | SMTP server port. |
| `SMTP_SECURE` | `false` | Set `true` for implicit TLS (usually port 465). |
| `SMTP_USER` | *(unset)* | SMTP auth username, if required. |
| `SMTP_PASSWORD` | *(unset)* | SMTP auth password, if required. |
| `SMTP_FROM` | *(unset)* | "From" address for outgoing email. Required (along with `SMTP_HOST`) for email to be considered configured. |
| `NOTIFICATIONS_ENABLED` | `false` | Master switch for the daily maintenance-reminder email job. |
| `APP_URL` | `http://localhost:3000` | Absolute base URL used to build links in emails and the Google OAuth redirect URI. Set this to whatever URL you actually access the app at. |
| `GOOGLE_CLIENT_ID` | *(unset)* | OAuth client ID for Google Drive backup. |
| `GOOGLE_CLIENT_SECRET` | *(unset)* | OAuth client secret for Google Drive backup. |
| `BACKUP_RETENTION_COUNT` | `14` | Number of most-recent backup archives to keep in Drive; older ones are deleted after each successful backup. |
| `PUID` | `99` | (Docker only) User ID the container runs as after fixing up `/data` ownership - Unraid's `nobody` user. |
| `PGID` | `100` | (Docker only) Group ID the container runs as - Unraid's `users` group. |

### SMTP setup

Any standard SMTP provider works (Gmail with an app password, SendGrid, Mailgun, Postmark, a self-hosted Postfix, etc.). Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`/`SMTP_PASSWORD` if auth is required, and `SMTP_FROM`. Set `NOTIFICATIONS_ENABLED=true` to turn on the daily maintenance digest. You can verify your configuration any time from **Settings > Notifications > Send test email**.

### Google Drive backup setup

Cloud backup is optional and admin-only. To enable it:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a new project (or pick an existing one).
2. Under **APIs & Services > Library**, search for and enable the **Google Drive API**.
3. Under **APIs & Services > OAuth consent screen**, configure a consent screen (External is fine for personal use - it can stay in "Testing" mode, which only allows the Google accounts you explicitly add as test users to connect).
4. Under **APIs & Services > Credentials > Create Credentials > OAuth client ID**, choose **Web application**. Add an **Authorized redirect URI** of `<APP_URL>/api/backup/google/callback` - e.g. `https://auto-tracker.example.com/api/backup/google/callback`. This must exactly match the `APP_URL` you configure below.
5. Copy the generated **Client ID** and **Client secret** into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
6. Set `APP_URL` to the URL you actually use to reach the app (including scheme, no trailing slash) - it's used to build the OAuth redirect URI as well as links in emails.
7. Restart the app, then as an admin go to **Settings > Backups > Connect Google Drive** and complete the consent flow.

Once connected, a backup runs automatically every night at 3:00 AM server time, and you can trigger one manually any time with **Back up now**. Each backup zips a consistent snapshot of the SQLite database (via `VACUUM INTO`, so it never copies a live/partially-written file) together with the entire uploads directory, uploads it to an "Auto Tracker Backups" folder in the connected Drive account, and deletes the oldest backups beyond `BACKUP_RETENTION_COUNT`. The app only ever requests the `drive.file` scope, meaning it can only see/manage files it created itself - never your existing Drive contents.

### Manual backup restore

There's no restore UI (a self-hosted single-instance app has limited blast radius, and a scripted restore risks silently clobbering live data) - restoring is a deliberate manual procedure:

1. Download the backup `.zip` from the "Auto Tracker Backups" folder in Google Drive (or find it via **Settings > Backups > Open in Drive**).
2. Stop the container: `docker compose stop app`.
3. Extract the zip. It contains `auto-tracker.db` and an `uploads/` directory.
4. Replace the live database file and uploads directory in your `/data` volume with the extracted ones (e.g. for a named volume, `docker cp` into the volume's mountpoint or a temporary container; for a bind mount, copy directly onto the host path).
5. Start the container again: `docker compose start app`.

## Running on Unraid

Auto Tracker is a single container with all state under one `/data` path, which maps well to Unraid's Docker model:

- **Bind-mount** `/data` to `/mnt/user/appdata/auto-tracker` (via the Unraid UI's Docker template, or by replacing the `auto-tracker-data` named volume in `docker-compose.yml` with a bind mount) rather than using the default named volume.
- Prefer putting `/mnt/user/appdata/auto-tracker` on a **cache pool** share rather than the array - SQLite does frequent small writes and fsyncs, which the array's parity overhead handles poorly compared to a cache pool (SSD/NVMe).
- Set `PUID=99` and `PGID=100` (Unraid's `nobody:users`, which is also this image's default) so files written under the bind-mounted appdata path are owned by what Unraid expects, keeping them readable/writable from the Unraid UI and other tools.
- Set `APP_URL` to whatever URL you actually reverse-proxy the app behind (e.g. `https://auto-tracker.yourdomain.com` via Nginx Proxy Manager or SWAG) - it's used both for the Google OAuth redirect URI and for links in notification emails, so it needs to match what you (and Google) actually hit.

## Project documentation

- [`plans/`](./plans) - the original implementation plan for this project, including the full phase-by-phase spec and Prisma schema.
- [`AGENTS.md`](./AGENTS.md) / [`CLAUDE.md`](./CLAUDE.md) - instructions read by AI coding agents (Claude Code, etc.) working in this repo. `CLAUDE.md` just points to `AGENTS.md` so both tools share one source of truth.

## Learn more (Next.js)

- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)
