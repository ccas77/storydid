const categories = [
  "historical fraud scandal", "disputed inheritance court", "industrial disaster inquiry",
  "religious scandal trial", "government blunder investigation", "maritime disaster survivors",
  "medical mystery historical case", "abandoned town disaster"
];
const modifiers = ["forgotten", "extraordinary", "strange", "little-known", "inquest", "testimony", "impostor"];
export function makeDailyQueries(date = new Date()) {
  const seed = Math.floor(date.getTime() / 86_400_000);
  return Array.from({ length: 4 }, (_, i) => `${modifiers[(seed + i) % modifiers.length]} ${categories[(seed * 3 + i) % categories.length]} 1800 1963`);
}
