"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Home, QrCode, FolderKanban, User } from "lucide-react";
import { STRINGS } from "@/i18n/en";

// Floating pill bottom nav, PRD §8. Scan gets the highlighted center slot:
// it is the field volunteer's primary action.
export function BottomNav() {
  const path = usePathname();
  const router = useRouter();
  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/");
  };
  const items = [
    { href: "/", label: STRINGS.nav.home, icon: Home },
    { href: "/projects", label: STRINGS.nav.projects, icon: FolderKanban },
    { href: "/scan", label: STRINGS.nav.scan, icon: QrCode, scan: true },
    { href: "/profile", label: STRINGS.nav.profile, icon: User },
  ];
  return (
    <nav aria-label="Primary" className="gs-bottomnav no-print">
      <button type="button" onClick={goBack} aria-label="Go back">
        <ArrowLeft size={20} aria-hidden />
        <span>Back</span>
      </button>
      {items.map(({ href, label, icon: Icon, scan }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={scan ? "scan" : undefined}
          >
            <Icon size={20} aria-hidden />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
