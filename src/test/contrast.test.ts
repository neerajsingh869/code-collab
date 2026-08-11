import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { USER_COLORS } from "@/lib/constants";

// The two surfaces everything is drawn on
const PAGE_BG = "#0d1117";
const PANEL_BG = "#161b22";

// Foreground used on top of a user's colour (avatar initials, presence badges)
const ON_COLOR_FG = "#0d1117";

const relativeLuminance = (hex: string) => {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrastRatio = (a: string, b: string) => {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  );
  return (hi + 0.05) / (lo + 0.05);
};

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [path] : [];
  });

describe("contrast", () => {
  // jsdom loads no stylesheet, so axe's colour rules are dead there. These
  // greys measured between 1.02:1 and 2.8:1 on both backgrounds.
  it("uses no text colour dimmer than gray-400", () => {
    const banned = /\b(?:text|placeholder)-gray-(?:500|600|700|800|900)\b/;

    const offenders = sourceFiles(join(process.cwd(), "src"))
      .map((path) => ({ path, hits: readFileSync(path, "utf8").match(banned) }))
      .filter((f) => f.hits)
      .map((f) => `${f.path}: ${f.hits!.join(", ")}`);

    expect(offenders).toEqual([]);
  });

  it("keeps every presence colour readable behind dark text", () => {
    for (const color of USER_COLORS) {
      expect(contrastRatio(ON_COLOR_FG, color)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps presence colours readable as text on both surfaces", () => {
    for (const color of USER_COLORS) {
      expect(contrastRatio(color, PAGE_BG)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(color, PANEL_BG)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
