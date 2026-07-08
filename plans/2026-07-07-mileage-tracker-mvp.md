# Plan: Self-hosted mileage/fuel tracking app (MVP)

## Goal
Build "Auto Tracker" - a self-hosted, multi-user vehicle mileage/fuel/maintenance tracking web app, inspired by [May](https://github.com/dannymcc/may) and Fuelio, scoped to imperial units + USD only. Modern, clean SaaS-dashboard look.

## Tech stack
- Next.js 14+ (App Router), TypeScript, React Server Components + Server Actions (no separate REST API layer needed for MVP)
- Tailwind CSS + shadcn/ui components, dark/light mode via `next-themes`
- Prisma ORM + SQLite (file db at `DATABASE_URL`, default `file:/data/auto-tracker.db` in Docker, `file:./dev.db` locally)
- Auth: multi-user, closed instance (no public sign-up). `next-auth` v5 (Auth.js) Credentials provider, email + password, bcrypt hash, JWT session in httpOnly cookie. Two roles - `ADMIN` (manages users, everything else identical) and `USER`. Every user sees and can edit every vehicle - one shared fleet, no per-vehicle ownership/privacy. Middleware protects all routes except `/login`; an additional role check guards `/settings/users`.
- Charts: `recharts`
- Notifications: `nodemailer` over SMTP, scheduled via a daily in-process check registered in `instrumentation.ts` (`node-cron`).
- File storage: local filesystem under the same `/data` volume (`/data/uploads`), served through an authenticated Next.js route handler.
- CSV import: `papaparse` for parsing (browser + server compatible), `date-fns` for date-format parsing, a 3-step upload → map columns → execute wizard mirroring May's flow.
- Cloud backup: `googleapis` (Drive API v3) with an admin-connected OAuth2 account (`drive.file` scope - the app only ever sees files it creates), `archiver` to zip the SQLite DB + uploads into a daily backup archive uploaded to a dedicated Drive folder, `node-cron` for scheduling (same mechanism as email notifications).
- Packaging: Dockerfile (multi-stage) + `docker-compose.yml`, named volume for the SQLite file + uploads. Entrypoint runs `prisma migrate deploy` then seeds the first admin user if none exists.

## Non-goals (explicitly out of scope)
Metric units, multi-currency, per-vehicle ownership/private vehicles (all users share one fleet), public self-registration, ntfy/pushover/webhook notifications (email only), PDF export/reports, i18n, DVLA/external integrations, Home Assistant integration, PWA/offline, calendar subscriptions, cloud storage as primary/live storage for attachments (local disk only - cloud is used solely for periodic backup archives), Dropbox/S3 backup targets (Google Drive only), backup restore UI (restore is a documented manual procedure for MVP - download the archive and swap files back in), CSV export, trips/charging-session import (fuel logs + expenses only), direct Fuelly/Fuelio account sync (CSV only).

## Data model (Prisma)

```prisma
enum UserRole {
  ADMIN
  USER
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  passwordHash  String
  role          UserRole  @default(USER)
  notifyEnabled Boolean   @default(true) // receive maintenance due/overdue emails
  createdAt     DateTime  @default(now())
}

enum FuelType {
  GASOLINE
  DIESEL
  HYBRID
  ELECTRIC
  OTHER
}

model Vehicle {
  id              String    @id @default(cuid())
  name            String
  make            String?
  model           String?
  year            Int?
  fuelType        FuelType  @default(GASOLINE)
  tankCapacity    Float?    // gallons
  photoUrl        String?
  notes           String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  fuelUps         FuelUp[]
  expenses        Expense[]
  maintenanceItems MaintenanceItem[]
}

model FuelUp {
  id             String   @id @default(cuid())
  vehicleId      String
  vehicle        Vehicle  @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  date           DateTime
  odometer       Float    // miles
  gallons        Float
  pricePerGallon Float
  totalCost      Float
  isFullTank     Boolean  @default(true)
  station        String?
  notes          String?
  createdAt      DateTime @default(now())

  @@index([vehicleId, date])
}

enum ExpenseCategory {
  MAINTENANCE
  REPAIR
  INSURANCE
  REGISTRATION
  PARKING_TOLLS
  ACCESSORIES
  OTHER
}

model Expense {
  id        String          @id @default(cuid())
  vehicleId String
  vehicle   Vehicle         @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  date      DateTime
  category  ExpenseCategory
  odometer  Float?
  cost      Float
  vendor    String?
  notes     String?
  createdAt DateTime        @default(now())

  @@index([vehicleId, date])
}

model MaintenanceItem {
  id                 String    @id @default(cuid())
  vehicleId          String
  vehicle            Vehicle   @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  title              String
  intervalMiles      Int?
  intervalMonths     Int?
  lastDoneDate       DateTime?
  lastDoneOdometer   Float?
  notes              String?
  notifyEnabled      Boolean   @default(true)
  lastNotifiedStatus String?   // "DUE_SOON" | "OVERDUE" | null - last status an email was sent for
  lastNotifiedAt     DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  @@index([vehicleId])
}

enum AttachmentOwnerType {
  FUEL_UP
  EXPENSE
}

model Attachment {
  id         String              @id @default(cuid())
  ownerType  AttachmentOwnerType
  fuelUpId   String?
  fuelUp     FuelUp?             @relation(fields: [fuelUpId], references: [id], onDelete: Cascade)
  expenseId  String?
  expense    Expense?            @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  filename   String              // original filename shown to the user
  storedPath String              // path relative to the uploads root
  mimeType   String
  sizeBytes  Int
  createdAt  DateTime            @default(now())

  @@index([fuelUpId])
  @@index([expenseId])
}

// Single-row table (id is always "singleton") holding the Google Drive connection.
model BackupIntegration {
  id                    String    @id @default("singleton")
  googleAccountEmail    String?
  googleRefreshTokenEnc String?   // AES-256-GCM encrypted, keyed from AUTH_SECRET
  driveFolderId         String?   // cached id of the "Auto Tracker Backups" folder
  connectedAt           DateTime?
  updatedAt             DateTime  @updatedAt
}

enum BackupStatus {
  SUCCESS
  FAILED
}

model BackupRecord {
  id           String       @id @default(cuid())
  status       BackupStatus
  sizeBytes    Int?
  driveFileId  String?
  errorMessage String?
  createdAt    DateTime     @default(now())
}
```

`FuelUp` and `Expense` each get an `attachments Attachment[]` back-relation.

Derived (computed in app code, not stored):
- **Vehicle current odometer** = max(odometer across its FuelUps and Expenses, `lastDoneOdometer` of its MaintenanceItems), fallback 0.
- **MPG per fuel-up** = (odometer delta since previous *full-tank* fill-up) / (sum of gallons since that previous full-tank fill-up, inclusive of partials in between). Only shown when previous full-tank entry exists.
- **Maintenance due status**: compute next-due-mileage = `lastDoneOdometer + intervalMiles` (if set) and next-due-date = `lastDoneDate + intervalMonths` (if set). Status = OVERDUE if either threshold has passed, DUE_SOON if within 500 mi or 14 days of threshold, else OK. If no `lastDoneDate`/`lastDoneOdometer`, treat item as due from vehicle creation / first fuel-up.

## Phases

### Phase 0 - Scaffold
- `npx create-next-app` (TS, App Router, Tailwind, ESLint, `src/` dir, `@/*` import alias).
- Install deps: `prisma`, `@prisma/client`, `next-auth@beta`, `bcryptjs`, `zod`, `recharts`, `next-themes`, `lucide-react`.
- Init shadcn/ui; add components as needed (button, input, label, card, dialog, dropdown-menu, table, badge, select, tabs, sonner/toast, avatar, separator, sheet for mobile nav).
- Base layout: sidebar (desktop) / bottom or sheet nav (mobile), theme toggle.
- Additional deps for new scope: `nodemailer` + `@types/nodemailer`, `node-cron` + `@types/node-cron`, `papaparse` + `@types/papaparse`, `date-fns`, `googleapis`, `archiver` + `@types/archiver`.
- `.env.example` with `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `UPLOADS_DIR` (default `/data/uploads`), `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `NOTIFICATIONS_ENABLED`, `APP_URL` (for building the OAuth redirect URI), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BACKUP_RETENTION_COUNT` (default 14).

### Phase 1 - Data layer
- Write `prisma/schema.prisma` per model above.
- `prisma/seed.ts`: if no `User` rows exist, create the first `ADMIN` from `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars, or generate a random password (email defaults to `admin@localhost` with a console warning to update it via Settings so it can receive notifications) and `console.log` the credentials prominently (banner style, mirroring May's behavior).
- Lib helpers in `src/lib/`: `prisma.ts` (singleton client), `units.ts` (formatting helpers: miles, gallons, MPG, USD), `mpg.ts` (fuel-up MPG calculation), `maintenance.ts` (due-status calculation), `odometer.ts` (current odometer derivation).

### Phase 2 - Auth
- `auth.ts` (Auth.js config) with Credentials provider checking `User` table by `email` via bcrypt compare; JWT session carries `id`, `email`, `role`.
- `middleware.ts` protecting all routes except `/login` and static assets; `src/lib/auth-guards.ts` `requireAdmin()` helper for admin-only server actions/pages.
- `/login` page - clean centered card, email + password, error state.
- Sign-out control in nav; nav shows current user's name/email and role.

### Phase 3 - User management (admin only)
- Server actions: `createUser`, `updateUser` (name/role/notifyEnabled), `resetUserPassword`, `deleteUser` - all wrapped in `requireAdmin()`.
- `/settings/users` (hidden from non-admins, and the route itself 403s for non-admins): table of users (email, name, role, notify toggle), "Add user" dialog (email, name, temporary password - generated or admin-set, shown once), edit role/notify, remove user (can't delete the last remaining admin or yourself while it would leave zero admins).
- Every user (including non-admins) gets `/settings/profile`: change own name, email, password.

### Phase 4 - Vehicles
- Server actions: `createVehicle`, `updateVehicle`, `deleteVehicle`, `getVehicles`, `getVehicle`.
- `/vehicles` - grid of vehicle cards (photo/placeholder, name, make/model/year, current odometer, quick stats).
- `/vehicles/new`, `/vehicles/[id]/edit` - form (react-hook-form + zod).
- `/vehicles/[id]` - detail page shell (tabs: Overview, Fuel-ups, Expenses, Maintenance) - populated further in later phases.
- Empty state when no vehicles exist yet, with CTA.

### Phase 5 - Fuel-ups
- Server actions: CRUD scoped to a vehicle.
- Form: date, odometer, gallons, price/gallon, total cost (auto-computed live client-side, editable override), full-tank checkbox, station, notes, receipt attachment(s) (see Phase 8).
- List table on vehicle detail: date, odometer, gallons, $/gal, total, MPG (computed), full-tank badge, attachment icon/count. Sorted by date desc, paginated/limited if long.
- Validation: odometer must be greater than the vehicle's previous fuel-up/expense odometer (soft warning, not a hard block, in case of corrections).

### Phase 6 - Expenses
- Server actions: CRUD scoped to a vehicle.
- Form: date, category (select), odometer (optional), cost, vendor, notes, receipt attachment(s) (see Phase 8).
- List table on vehicle detail, filterable by category, sorted by date desc, attachment icon/count.

### Phase 7 - Maintenance reminders
- Server actions: CRUD + `markCompleted(id, { date, odometer, logAsExpense? })`.
- Form: title, interval miles / interval months (at least one required), last done date/odometer (optional on create), `notifyEnabled` toggle.
- List on vehicle detail with status badges (OK green / Due Soon amber / Overdue red), sorted overdue-first.
- "Mark completed" action updates `lastDoneDate`/`lastDoneOdometer` to now/current odometer (editable), resets `lastNotifiedStatus` to null, and optionally creates a linked `Expense` (category MAINTENANCE) if the user provides a cost.

### Phase 8 - Document storage (attachments)
- `src/lib/storage.ts`: save an uploaded `File`/Buffer to `UPLOADS_DIR/<ownerType>/<ownerId>/<uuid>-<sanitized-filename>`, enforce allow-list of mime types (`image/jpeg`, `image/png`, `image/webp`, `image/heic`, `application/pdf`) and a max size (e.g. 15MB); reject anything else with a clear error. Delete-from-disk helper for cleanup on record deletion.
- Server actions `uploadAttachment(ownerType, ownerId, formData)` and `deleteAttachment(id)`, called from the fuel-up/expense forms and list rows.
- `GET /api/attachments/[id]` route handler: verifies the session (same auth as the rest of the app - this route sits under middleware protection), loads the `Attachment` record, streams the file from disk with the correct `Content-Type` and `Content-Disposition` (inline for images/PDFs so they preview in-browser).
- UI: multi-file drag/drop or tap-to-upload input on fuel-up/expense forms (mobile-friendly - accept camera capture on phones via `capture` attribute). Thumbnail grid for images, file icon + name for PDFs, click opens the attachment route in a new tab / lightbox. Delete (x) per attachment with confirm.
- On `Vehicle`/`FuelUp`/`Expense` deletion, cascade-delete `Attachment` rows (DB `onDelete: Cascade`) and best-effort delete the underlying files.

### Phase 9 - Email notifications
- `src/lib/mail.ts`: `nodemailer` transport built from `SMTP_*` env vars; `sendMaintenanceEmail(user, items)` composes a simple HTML email listing newly due/overdue items (title, vehicle, due mileage/date) linking back to the vehicle's maintenance tab.
- `src/lib/notifications.ts`: `checkAndNotify()` - loads all `MaintenanceItem`s, computes status via the Phase-1 maintenance helper, and for any item whose computed status is `DUE_SOON`/`OVERDUE` and differs from `lastNotifiedStatus` (and status isn't `OK`), emails every `User` with `notifyEnabled: true` (one batched email per recipient covering all newly-due items across all vehicles) and then updates the item's `lastNotifiedStatus`/`lastNotifiedAt`. Skips entirely if `NOTIFICATIONS_ENABLED=false` or SMTP env vars are unset.
- `instrumentation.ts` (Next.js `register()` hook): on server start (production runtime only, guarded so it doesn't double-register under dev hot-reload), schedule `node-cron` to run `checkAndNotify()` once daily (e.g. `0 8 * * *`, server-local time).
- `/settings` page (shared shell for profile + admin sections): SMTP status indicator (configured/not), global notifications on/off (reflects `NOTIFICATIONS_ENABLED`, read-only display of env-driven config - no in-app secret editing), a "Send test email" button (sends to the current user's own address) that calls a server action hitting the same `mail.ts` transport. Per-user `notifyEnabled` toggle lives on `/settings/profile` (self) and `/settings/users` (admin, for others).

### Phase 10 - CSV import
- Mirrors May's 3-step flow: **Upload** → **Map columns** → **Execute**, entirely stateless between steps (no server-side temp storage) - the parsed CSV rows are round-tripped through the form as a hidden base64 field between steps, capped at a sane size (e.g. 5MB / ~20k rows) with a clear error if exceeded.
- `/import` (`Upload` step): choose **Data Type** (`Fuel Logs` | `Expenses`), choose **Vehicle** (select from existing vehicles), upload a `.csv` file. `src/lib/csv-import.ts` `parseCsv()` (via `papaparse`) extracts headers + all rows server-side on submit.
- `/import/map` (`Map columns` step): table of CSV columns with a sample value and a "Map To" dropdown per column, populated from a per-data-type field list (see below) with auto-suggested mappings from a header-alias table (e.g. `odometer`/`mileage`/`miles`/`odo` → `odometer`). A dropdown value can only be used once (mirrors May's disable-when-used behavior), required fields are enforced client-side before submit and re-validated server-side. Date-format selector (`Auto-detect`, `MM/DD/YYYY`, `DD/MM/YYYY`, `YYYY-MM-DD`) parsed with `date-fns`. Shows a preview table of the first ~10 rows.
- `/import/execute` (server action, POST-only): re-parses the round-tripped CSV, applies the column mapping + date format per row, validates each row (required fields present, numeric fields parse, category text matched case-insensitively against `ExpenseCategory` with fallback to `OTHER`), and bulk-inserts valid rows for the chosen vehicle in a single Prisma transaction. Renders a results summary: `N imported`, `M skipped` with the specific reason per skipped row (e.g. "row 14: odometer is not a number").
- Target fields:
  - **Fuel Logs**: `date`\*, `odometer`\*, `gallons`\*, `pricePerGallon`, `totalCost` (at least one of the last two required; the other is computed), `isFullTank` (truthy text → boolean, default true if unmapped), `station`, `notes`.
  - **Expenses**: `date`\*, `category`\*, `cost`\*, `odometer`, `vendor`, `notes`.
- No unit conversion is performed - imported numeric values are trusted as-is (miles/gallons/USD), matching the app's imperial-only scope.

### Phase 11 - Cloud backup (Google Drive)
- `src/lib/crypto.ts`: `encrypt`/`decrypt` helpers (AES-256-GCM, key derived from `AUTH_SECRET` via `scrypt`) - used to protect the stored Drive refresh token at rest.
- OAuth connect flow (admin-only): `GET /api/backup/google/start` builds the Google OAuth consent URL (`scope: drive.file, openid, email`, `access_type: offline`, `prompt: consent`) using `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`APP_URL`-derived redirect URI, and redirects. `GET /api/backup/google/callback` exchanges the code for tokens, fetches the connected account's email, encrypts + stores the refresh token in `BackupIntegration` (upserting the singleton row). A "Disconnect" server action revokes the token with Google and clears the row.
- `src/lib/backup.ts`:
  - `createBackupArchive()`: uses `archiver` to zip the SQLite DB file (via SQLite's online backup / `VACUUM INTO` to get a consistent snapshot rather than copying the live file) plus the entire uploads directory into a temp file under the OS tmp dir.
  - `getDriveClient()`: builds a `googleapis` OAuth2 client from the decrypted stored refresh token, auto-refreshing the access token.
  - `ensureBackupFolder()`: finds or creates the "Auto Tracker Backups" folder in Drive, caching its id on `BackupIntegration.driveFolderId`.
  - `runBackup()`: orchestrates archive → upload → `BackupRecord` (success with size/file id, or failure with error message) → enforce `BACKUP_RETENTION_COUNT` by deleting the oldest Drive files beyond the limit → delete the local temp archive. Safe to call concurrently-guarded (skip if a backup is already in progress).
- `instrumentation.ts`: extend the existing cron registration to also run `runBackup()` daily (e.g. `0 3 * * *`), only if `BackupIntegration` has a stored refresh token.
- `/settings/backups` (admin-only): connection card (connected Google account email / "Not connected" + Connect button), "Back up now" button (calls `runBackup()` via server action, shows toast + spinner), retention setting (read-only, from env), and a table of recent `BackupRecord`s (date, size, status, "Open in Drive" link using the stored `driveFileId`). README documents the manual restore procedure (download the archive from Drive, stop the container, replace the DB file and uploads directory, restart).

### Phase 12 - Dashboard & charts
- `/` (home/dashboard): stat tiles (total spend all-time or last 12mo, avg MPG across vehicles, # upcoming/overdue reminders), recent activity feed (latest fuel-ups + expenses across vehicles), upcoming/overdue reminders list with links.
- Per-vehicle overview tab: stat tiles (avg MPG, total spend, cost/mile) + two charts: cost-over-time (bar/area, monthly buckets, fuel vs. expenses stacked) and MPG-trend (line, per fuel-up). Follow `dataviz` skill guidance for palette/accessibility/empty states.
- Good empty states everywhere (no vehicles / no fuel-ups / no data yet for charts).

### Phase 13 - Docker packaging
- Multi-stage `Dockerfile` (deps → build → runtime, Next.js standalone output).
- `docker-compose.yml`: app service, named volumes mounted at `/data` (db) and `/data/uploads` (files), env vars for `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `UPLOADS_DIR`, `SMTP_*`, `NOTIFICATIONS_ENABLED`, `APP_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BACKUP_RETENTION_COUNT`.
- `docker-entrypoint.sh`: run `prisma migrate deploy`, run seed script, ensure uploads dir exists, then start server.
- Top-level `README.md`: what the app is, screenshots placeholder, quick start (`docker compose up -d`), env var table (including SMTP and Google OAuth setup - step-by-step for creating a Google Cloud OAuth client and enabling the Drive API), first-login instructions (mirroring May's console password banner), how the admin adds more users, how to use CSV import, and the manual backup-restore procedure.

### Phase 14 - Polish & verification
- Responsive pass (mobile-first forms/tables, nav collapses to sheet/bottom bar).
- Run the dev server and manually walk the golden path: create vehicle → log 2+ fuel-ups (one full, one partial, one full) with a receipt photo attached → confirm MPG appears → add expense with a PDF receipt attached → add maintenance item → mark due/overdue by backdating → confirm dashboard reflects everything → trigger `checkAndNotify()` manually and confirm an email is sent (using a local SMTP catcher like MailHog/Mailpit for testing) → send test email from `/settings` → as admin, create a second user and confirm it can log in and sees the same vehicles → import a small sample CSV of fuel-ups and confirm rows land correctly with matching MPG calculations → connect a real (or test) Google account, run "Back up now", and confirm a zip lands in Drive containing the DB and uploads.
- `npm run build` and `npx tsc --noEmit` clean; fix lint errors.
- `npx prisma migrate dev` produces a clean initial migration checked into `prisma/migrations/`.

## Verification checklist (final)
- [ ] Fresh clone + `docker compose up -d` boots the app, prints admin credentials, login works.
- [ ] Admin can create a second user; that user can log in and sees the same vehicles/data (shared fleet).
- [ ] Non-admin user cannot reach `/settings/users` or `/settings/backups`.
- [ ] Create/edit/delete vehicle works.
- [ ] Fuel-up CRUD works; MPG calculation correct across full/partial sequences.
- [ ] Expense CRUD works, categorized correctly.
- [ ] Maintenance item CRUD + status badges + mark-completed flow works.
- [ ] Attach a photo to a fuel-up and a PDF to an expense; both preview/open correctly and are deletable.
- [ ] Attachment download route rejects unauthenticated requests.
- [ ] Maintenance item transitioning to DUE_SOON/OVERDUE emails every user with notifications enabled exactly once (not repeated daily); marking complete resets it so it can notify again next cycle.
- [ ] "Send test email" in Settings works against a configured SMTP server.
- [ ] CSV import: upload a fuel-log CSV, map columns (including an unmapped/skip column), see accurate preview, execute, and confirm correct rows + a sensible error message for a deliberately malformed row.
- [ ] Google Drive connect flow works end to end; "Back up now" produces a Drive file containing the DB + uploads; retention deletes backups beyond the configured count; disconnect clears the stored token.
- [ ] Dashboard totals and charts match underlying data.
- [ ] Dark/light mode toggle works app-wide.
- [ ] Mobile viewport (375px) usable for logging a fuel-up with a camera-captured receipt.
- [ ] `npm run build` succeeds; no TS errors.
