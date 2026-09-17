# Nexora Consultant — Team & Interview Management

A recruiting team management app for managers and callers. Managers add
candidate profiles, manage their callers, and schedule interviews. Callers
see the interviews assigned to them, day by day, on a live-updating
calendar. A super admin account has read access across every manager, caller,
profile, and interview.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**, served through
  a small custom Node server (`server.ts`) so Socket.IO can share the same
  HTTP server.
- **PostgreSQL** via **Prisma 6** ORM.
- **NextAuth (Auth.js) v5** — email/password (credentials) auth, JWT sessions.
- **Socket.IO** for real-time updates (new/updated interviews, profiles,
  callers push instantly to everyone who should see them).
- **Tailwind CSS v4** with a hand-rolled component kit (button, card, dialog,
  toast, etc.) and full light/dark theming via `next-themes`.
- **react-big-calendar** + `date-fns-tz` for day/week/month/agenda calendar
  views with proper timezone handling (default: **America/Chicago / CST**).
- Local disk storage for uploaded resumes (PDF/Word), served through an
  authenticated API route.

## Getting started (local development)

Requirements: Node 20+, Docker (for Postgres).

```bash
# 1. Install dependencies
npm install

# 2. Start Postgres (Docker)
docker compose up -d

# 3. Copy the env file and adjust as needed (defaults already match docker-compose.yml)
cp .env.example .env

# 4. Run migrations
npx prisma migrate dev

# 5. Seed the super admin account
#    Uses SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD / SUPER_ADMIN_NAME if set,
#    otherwise defaults to admin@example.com / ChangeMe123!
npm run db:seed

# 6. Start the dev server (Next.js + Socket.IO on one process)
npm run dev
```

The app is served at http://localhost:3000. Sign up as a **Manager** or
**Caller** — callers sign up unassigned, and a manager (Manager → Callers →
"Unassigned callers") or the super admin (Admin → Callers) claims/assigns
them to a team afterward. The super admin account created by the seed
script can see and manage everything.

## Environment variables

See `.env.example`. Key ones:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `NEXTAUTH_SECRET` | Random secret used to sign session JWTs — **change this in production** |
| `NEXTAUTH_URL` | Public URL of the app |
| `DEFAULT_TIMEZONE` | Fallback timezone for new accounts (default `America/Chicago`) |
| `UPLOAD_DIR` | Where resume uploads are stored on disk |

## Telegram interview reminders

Callers can add a Telegram username at signup (or later in Settings) to get a
DM 30 and 10 minutes before each interview they're assigned to.

### 1. Create the bot

Telegram bots can only be created interactively from your own Telegram
account — this can't be automated:

1. Open a chat with [@BotFather](https://t.me/BotFather) and send `/newbot`.
2. Name it **Nexora Bot** when asked for a display name.
3. Pick a username ending in `bot`, e.g. `NexoraConsultantBot`.
4. BotFather replies with an API token — save it for step 2.
5. Set the bot's avatar to match the site: send `/setuserpic`, pick the bot,
   and upload `public/avatar.png` from this repo.

### 2. Configure the app

Add to `.env` (see `.env.example`):

```bash
TELEGRAM_BOT_TOKEN="<token from BotFather>"
TELEGRAM_BOT_USERNAME="NexoraConsultantBot"          # no "@"
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME="NexoraConsultantBot"
TELEGRAM_WEBHOOK_SECRET="<any random string>"
```

Restart the app so the reminder scheduler picks up the token.

### 3. Point Telegram at the webhook

The app must be reachable over HTTPS at a public URL (use `ngrok` or similar
for local testing). Register the webhook once:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=$NEXTAUTH_URL/api/telegram/webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

### How linking works

A caller enters their Telegram `@username` in the signup form or Settings.
Telegram never lets a bot message a user first, so the caller must also open
the bot (`https://t.me/<TELEGRAM_BOT_USERNAME>`) and send `/start`. The
webhook matches the sender's username against the account and stores its
chat ID; Settings then shows a **Linked** badge. Reminders only go out to
callers who have completed this step.

## Production (self-hosted)

This app is designed to be self-hosted (a single Node process, not
Vercel/serverless) since it uses local disk for resume storage and a
real Socket.IO server for live updates.

```bash
npm run build
NODE_ENV=production npm run start
```

Put a reverse proxy (Caddy/Nginx) in front for TLS, and make sure
`UPLOAD_DIR` points at a persistent volume if you're running in a
container — the `uploads/` directory (and the Postgres data volume in
`docker-compose.yml`) must survive redeploys.

## Roles

- **Manager** — adds/edits/deletes candidate profiles, claims and manages
  their own callers, and schedules interviews (job description, resume,
  duration, meeting link, company, timezone-aware time). Customizes their
  own interview status pipeline (Manager → Settings). Sees only their own
  data.
- **Caller** — signs up unassigned, then is claimed by a manager or admin.
  Sees interviews assigned to them (today's list + a day/week/month
  calendar), can view candidate/interview details and move an interview
  through their manager's status pipeline.
- **Super Admin** — full visibility and control across every manager,
  caller, profile, and interview: can edit/delete any of them, and reassign
  a caller to a different manager. There's no sign-up path for this role;
  it's created via the seed script (`npm run db:seed`).

## Useful scripts

```bash
npm run dev         # Next.js + Socket.IO dev server
npm run build        # Production build
npm run start         # Production server (run build first)
npm run lint          # ESLint
npm run db:migrate    # Prisma migrate dev
npm run db:seed       # Seed the super admin account
npm run db:studio     # Prisma Studio (browse the DB)
```
