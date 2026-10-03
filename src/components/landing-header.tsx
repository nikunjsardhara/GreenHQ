"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How to use" },
  { href: "#faq", label: "FAQ" },
];

export function LandingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 no-print" style={{ background: "rgb(245 240 234 / 0.85)", backdropFilter: "blur(12px)" }}>
      <div className="mx-auto max-w-5xl px-5 py-3.5 flex items-center gap-4">
        <Logo size={34} />
        <nav aria-label="Landing sections" className="hidden sm:flex items-center gap-5 text-sm font-medium text-[var(--gs-muted)] ml-2">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-[var(--gs-ink)]">{l.label}</a>
          ))}
        </nav>
        <div className="ml-auto flex items-start gap-1.5">
          <Link
            href="/signup"
            className="hidden sm:inline-flex items-center text-sm font-semibold text-[var(--gs-ink)] px-3 py-2.5"
          >
            Sign up
          </Link>
          <div className="flex flex-col items-center">
            <Link
              href="/login"
              className="gs-chip !bg-[var(--gs-ink)] !text-white !px-5 !py-2.5 inline-flex items-center gap-1.5"
            >
              Sign in <ArrowRight size={14} aria-hidden />
            </Link>
            <span className="text-[11px] leading-none mt-1 whitespace-nowrap text-[var(--gs-muted)]">Demo credentials inside</span>
          </div>
        </div>
        <button
          type="button"
          className="sm:hidden w-12 h-10 rounded-xl flex items-center justify-center hover:bg-[var(--gs-line)]"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      {open && (
        <nav aria-label="Mobile sections" className="sm:hidden border-t border-[var(--gs-line)] bg-[var(--gs-bg)]">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block px-5 py-3 text-sm font-medium text-[var(--gs-muted)] hover:text-[var(--gs-ink)] hover:bg-[var(--gs-card)]"
            >
              {l.label}
            </a>
          ))}
          <Link
            href="/signup"
            onClick={() => setOpen(false)}
            className="block px-5 py-3 text-sm font-semibold text-[var(--gs-ink)] hover:bg-[var(--gs-card)]"
          >
            Sign up your organization
          </Link>
        </nav>
      )}
    </header>
  );
}
