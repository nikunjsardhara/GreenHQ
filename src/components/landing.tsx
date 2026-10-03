import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  ClipboardList,
  Download,
  Gift,
  Leaf,
  LocateFixed,
  MapPin,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sprout,
  WifiOff,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { LandingHeader } from "@/components/landing-header";
import { SaplingStatusBadge, ProgressBar } from "@/components/ui";

const FEATURES = [
  {
    icon: QrCode,
    title: "A QR identity for every tree",
    body: "Bulk-print weather-proof QR codes. Each scan opens that tree's living profile with species, age, photos and GPS.",
  },
  {
    icon: MapPin,
    title: "Field activation with GPS",
    body: "Volunteers scan in the field to pin the exact location and plantation date. No GPS? Drop the pin manually.",
  },
  {
    icon: WifiOff,
    title: "Works fully offline",
    body: "Scans and status updates queue on the device in zero-connectivity zones and sync when you're back.",
  },
  {
    icon: Smartphone,
    title: "Mobile-first for the field",
    body: "Designed phone-first with big touch targets and fast loads on low-end devices. Installs as an app, no app store needed.",
  },
  {
    icon: Gift,
    title: "Gift trees that outlive cards",
    body: "Dedicate a real, trackable tree with a shareable certificate and QR. Recipients watch it grow for years.",
  },
  {
    icon: BarChart3,
    title: "Impact you can prove",
    body: "Survival rates, CO₂ estimates, per-project progress and volunteer leaderboards, all exportable as CSV.",
  },
  {
    icon: ShieldCheck,
    title: "Built for teams",
    body: "Projects, roles and permissions for admins, coordinators and field volunteers across many organizations.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Create a plantation project",
    body: "Give your drive a name, draw its zone on the map, and set a sapling target. Everything else lives inside the project.",
  },
  {
    n: "02",
    title: "Add saplings in bulk",
    body: "Pick the species mix and quantity. Hundreds of sapling records are created in a single transaction.",
  },
  {
    n: "03",
    title: "Print the QR codes",
    body: "Download the QR sheet with a short-code under each code. Print them, tag each sapling, and head to the field.",
  },
  {
    n: "04",
    title: "Plant and activate",
    body: "Scan each code where you plant it to capture GPS, date, and a photo. The sapling moves from Registered to Planted.",
  },
  {
    n: "05",
    title: "Track growth and share",
    body: "Update statuses as trees grow (Growing, Mature) and add photos. Anyone scanning the QR sees the public tree page.",
  },
  {
    n: "06",
    title: "Gift a tree",
    body: "Dedicate an ungifted tree to someone with a certificate and QR link. Each tree can be gifted only once, at Rs 500 per gift.",
  },
];

const ROLES = [
  {
    icon: ShieldCheck,
    title: "Org Admins",
    body: "Oversee every project, manage roles and users, restore mistakes, and export audit-ready reports.",
  },
  {
    icon: ClipboardList,
    title: "Coordinators",
    body: "Bulk-create QR batches, watch survival per project, and follow up where saplings go quiet.",
  },
  {
    icon: Smartphone,
    title: "Field Volunteers",
    body: "One job, offline-friendly: scan, plant, photograph. Big touch targets, no training needed.",
  },
];

const METHOD = [
  {
    icon: Activity,
    title: "Survival, per sapling",
    body: "Every tree carries its own lifecycle (Registered, Planted, Growing, Mature), so survival is counted, not guessed.",
  },
  {
    icon: Leaf,
    title: "Per-species CO₂ factors",
    body: "Each species in the catalog carries an annual CO₂ estimate scaled by canopy, summed across living trees.",
  },
  {
    icon: Download,
    title: "Exportable proof",
    body: "Per-project CSV exports, public tree pages and gift certificates donors can open and verify themselves.",
  },
];

