/**
 * The tiny subset of formatting the advisor's answers use: paragraphs, bullet and numbered lists,
 * **bold**, and [[f:id]] citations. Parsed into plain data so the UI renders it with React (no HTML
 * from the model ever reaches the page).
 */
export type Inline = { kind: "text"; text: string } | { kind: "bold"; text: string } | { kind: "cite"; id: string };
export type Block = { kind: "p"; parts: Inline[] } | { kind: "ul" | "ol"; items: Inline[][] };

const CITE = /\[\[f:([0-9a-f-]{36})\]\]/gi;

export function parseInline(line: string): Inline[] {
  const out: Inline[] = [];
  // Split on citations first, then on **bold** inside the text pieces.
  let last = 0;
  for (const m of line.matchAll(CITE)) {
    pushText(out, line.slice(last, m.index));
    out.push({ kind: "cite", id: m[1].toLowerCase() });
    last = (m.index ?? 0) + m[0].length;
  }
  pushText(out, line.slice(last));
  return out;
}

function pushText(out: Inline[], s: string) {
  if (!s) return;
  const pieces = s.split(/\*\*([^*]+)\*\*/g);
  pieces.forEach((p, i) => {
    // Stray markdown markers (a lone "**" or "#") are dropped rather than shown.
    const text = p.replace(/\*\*/g, "");
    if (text) out.push(i % 2 ? { kind: "bold", text } : { kind: "text", text });
  });
}

const BULLET = /^\s*(?:[-*•])\s+/;
const NUMBERED = /^\s*\d+[.)]\s+/;

export function parseAnswer(text: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ kind: "p", parts: parseInline(para.join(" ")) });
    para = [];
  };
  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const heading = /^\s*#{1,6}\s+(.*)$/.exec(raw);
    if (heading) {
      // A markdown heading becomes a short bold line of its own.
      flush();
      blocks.push({ kind: "p", parts: [{ kind: "bold", text: heading[1].replace(/\*\*/g, "").trim() }] });
      continue;
    }
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }
    const kind = BULLET.test(line) ? "ul" : NUMBERED.test(line) ? "ol" : null;
    if (kind) {
      flush();
      const item = parseInline(line.replace(kind === "ul" ? BULLET : NUMBERED, ""));
      const prev = blocks.at(-1);
      if (prev && prev.kind === kind) prev.items.push(item);
      else blocks.push({ kind, items: [item] });
    } else {
      para.push(line.trim());
    }
  }
  flush();
  return blocks;
}
