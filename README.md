# GreenHQ

Submission for the **Zero to Shipped** hackathon by AWS Builder Center.

- **Category:** Social good, Climate resilience `#social-good` `#climate-resilience`
- **Lane:** Community `#community`

## What it is

GreenHQ helps NGOs plan, execute, and prove tree plantation drives. Each sapling gets a QR code identity: volunteers scan it in the field (even with no internet) to record GPS, photos, and growth stages, and anyone can gift a real, trackable tree with a shareable certificate. Dashboards show survival rates and CO2 impact, so donors and communities can verify every claim.

One deployment serves many NGOs, each with its own projects, team roles (admin, coordinator, field volunteer, viewer), and branding.

## Features

- **QR code scanning:** every sapling gets a unique QR code. Print a whole batch at once, then scan codes in the field with any phone camera to pull up that tree's living profile.
- **Geo tagging:** capture precise GPS coordinates at planting time, drop pins manually where satellite signal fails, and draw project zones on the map. Every tree, every location, verifiable.
- **Gifting:** dedicate a real tree for a birthday, a memory, or a milestone. The recipient gets a certificate with a QR link and can watch their tree grow year after year.
- **Growth tracking:** log each sapling's journey from Registered to Planted, Growing, and Mature, with photo timelines and notes. Lost saplings are recorded too, so survival numbers stay honest.
- **Offline-first fieldwork:** scans, activations, and updates queue on the device with zero connectivity and sync automatically when back online. Built for real field conditions.
- **Impact you can prove:** survival rates, CO2 estimates, per-project progress, and volunteer leaderboards, exportable as CSV for donors and reports.

## Install the app (PWA)

GreenHQ is a Progressive Web App: no app store needed. On your smartphone, open the app URL in the browser and install it like a native app:

- **Android (Chrome):** tap the three-dot menu → *Add to Home screen* → *Install*. Or tap the *Install* button in the app when it appears.
- **iPhone (Safari):** tap the Share button → *Add to Home Screen* → *Add*.

Once installed, it launches full-screen from your home screen and keeps working offline in the field.

## Built for communities

Any community can adopt GreenHQ for its own tree plantation activities: a housing society greening its park, a school running a monsoon drive, a village group restoring a hillside, or an NGO coordinating hundreds of volunteers. Create an organization, invite the team, print QR tags, plant, and track, all from ordinary smartphones. Public tree pages and gift certificates make every plantation visible and shareable, turning local action into lasting, provable green cover.

## Key flows

- **Bulk create:** project page → *Bulk create saplings* → species mix → location strategy → printable QR sheet + CSV.
- **Field activation:** bottom-nav *Scan* → camera scan or short-code → GPS capture → planted. Works offline and syncs later.
- **Gifting:** gift a tree to someone → shareable link + QR certificate → recipient can claim it and watch it grow.
- **Public pages:** `/t/<code>` (what a QR scan opens) · `/g/<token>` (gift certificate).
- **Admin:** platform overview at `/admin`; organization settings, roles, and users at `/settings`.

## Run it

Requirements: [Bun](https://bun.sh) and a Postgres database ([Neon](https://neon.tech) recommended, free tier works).

```bash
bun install

# 1. Database (writes .env for you)
bunx neon@latest init
# …or local Postgres: createdb GreenHQ, then point DATABASE_URL at it (see .env comments)

# 2. Set up schema + demo data
bun run setup

# 3. Start the app
bun run dev        # http://localhost:3000
```

### Try it

Sign in with any seeded account (password `password123`), or use the one-tap role buttons on the sign-in page:

- `superadmin@GreenHQ.local` (platform admin)
- `admin@demo-green.example` (organization admin)
- `coordinator@demo-green.example`, `volunteer@demo-green.example`, `viewer@demo-green.example`

The seed also creates a "Grow Native Green Forum" organization with matching admin/coordinator/volunteer/viewer accounts under `@grow-native-green.example`.

## Scripts

| Command | Purpose |
|---|---|
| `bun run setup` | Create `.env`, push schema, seed demo data |
| `bun run dev` | Start the app locally |
| `bun run seed [--fresh]` | Seed demo org, users, species, project, saplings, gift |
| `bun run users:create -- --email … --password … --name … [--org …] [--role …]` | Create a user |
| `bun test` | Run unit tests |

## Deploy to AWS Amplify

The app targets Next.js 15 (supported by Amplify Hosting compute) and builds with Bun via `amplify.yml` at the repo root.

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In the Amplify console: **New app → Host web app**, connect the repo and branch. Amplify picks up `amplify.yml` automatically.
3. Set these **environment variables** in Amplify (App settings → Environment variables):
   - `DATABASE_URL` — Neon pooled connection string (same value as local `.env`)
   - `AUTH_SECRET` — long random string (session signing; generate a fresh one, do not reuse dev values)
   - `NEXT_PUBLIC_APP_URL` — the Amplify URL (e.g. `https://main.xxxxx.amplifyapp.com`); QR codes, invite links and password-reset links are built from this, so update it if you attach a custom domain
   - `EMAIL_FROM` — e.g. `GreenHQ <no-reply@yourdomain.org>`
   - Optional: `RESEND_API_KEY` (transactional email), `NEON_AUTH_JWKS_URL` (Neon Auth passthrough), `DATABASE_URL_UNPOOLED` (heavy migrations)
4. Deploy. To seed demo data against the production database, run `bun run seed` locally with `DATABASE_URL` pointed at Neon.

The Postgres data stays on Neon (nothing to migrate).

## Open source

GreenHQ is open source under the MIT License (see `LICENSE`). Use it, adapt it for your community, and share improvements back so every plantation drive benefits.
