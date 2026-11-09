/** A request as typed, reduced to lowercase words, so "Launch!!" and "launch" count once. Null if too short. */
export function normalizeRequest(query: string): string | null {
  const n = query
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 120)
    .trim();
  return n.length >= 2 ? n : null;
}
