// Species dropdown helper: the catalog can hold duplicate common names
// (global + org-specific rows for the same tree), so every species <select>
// shows each name once. Matching is case-insensitive on the trimmed name and
// the first row wins, keeping that row's id for the option value.
export function uniqueByName<T>(list: T[], nameOf: (item: T) => string): T[] {
  const seen = new Set<string>();
  return list.filter((item) => {
    const key = nameOf(item).trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function uniqueSpecies<T extends { commonName: string }>(list: T[]): T[] {
  return uniqueByName(list, (s) => s.commonName);
}