const INSTALL_STEPS = [
  {
    n: "01",
    title: "Open this site in Chrome",
    body: "Visit your GreenHQ address on your phone. No app store or download needed.",
  },
  {
    n: "02",
    title: "Tap the menu",
    body: "Tap the three-dot menu in the top-right corner of Chrome.",
  },
  {
    n: "03",
    title: "Add to Home screen",
    body: "Tap Add to Home screen (or Install app), then Install. GreenHQ now opens full-screen from your home screen.",
  },
];

const FAQS = [
  {
    q: "Do phones need internet in the field?",
    a: "No. Scans, activations and status updates queue on the device with zero connectivity and sync automatically when you're back online.",
  },
  {
    q: "What if a QR tag falls off?",
    a: "Every QR has a human-readable short-code printed under it. Type it into Scan to open the same tree.",
  },
  {
    q: "Who owns our data?",
    a: "Your organization does. Projects, saplings and reports export to CSV any time, and soft-deleted records can be restored.",
  },
  {
    q: "How are CO₂ numbers calculated?",
    a: "Each species carries an estimated annual CO₂ factor, multiplied across your living trees. Honest engagement, not certified offsets.",
  },
  {
    q: "Can donors see progress?",
    a: "Yes. Every tree has a public, shareable page with photos, map and timeline. No login needed to view.",
  },
  {
    q: "How does tree gifting work?",
    a: "Pick any tree that has not been gifted yet and dedicate it with a recipient name and message. Each tree can be gifted only once, and gifting costs Rs 500 per tree. The recipient gets a certificate with a QR link and can watch the tree grow.",
  },
  {
    q: "How do I install the app on my phone?",
    a: "GreenHQ is a PWA, so there is nothing to download from an app store. On Android, open the site in Chrome, tap the three-dot menu, then Add to Home screen (or Install app). On iPhone, open it in Safari and use Share, then Add to Home Screen.",
  },
  {
    q: "Which languages are supported?",
    a: "English today. All interface text lives in one structured catalog, so Hindi and regional languages can be added without touching components.",
  },
  {
    q: "Are you a volunteer or organization member? How do you sign in?",
    a: "Ask your organization admin to invite you. You will get an email with a link to set your password, then sign in with your email. If you forget your password later, use Forgot password on the sign-in page to reset it.",
  },
  {
    q: "I forgot my password. What should I do?",
    a: "Open the sign-in page and tap Forgot password. Enter your account email and we will send a reset link that expires in 1 hour. Still stuck? Ask your organization admin to reset it for you from the team settings.",
  },
  {
    q: "Our NGO is new to GreenHQ. How do we get started?",
    a: "Sign up your organization in under a minute. You become its first admin, then invite coordinators and field volunteers from the settings page. Each of them gets an invite email to set their own password.",
  },
];

