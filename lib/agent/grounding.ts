/**
 * The advisor's output contract (AI-01, PRD "zero fabricated product IDs/prices"):
 * - fragrances are cited as [[f:<uuid>]] and every cited id must have come back from a tool this turn;
 * - every dollar amount must appear in a tool result this turn.
 * Anything else is removed before the user sees it, and counted in the trace.
 */

export const CITATION = /\[\[f:([0-9a-f-]{36})\]\]/gi;
const DOLLARS = /\$\s?(\d{1,5}(?:,\d{3})*(?:\.\d{1,2})?)/g;

export type GroundingReport = {
  text: string;
  citedIds: string[];
  removedIds: string[];
  removedPrices: string[];
};

const num = (s: string) => Number(s.replace(/,/g, ""));

export function groundAnswer(text: string, allowedIds: Set<string>, toolPrices: string[]): GroundingReport {
  const citedIds: string[] = [];
  const removedIds: string[] = [];
  let out = text.replace(CITATION, (_m, id: string) => {
    const key = id.toLowerCase();
    if (allowedIds.has(key)) {
      if (!citedIds.includes(key)) citedIds.push(key);
      return `[[f:${key}]]`;
    }
    removedIds.push(key);
    return "";
  });

  const allowedAmounts = new Set<number>();
  for (const p of toolPrices) for (const m of p.matchAll(DOLLARS)) allowedAmounts.add(num(m[1]));
  // Price-band labels like "$50–100" put the upper bound after the dash without a "$".
  for (const p of toolPrices) for (const m of p.matchAll(/\$\d+\s?[–-]\s?(\d+)/g)) allowedAmounts.add(num(m[1]));
  const removedPrices: string[] = [];
  out = out.replace(DOLLARS, (m, amount: string) => {
    if (allowedAmounts.has(num(amount))) return m;
    removedPrices.push(m);
    return "[price not verified]";
  });

  return { text: out.replace(/[ \t]+\n/g, "\n").replace(/ {2,}/g, " ").trim(), citedIds, removedIds, removedPrices };
}
