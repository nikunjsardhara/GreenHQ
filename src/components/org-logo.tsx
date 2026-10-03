"use client";

// Organization logo from `organizations.logo_url`, shown wherever the
// organization name appears. Falls back to initials when no URL is set.

export function OrgLogo({
  name,
  logoUrl,
  size = 32,
  rounded = "rounded-xl",
}: {
  name: string;
  logoUrl: string | null | undefined;
  size?: number;
  rounded?: string;
}) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt={`${name} logo`} width={size} height={size} className={`${rounded} shrink-0 object-cover`} style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden
      className={`${rounded} shrink-0 flex items-center justify-center bg-[var(--gs-mint-light)] text-[var(--gs-brand)] font-bold`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

export function OrgNameWithLogo({
  name,
  logoUrl,
  size = 24,
  className = "",
  textClassName = "",
}: {
  name: string;
  logoUrl: string | null | undefined;
  size?: number;
  className?: string;
  textClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 min-w-0 ${className}`}>
      <OrgLogo name={name} logoUrl={logoUrl} size={size} rounded="rounded-lg" />
      <span className={`truncate ${textClassName}`}>{name}</span>
    </span>
  );
}
