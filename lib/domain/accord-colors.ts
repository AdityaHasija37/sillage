/**
 * Accord → colour. Bottle photos aren't licensed (UX doc), so each fragrance is drawn as a "scent
 * fingerprint" from its accords instead. Colours are evocative, not data: every visual that uses
 * them also shows the accord names in text.
 */
const COLORS: Record<string, string> = {
  citrus: "#e6c34a",
  "fresh spicy": "#8fb59a",
  fresh: "#a9cbd6",
  aquatic: "#5d9fc4",
  marine: "#4f8fb8",
  ozonic: "#9bc4d8",
  green: "#7ea36a",
  herbal: "#8a9f6a",
  aromatic: "#8ea886",
  lavender: "#9d8fc4",
  floral: "#e3a6bf",
  "white floral": "#efe3cf",
  "yellow floral": "#efd27e",
  rose: "#d98a9a",
  tuberose: "#f0dcc8",
  iris: "#a7a0c9",
  violet: "#8f7bb8",
  powdery: "#e4d3da",
  fruity: "#e8927c",
  tropical: "#f2b35f",
  cherry: "#b8434e",
  sweet: "#e8b88a",
  vanilla: "#e2c79d",
  caramel: "#c7894d",
  honey: "#d9a441",
  gourmand: "#c99a6b",
  cacao: "#6e4a35",
  chocolate: "#6b4430",
  coffee: "#5b3f2e",
  almond: "#e0c9a8",
  coconut: "#efe6d6",
  lactonic: "#f1e8d8",
  nutty: "#b8915f",
  rum: "#9a5a32",
  whiskey: "#a8692f",
  boozy: "#9a5a32",
  amber: "#c47a2c",
  "warm spicy": "#b5552f",
  "soft spicy": "#c9845a",
  cinnamon: "#a8512c",
  balsamic: "#9a6a3a",
  tobacco: "#8a5a3b",
  woody: "#8b6b4a",
  cedar: "#a07b55",
  sandalwood: "#c4a07a",
  vetiver: "#6f7a52",
  patchouli: "#6b5440",
  oud: "#4a3328",
  earthy: "#7d6b57",
  mossy: "#5f7050",
  conifer: "#4f6b4f",
  leather: "#5c4033",
  smoky: "#6e6a66",
  animalic: "#7a5a48",
  musky: "#cdbfb3",
  soapy: "#dfe6e8",
  aldehydic: "#e9eef0",
  metallic: "#a9adb2",
  mineral: "#a3a8a6",
  salty: "#b9c7cc",
  anis: "#b6c49a",
  camphor: "#b8d0c8",
  sour: "#d9d27a",
  bitter: "#8f8a5c",
};

export function accordColor(name: string): string {
  return COLORS[name.toLowerCase()] ?? "#b8aa98";
}

/** Relative luminance check so labels on a swatch stay legible. */
export function readableOn(hex: string): "#1f1a14" | "#fbf8f2" {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return l > 0.36 ? "#1f1a14" : "#fbf8f2";
}
