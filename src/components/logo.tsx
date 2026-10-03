"use client";

import Link from "next/link";

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="GreenHQ home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/greenhq-logo-v2.svg"
        width={size}
        height={size}
        alt="GreenHQ logo"
        className="shrink-0"
        style={{ width: size, height: size }}
      />
      <span className="font-bold text-lg text-[var(--gs-ink)]">GreenHQ</span>
    </Link>
  );
}
