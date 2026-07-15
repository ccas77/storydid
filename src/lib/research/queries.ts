const categories = [
  "historical fraud scandal", "disputed inheritance court", "industrial disaster inquiry",
  "religious scandal trial", "government blunder investigation", "maritime disaster survivors",
  "medical mystery historical case", "abandoned town disaster"
];
const modifiers = ["forgotten", "extraordinary", "strange", "little-known", "inquest", "testimony", "impostor"];
const stopwords = new Set(["about", "after", "before", "between", "during", "from", "into", "that", "their", "there", "this", "with"]);

export function makeDailyQueries(date = new Date(), seeds = categories) {
  if (seeds !== categories) return seeds.slice(0, 8);
  const seed = Math.floor(date.getTime() / 86_400_000);
  const source = seeds.length ? seeds : categories;
  return Array.from({ length: 4 }, (_, i) => `${modifiers[(seed + i) % modifiers.length]} ${source[(seed * 3 + i) % source.length]} 1800 1963`);
}

export function makeBriefSeeds(prompt: string) {
  const base = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
  if (!base) return categories.slice(0, 3);
  const tokens = base.split(" ").filter((token) => token.length > 3 && !stopwords.has(token));
  const fragments = [
    tokens.slice(0, 3).join(" "),
    tokens.filter((token) => /^(18|19|20)\d{2}$/.test(token) || ["inquest", "testimony", "investigation", "trial"].includes(token)).join(" "),
    tokens.filter((token) => ["factory", "explosion", "disaster", "boiler", "collapse", "fire"].includes(token)).join(" "),
    tokens.filter((token) => ["dayton", "ohio"].includes(token)).join(" "),
  ].filter((fragment) => fragment.split(" ").length >= 2);
  const adjacent = tokens.flatMap((_, index) => {
    const pair = tokens.slice(index, index + 2).join(" ");
    const triple = tokens.slice(index, index + 3).join(" ");
    return [pair, triple];
  }).filter((fragment) => fragment.split(" ").length >= 2);
  return Array.from(new Set([
    base,
    ...fragments,
    ...adjacent,
    `${base} newspaper`,
    `${base} archive`,
  ])).slice(0, 8);
}

export function slugFromBrief(prompt: string) {
  const slug = prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "research-brief";
}
