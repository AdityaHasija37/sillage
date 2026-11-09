// Matches unverified Open Beauty Facts entries to full catalog entries, so a refresh can merge them
// (DEC-59). Plain JS so the catalog scripts (Node, no build step) and the TypeScript tests share it.
//
// Two levels, strictest first, and a match is used only when it is unambiguous:
//   1. brand + name with sizes, "spray" and gender words removed and EDP/EDT/EDC spelled out;
//   2. the same with the concentration words removed too ("Launch EDP 100ml" → "launch").
// Anything that matches more than one catalog entry at a level is left alone.

const norm = (s) =>
  String(s ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9.]+/g, " ")
    .trim();

const ABBREVIATIONS = [
  [/\bedp\b/g, "eau de parfum"],
  [/\bedt\b/g, "eau de toilette"],
  [/\bedc\b/g, "eau de cologne"],
];
const NOISE = [
  /\b\d+(?:\.\d+)?\s?(?:ml|fl oz|fl\. oz|floz|oz)\b/g,
  /\b(?:natural spray|vaporisateur|vaporizador|spray)\b/g,
  /\bfor (?:men|women|him|her)\b/g,
];
const CONCENTRATION = /\b(?:eau de parfum|eau de toilette|eau de cologne|extrait de parfum)\b/g;

/** [strict key, loose key] for a brand and name. */
export function matchKeys(brand, name) {
  const b = norm(brand);
  let n = norm(name);
  if (b && n.startsWith(`${b} `)) n = n.slice(b.length + 1);
  for (const [re, to] of ABBREVIATIONS) n = n.replace(re, to);
  for (const re of NOISE) n = n.replace(re, " ");
  n = n.replace(/\./g, " ").replace(/\s+/g, " ").trim();
  const loose = n.replace(CONCENTRATION, " ").replace(/\s+/g, " ").trim();
  const bk = b.replace(/\./g, " ").replace(/\s+/g, " ").trim();
  return [`${bk}::${n}`, `${bk}::${loose}`];
}

/**
 * @param {{ id: string, brand: string, name: string }[]} unverified
 * @param {{ externalId: string, brand: string, name: string }[]} catalog
 * @returns {{ fromId: string, toExternalId: string, level: 1 | 2 }[]}
 */
export function matchUnverified(unverified, catalog) {
  const strict = new Map();
  const loose = new Map();
  const add = (map, key, id) => {
    if (!key.endsWith("::")) map.set(key, [...(map.get(key) ?? []), id]);
  };
  for (const c of catalog) {
    const [s, l] = matchKeys(c.brand, c.name);
    add(strict, s, c.externalId);
    add(loose, l, c.externalId);
  }
  const out = [];
  for (const u of unverified) {
    const [s, l] = matchKeys(u.brand, u.name);
    const a = strict.get(s);
    if (a?.length === 1) {
      out.push({ fromId: u.id, toExternalId: a[0], level: 1 });
      continue;
    }
    if (a && a.length > 1) continue;
    const b = loose.get(l);
    if (b?.length === 1) out.push({ fromId: u.id, toExternalId: b[0], level: 2 });
  }
  return out;
}
