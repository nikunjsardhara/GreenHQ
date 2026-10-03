# GreenHQ

Multi-tenant PWA for NGOs to plan, execute, and track tree plantation drives, QR-tagged saplings, field activation, and tree gifting. See `PRD.md` for the full spec and `PROGRESS.md` for the build tracker.

## Stack

Bun · Next.js 16 (App Router) · Tailwind CSS v4 · `@knadh/oat` (semantic CSS + Web Components) · Drizzle ORM + Postgres (Neon serverless in prod, local Postgres for dev) · Leaflet + OSM · Lucide · `qrcode` + `nanoid`

## Quick start

```bash
# 1. Database, Neon (recommended; writes .env + links the project)
bunx neon@latest init
# …or fully-offline local Postgres:
#   brew services start postgresql@16 && createdb GreenHQ
#   then point DATABASE_URL at it (see .env comments)

# 2. One-command setup (schema push + seed)
bun run setup

# 3. Run
bun run dev        # http://localhost:3000
bun test           # unit tests (fast, no DB)
bun run test:db    # integration tests (creates GreenHQ_test, pushes schema, runs tests/db with per-test rollback)
```

## Tests

| Suite | Command | What it covers |
|---|---|---|
| Unit (`tests/*.test.ts`) | `bun test` | permissions, lifecycle transitions, auth/JWT round-trips + tamper rejection, tenant-scope gate, QR encoding determinism, CSV round-trips, geo math, rate limits |
| Integration (`tests/db/*.test.ts`) | `bun run test:db` | tenant isolation at the SQL layer, soft-delete hide/restore, uniqueness invariants (nanoid, one-gift-per-sapling, emails, share tokens), bulk all-or-nothing transactions, audit-trail writes |

DB tests skip gracefully under plain `bun test` (no `TEST_DATABASE_URL`); `test:db` provisions everything.

Wiring follows the [Neon Next.js guide](https://neon.com/docs/guides/nextjs)
(postgres.js section): a single `postgres` client reads the pooled
`DATABASE_URL` (`?sslmode=require`), with `prepare: false` for Neon's pooler.
`DATABASE_URL_UNPOOLED` (direct connection, for heavy migrations) and
`NEON_BRANCH` are managed by `neon init` in `.env`. The `.neon/` context file
and `.env` are gitignored; committable placeholders live in `.env.example`
(`DATABASE_URL` format, `NEON_API_KEY`, `NEON_PROJECT_ID`).

Seeded accounts (password `password123`): `superadmin@GreenHQ.local`, `admin@demo-green.example`, `coordinator@demo-green.example`, `volunteer@demo-green.example`, `viewer@demo-green.example`. The seed also ensures a "Grow Native Green Forum" org with `admin@`, `coordinator@`, `volunteer@`, `viewer@grow-native-green.example` (same password); the sign-in page has one-tap buttons for each of those demo roles. Create more users with `bun run users:create -- --email … --password … --name … [--org <slug or exact name>] [--role name]`.

## Scripts

| Command | Purpose |
|---|---|
| `bun run setup` | Create `.env`, push schema, seed demo data |
| `bun run seed [--fresh]` | Seed demo org/users/species/project/saplings/gift |
| `bun run users:create -- --email … --password … --name … [--org slug] [--role name] [--superadmin]` | Create users in development |
| `bun run db:push / db:generate / db:migrate / db:studio` | Drizzle schema workflow |

## Key flows

- **Bulk create:** project page → *Bulk create saplings* → species mix → location strategy (blank / single point / zone scatter) → printable QR sheet + CSV.
- **Field activation:** bottom-nav *Scan* → camera scan or short-code → GPS capture → planted. Works offline (IndexedDB outbox, auto-sync).
- **Public pages:** `/t/<nanoid>` (QR destination, OG image) · `/g/<token>` (gift certificate + no-account claim).
- **Admin:** super admin creates orgs at `/admin`; org settings/roles/users at `/settings`.

## Oat integration (PRD §9 spike outcome)

Oat is global CSS + a handful of Web Components, not a React kit. Pattern used here: `oat.min.css` imported in `globals.css` (after Tailwind), plain semantic HTML everywhere, `oat.min.js` loaded client-side once (`OatLoader`), `ot-tabs` wrapped in `OatTabs` (`src/components/oat.tsx`). Toasts are a minimal custom host until Oat's stabilizes.

## Auth

Built-in email/password + JWT cookie by default. Set `NEON_AUTH_JWKS_URL` to verify Neon Auth JWTs instead (matched to local users by email claim); org/role data always stays local.

## Deploy to AWS Amplify

The app targets Next.js 15 (Amplify Hosting compute supports Next.js 12 through 15) and builds with Bun via `amplify.yml` at the repo root.

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In the Amplify console: **New app → Host web app**, connect the repo and branch. Amplify picks up `amplify.yml` automatically (build: `bun install --frozen-lockfile` + `bun run build`, artifacts from `.next`).
3. Set these **environment variables** in Amplify (App settings → Environment variables):
   - `DATABASE_URL` — Neon pooled connection string (same value as local `.env`)
   - `AUTH_SECRET` — long random string (session signing; generate a fresh one, do not reuse dev values)
   - `NEXT_PUBLIC_APP_URL` — the Amplify URL (e.g. `https://main.xxxxx.amplifyapp.com`); QR codes, invite links and password-reset links are built from this, so update it if you attach a custom domain
   - `EMAIL_FROM` — e.g. `GreenHQ <no-reply@yourdomain.org>`
   - Optional: `RESEND_API_KEY` (transactional email), `NEON_AUTH_JWKS_URL` (Neon Auth passthrough), `DATABASE_URL_UNPOOLED` (heavy migrations)
4. Deploy. No database migration step is needed for the app itself (Drizzle pushes schema via `drizzle-kit push` from your machine); to seed demo data against the prod DB, run `bun run seed` locally with `DATABASE_URL` pointed at Neon.

Notes: the Postgres data stays on Neon (nothing to migrate), and the PWA service worker + OG-image routes work unchanged on Amplify compute.
