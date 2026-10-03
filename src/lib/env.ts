// Central env accessor: trims whitespace and strips one layer of surrounding
// single/double quotes. Amplify / hosting consoles do NOT strip quotes, so a
// value pasted as "https://..." (with quotes, e.g. copied from .env.example
// style) would otherwise reach the app with literal quote characters.
export function envVar(name: string): string | undefined {
  const raw = process.env[name];
  if (raw == null) return undefined;
  let v = raw.trim();
  if (v.length >= 2) {
    const first = v[0];
    const last = v[v.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      v = v.slice(1, -1).trim();
    }
  }
  return v === "" ? undefined : v;
}