// Public landing page, rendered at / for signed-out visitors.
export function Landing() {
  const stats = [
    { value: "10,000+", label: "Trees tracked" },
    { value: "50+", label: "Projects" },
    { value: "2,000+", label: "Trees gifted" },
  ];

  return (
    <main className="flex-1">
      <LandingHeader />

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-5 pt-12 sm:pt-20 pb-10 grid gap-10 lg:grid-cols-2 items-center">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white text-xs font-semibold px-3 py-1.5 shadow-sm">
            <Leaf size={13} aria-hidden className="text-[var(--gs-brand)]" />
            The plantation OS for field teams
          </p>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-[var(--gs-ink)] mt-5 text-balance">
            Every tree gets an identity.
          </h1>
          <p className="text-base sm:text-lg text-[var(--gs-muted)] mt-4 leading-relaxed max-w-lg">
            GreenHQ tags each sapling with a QR code and follows it for life: planting,
            GPS, growth photos, survival and CO₂. No more plantation drives that vanish
            without a trace.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-7 no-print">
            <Link
              href="/signup"
              className="gs-chip !bg-[var(--gs-ink)] !text-white !px-7 !py-3.5 !text-base inline-flex items-center gap-2"
            >
              <Sprout size={17} aria-hidden /> Start planting
            </Link>
            <a href="#how" className="gs-chip !px-7 !py-3.5 !text-base inline-flex items-center gap-2">
              See how it works
            </a>
          </div>
          <p className="text-xs text-[var(--gs-muted)] mt-4">
            Free for field teams · Works offline · Open QR standard
          </p>
        </div>

        {/* Hero visual: sapling passport card + floating proof cards */}
        <div className="relative mx-auto w-full max-w-sm" aria-hidden>
          <div className="gs-card gs-float p-5 rotate-1">
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-2xl bg-[var(--gs-mint-light)] flex items-center justify-center text-[var(--gs-brand)]">
                <Sprout size={24} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm font-semibold text-[var(--gs-ink)]">K7mQ2xP9zR</p>
                <p className="text-xs text-[var(--gs-muted)]">Neem · Shanti Park</p>
              </div>
              <SaplingStatusBadge status="growing" label="Growing" />
            </div>
            <div className="mt-4">
              <ProgressBar value={68} label="Year 2 of 3 to maturity" />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--gs-muted)] mt-3">
              <MapPin size={12} /> 22.71960, 75.85770 · 3 growth photos
            </div>
          </div>
          {/* Geo-tagging illustration: stylized project map with live tree pins */}
          <div className="gs-card gs-float overflow-hidden -rotate-1 mt-4">
            <div className="relative h-52">
              <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
                <defs>
                  <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M40 0H0V40" fill="none" stroke="#dde5da" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="400" height="240" fill="#edf2ea" />
                <rect width="400" height="240" fill="url(#hero-grid)" />
                <polygon points="40,28 190,18 205,140 30,152" fill="#2e7d320d" stroke="#2e7d32" strokeWidth="2" strokeDasharray="7 6" strokeLinejoin="round" />
                <ellipse cx="115" cy="85" rx="80" ry="52" fill="#d7e8cf" stroke="#bcd6b2" strokeWidth="2" />
                <ellipse cx="332" cy="200" rx="58" ry="30" fill="#cfe3f2" />
                <path d="M-10 178 C 80 158, 140 198, 220 178 S 360 138, 420 158" fill="none" stroke="#d5dcd2" strokeWidth="18" strokeLinecap="round" />
                <path d="M-10 178 C 80 158, 140 198, 220 178 S 360 138, 420 158" fill="none" stroke="#ffffff" strokeWidth="13" strokeLinecap="round" />
                <path d="M252 -10 C 242 60, 272 120, 262 196 S 252 250, 257 280" fill="none" stroke="#d5dcd2" strokeWidth="16" />
                <path d="M252 -10 C 242 60, 272 120, 262 196 S 252 250, 257 280" fill="none" stroke="#ffffff" strokeWidth="11" />
              </svg>
              <span className="absolute rounded-full border-2 border-[var(--gs-brand)] bg-[var(--gs-brand)] opacity-15" style={{ left: "38%", top: "48%", width: 72, height: 72, transform: "translate(-50%, -50%)" }} />
              <span className="absolute" style={{ left: "20%", top: "24%" }}>
                <span className="block w-7 h-7 rounded-full bg-white text-[var(--gs-brand)] flex items-center justify-center shadow-md ring-1 ring-[var(--gs-line)]">
                  <MapPin size={15} />
                </span>
              </span>
              <span className="absolute" style={{ left: "62%", top: "18%" }}>
                <span className="block w-7 h-7 rounded-full bg-white text-[var(--gs-brand)] flex items-center justify-center shadow-md ring-1 ring-[var(--gs-line)]">
                  <MapPin size={15} />
                </span>
              </span>
              <span className="absolute" style={{ left: "38%", top: "48%", transform: "translate(-50%, -50%)" }}>
                <span className="absolute -inset-2.5 rounded-full bg-[var(--gs-brand)] opacity-25 animate-ping" />
                <span className="relative block w-9 h-9 rounded-full bg-[var(--gs-brand)] text-white flex items-center justify-center shadow-lg">
                  <MapPin size={18} />
                </span>
              </span>
              <span className="absolute" style={{ left: "76%", top: "62%" }}>
                <span className="block w-7 h-7 rounded-full bg-white text-[var(--gs-brand)] flex items-center justify-center shadow-md ring-1 ring-[var(--gs-line)]">
                  <MapPin size={15} />
                </span>
              </span>
              <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-white text-[0.7rem] font-semibold px-2.5 py-1 shadow-md ring-1 ring-[var(--gs-line)] text-[var(--gs-ink)]">
                <Sprout size={12} aria-hidden /> 128 trees nearby
              </span>
              <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-[var(--gs-ink)] text-white text-[0.7rem] font-semibold px-2.5 py-1 shadow-md">
                <LocateFixed size={12} aria-hidden /> ±4 m · GPS locked
              </span>
            </div>
          </div>
          <div className="gs-card gs-float px-4 py-3 absolute -left-3 sm:-left-8 -bottom-6 -rotate-2 flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-[var(--gs-coral-light)] flex items-center justify-center text-[var(--gs-coral)]">
              <Gift size={18} />
            </span>
            <p className="text-xs font-semibold text-[var(--gs-ink)]">Gifted to Riya<br /><span className="font-normal text-[var(--gs-muted)]">Claimed · thriving</span></p>
          </div>
          <div className="gs-card gs-float px-4 py-3 absolute -right-2 sm:-right-6 -top-6 rotate-2 flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-[var(--gs-mint-light)] flex items-center justify-center text-[var(--gs-brand)]">
              <BarChart3 size={18} />
            </span>
            <p className="text-xs font-semibold text-[var(--gs-ink)]">94% survival<br /><span className="font-normal text-[var(--gs-muted)]">2.1 t CO₂ / year</span></p>
          </div>
        </div>
      </section>

      {/* Live impact strip */}
      <section id="impact" aria-label="Live impact" className="mx-auto max-w-5xl px-5 mt-6 scroll-mt-24">
        <div className="gs-card p-5 sm:p-6 grid grid-cols-3 gap-4 text-center">
          {stats.map((st) => (
            <div key={st.label}>
              <p className="font-bold text-2xl sm:text-4xl tracking-tight text-[var(--gs-ink)]">{st.value}</p>
              <p className="text-xs sm:text-sm text-[var(--gs-muted)] mt-1">{st.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" aria-label="Features" className="mx-auto max-w-5xl px-5 mt-14 sm:mt-20 scroll-mt-24">
        <p className="text-[0.7rem] tracking-[0.22em] uppercase text-[var(--gs-brand)] font-bold">Why GreenHQ</p>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--gs-ink)] mt-2 text-balance">
          Plantation drives you can actually verify.
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-7">
          {FEATURES.map((f) => (
            <article key={f.title} className="gs-card p-5">
              <span className="w-11 h-11 rounded-2xl bg-[var(--gs-mint-light)] flex items-center justify-center text-[var(--gs-brand)]" aria-hidden>
                <f.icon size={22} />
              </span>
              <h3 className="font-bold text-[var(--gs-ink)] mt-3">{f.title}</h3>
              <p className="text-sm text-[var(--gs-muted)] mt-1.5 leading-relaxed">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* How to use */}
      <section id="how" aria-label="How to use" className="mx-auto max-w-5xl px-5 mt-14 sm:mt-20 scroll-mt-24">
        <p className="text-[0.7rem] tracking-[0.22em] uppercase text-[var(--gs-brand)] font-bold">How to use</p>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--gs-ink)] mt-2 text-balance">
          From project to living forest in six steps.
        </h2>
        <ol className="grid gap-4 md:grid-cols-3 mt-7 list-none pl-0">
          {STEPS.map((s) => (
            <li key={s.n} className="gs-card p-5">
              <p className="font-mono font-bold text-sm text-[var(--gs-coral)]">{s.n}</p>
              <h3 className="font-bold text-[var(--gs-ink)] mt-2">{s.title}</h3>
              <p className="text-sm text-[var(--gs-muted)] mt-1.5 leading-relaxed">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Roles */}
      <section id="roles" aria-label="Made for every role" className="mx-auto max-w-5xl px-5 mt-14 sm:mt-20 scroll-mt-24">
        <p className="text-[0.7rem] tracking-[0.22em] uppercase text-[var(--gs-brand)] font-bold">Made for every role</p>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--gs-ink)] mt-2 text-balance">
          Admins steer. Coordinators watch. Volunteers just scan.
        </h2>
        <div className="grid gap-4 md:grid-cols-3 mt-7">
          {ROLES.map((r) => (
            <article key={r.title} className="gs-card p-5">
              <span className="w-11 h-11 rounded-2xl bg-[var(--gs-coral-light)] flex items-center justify-center text-[var(--gs-coral)]" aria-hidden>
                <r.icon size={22} />
              </span>
              <h3 className="font-bold text-[var(--gs-ink)] mt-3">{r.title}</h3>
              <p className="text-sm text-[var(--gs-muted)] mt-1.5 leading-relaxed">{r.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Impact methodology */}
      <section aria-label="How the numbers are made" className="mx-auto max-w-5xl px-5 mt-14 sm:mt-20">
        <div className="rounded-3xl p-8 sm:p-10" style={{ background: "var(--gs-ink)", color: "#fff" }}>
          <p className="text-[0.7rem] tracking-[0.22em] uppercase font-bold" style={{ color: "var(--gs-coral)" }}>Honest numbers</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mt-2 text-balance">
            How the impact numbers are made.
          </h2>
          <div className="grid gap-6 md:grid-cols-3 mt-7 text-left">
            {METHOD.map((m) => (
              <div key={m.title}>
                <span className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center" style={{ color: "var(--gs-coral)" }} aria-hidden>
                  <m.icon size={22} />
                </span>
                <h3 className="font-bold mt-3">{m.title}</h3>
                <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "#d7d2c9" }}>{m.body}</p>
              </div>
            ))}
          </div>
          <p className="text-xs mt-7" style={{ color: "#a8a29a" }}>
            CO₂ figures are engagement estimates from per-species factors, not certified carbon offsets.
          </p>
        </div>
      </section>

      {/* Gift band */}
      <section aria-label="Gift a tree" className="mx-auto max-w-5xl px-5 mt-14 sm:mt-20">
        <div className="gs-card p-8 sm:p-12 text-center">
          <span className="mx-auto w-14 h-14 rounded-2xl bg-[var(--gs-coral-light)] flex items-center justify-center text-[var(--gs-coral)]" aria-hidden>
            <Gift size={26} />
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mt-5 text-balance text-[var(--gs-ink)]">
            Give a tree that outlives the card.
          </h2>
          <p className="mt-3 max-w-xl mx-auto leading-relaxed text-[var(--gs-muted)]">
            Dedicate a real sapling for a birthday, a memory, or a milestone. The recipient
            gets a certificate and a QR link and watches their tree grow, year after year.
          </p>
          <Link
            href="/login"
            className="gs-chip !bg-[var(--gs-ink)] !text-white !px-7 !py-3.5 !text-base inline-flex items-center gap-2 mt-7"
          >
            <Gift size={16} aria-hidden /> Gift a tree
          </Link>
        </div>
      </section>

      {/* Install the app */}
      <section aria-label="Install the app" className="mx-auto max-w-5xl px-5 mt-14 sm:mt-20">
        <div className="gs-card p-8 sm:p-10">
          <div className="flex items-center gap-4">
            <span className="w-14 h-14 rounded-2xl bg-[var(--gs-ink)] flex items-center justify-center text-white shrink-0" aria-hidden>
              <Smartphone size={26} />
            </span>
            <div>
              <p className="text-[0.7rem] tracking-[0.22em] uppercase text-[var(--gs-brand)] font-bold">Install the app</p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--gs-ink)] text-balance">
                Take GreenHQ to the field.
              </h2>
            </div>
          </div>
          <p className="text-[var(--gs-muted)] mt-4 max-w-2xl leading-relaxed">
            GreenHQ is a PWA, so it installs straight from the browser with no app store.
            It opens full-screen from your home screen and keeps working offline.
          </p>
          <ol className="grid gap-4 md:grid-cols-3 mt-6 list-none pl-0">
            {INSTALL_STEPS.map((s) => (
              <li key={s.n} className="rounded-2xl p-5 bg-[var(--gs-bg)]">
                <p className="font-mono font-bold text-sm text-[var(--gs-coral)]">{s.n}</p>
                <h3 className="font-bold text-[var(--gs-ink)] mt-2">{s.title}</h3>
                <p className="text-sm text-[var(--gs-muted)] mt-1.5 leading-relaxed">{s.body}</p>
              </li>
            ))}
          </ol>
          <p className="text-xs text-[var(--gs-muted)] mt-4">
            On iPhone, open the site in Safari and use Share, then Add to Home Screen.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" aria-label="Frequently asked questions" className="mx-auto max-w-5xl px-5 mt-14 sm:mt-20 scroll-mt-24">
        <div className="rounded-3xl bg-white p-8 sm:p-10">
          <p className="text-[0.7rem] tracking-[0.22em] uppercase text-[var(--gs-brand)] font-bold">FAQ</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--gs-ink)] mt-2 text-balance">
            Questions, answered.
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 mt-7">
            {FAQS.map((f, i) => (
              <div key={f.q} className="rounded-2xl p-5 bg-[var(--gs-bg)]">
                <div className="flex items-start gap-3">
                  <span
                    className="mt-0.5 shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{
                      background: ["var(--gs-mint-light)", "var(--gs-coral-light)", "var(--gs-yellow-light)", "var(--gs-lavender-light)"][i % 4],
                      color: ["var(--gs-brand)", "var(--gs-coral)", "#7a5200", "#5b4fc4"][i % 4],
                    }}
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <h3 className="font-bold text-[var(--gs-ink)] text-[0.95rem] leading-snug">{f.q}</h3>
                </div>
                <p className="text-sm text-[var(--gs-muted)] mt-2.5 ml-10 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section aria-label="Get started" className="mx-auto max-w-5xl px-5 mt-14 sm:mt-20 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--gs-ink)] text-balance">
          Ready to grow a forest you can prove?
        </h2>
        <p className="text-[var(--gs-muted)] mt-3 max-w-xl mx-auto">
          Create your organization account to start your first project, or sign in if you already have one.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          <Link
            href="/signup"
            className="gs-chip !bg-[var(--gs-ink)] !text-white !px-8 !py-4 !text-base inline-flex items-center gap-2"
          >
            <Sprout size={17} aria-hidden /> Sign up your organization
          </Link>
          <Link
            href="/login"
            className="gs-chip !px-8 !py-4 !text-base inline-flex items-center gap-2"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-5xl px-5 mt-14 pb-28 flex flex-col sm:flex-row items-center gap-3 justify-between text-sm text-[var(--gs-muted)]">
        <span className="inline-flex items-center gap-2">
          <Logo size={26} /> Plant. Track. Gift.
        </span>
        <div className="flex items-center gap-4">
          <Link href="/signup" className="inline-flex items-center gap-1 font-semibold text-[var(--gs-ink)]">
            Sign up <ArrowRight size={14} aria-hidden />
          </Link>
          <Link href="/login" className="inline-flex items-center gap-1 font-semibold text-[var(--gs-ink)]">
            Sign in <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      </footer>
    </main>
  );
}
