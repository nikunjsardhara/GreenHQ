// Minimal CSV serialize/parse used by report exports (CSV/PDF → CSV side),
// species bulk import, and bulk metadata correction, PRD §6.11.
export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const esc = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.map(esc).join(",")];
  for (const row of rows) lines.push(columns.map((c) => esc(row[c])).join(","));
  return lines.join("\n") + "\n";
}

/** Small RFC-4180 parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;
  const push = () => {
    row.push(field);
    field = "";
  };
  while (i < text.length) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          quoted = false;
          i++;
        }
      } else {
        field += c;
        i++;
      }
    } else if (c === '"') {
      quoted = true;
      i++;
    } else if (c === ",") {
      push();
      i++;
    } else if (c === "\r" || c === "\n") {
      push();
      rows.push(row);
      row = [];
      i += c === "\r" && text[i + 1] === "\n" ? 2 : 1;
      // skip a leading empty row artifact at EOF handled below
    } else {
      field += c;
      i++;
    }
  }
  push();
  rows.push(row);
  // Drop single trailing empty row from final newline.
  if (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === "") {
    rows.pop();
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}
