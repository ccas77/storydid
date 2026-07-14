const categories = [
  "historical fraud scandal", "disputed inheritance court", "industrial disaster inquiry",
  "religious scandal trial", "government blunder investigation", "maritime disaster survivors",
  "medical mystery historical case", "abandoned town disaster"
];
const modifiers = ["forgotten", "extraordinary", "strange", "little-known", "inquest", "testimony", "impostor"];
export function makeDailyQueries(date = new Date(), seeds = categories) {
  const seed = Math.floor(date.getTime() / 86_400_000);
  const source = seeds.length ? seeds : categories;
  return Array.from({ length: 4 }, (_, i) => `${modifiers[(seed + i) % modifiers.length]} ${source[(seed * 3 + i) % source.length]} 1800 1963`);
}
