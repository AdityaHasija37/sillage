import { describe, expect, it } from "vitest";
import { parseAnswer, parseInline } from "@/lib/agent/format";

const ID = "e8192eeb-7fa4-4913-bed3-4e92a98f90d0";

describe("advisor answer formatting", () => {
  it("turns **bold** and citations into parts, never raw markers", () => {
    expect(parseInline(`**Under $50:** Hawas [[f:${ID.toUpperCase()}]] is sweet.`)).toEqual([
      { kind: "bold", text: "Under $50:" },
      { kind: "text", text: " Hawas " },
      { kind: "cite", id: ID },
      { kind: "text", text: " is sweet." },
    ]);
    expect(JSON.stringify(parseInline("a lone ** marker"))).not.toContain("**");
  });
  it("groups paragraphs, bullets and numbered lists", () => {
    const blocks = parseAnswer("Here are three:\n\n• One\n- Two\n* Three\n\n1. First\n2) Second\n\n## Note\nPrices are estimates.");
    expect(blocks.map((b) => b.kind)).toEqual(["p", "ul", "ol", "p", "p"]);
    expect(blocks[1]).toMatchObject({ items: [[{ text: "One" }], [{ text: "Two" }], [{ text: "Three" }]] });
    expect(blocks[3]).toMatchObject({ parts: [{ kind: "bold", text: "Note" }] });
    expect(blocks[4]).toMatchObject({ parts: [{ text: "Prices are estimates." }] });
  });
  it("keeps HTML from the model as plain text", () => {
    expect(parseAnswer("<img src=x onerror=alert(1)>")).toEqual([{ kind: "p", parts: [{ kind: "text", text: "<img src=x onerror=alert(1)>" }] }]);
  });
});
