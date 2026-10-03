// Accessible text color over a colored background (e.g. org brand colors on
// public gift/sapling pages, where white text is only assumed). Picks whichever
// of white / ink has the better WCAG contrast ratio.
export function luminance(hex: string): number {
  const c = hex.replace("#", "");
  const channel = (i: number): number => {
    const v = parseInt(c.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const INK = "#1a2b1f";
const PAPER = "#ffffff";

/** "#ffffff" for dark backgrounds, ink for light ones (e.g. pale brand colors). */
export function contrastText(backgroundHex: string): string {
  const bg = backgroundHex.startsWith("#") ? backgroundHex : `#${backgroundHex}`;
  return contrastRatio(PAPER, bg) >= contrastRatio(INK, bg) ? PAPER : INK;
}
