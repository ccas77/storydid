export type BeatDefinition = {
  slug: string;
  name: string;
  description: string;
  querySeeds: string[];
  cadenceWeight: number;
};

export type BeatScheduleState = BeatDefinition & {
  id: string;
  lastScheduledAt: Date | null;
};

export const DEFAULT_BEATS: BeatDefinition[] = [
  {
    slug: "forgotten-scandals",
    name: "Forgotten Scandals",
    description: "Fraud, imposture, inheritance disputes, religious scandals, and public controversies with strong narrative tension.",
    querySeeds: ["historical fraud scandal", "disputed inheritance court", "religious scandal trial", "impostor testimony"],
    cadenceWeight: 3,
  },
  {
    slug: "disasters-and-inquests",
    name: "Disasters and Inquests",
    description: "Industrial, maritime, medical, and civic disasters where inquiry records can reveal accountability and human stakes.",
    querySeeds: ["industrial disaster inquiry", "maritime disaster survivors", "medical mystery historical case", "inquest testimony"],
    cadenceWeight: 3,
  },
  {
    slug: "power-and-institutions",
    name: "Power and Institutions",
    description: "Government blunders, institutional failures, and public decisions with consequences beyond routine minutes.",
    querySeeds: ["government blunder investigation", "public inquiry testimony", "institutional failure historical case"],
    cadenceWeight: 2,
  },
  {
    slug: "strange-local-histories",
    name: "Strange Local Histories",
    description: "Little-known local mysteries, abandoned places, unusual trials, and community stories with human interest.",
    querySeeds: ["abandoned town disaster", "strange local trial", "little-known historical mystery"],
    cadenceWeight: 2,
  },
];

export function selectNextBeat(beats: BeatScheduleState[], now = new Date()) {
  if (!beats.length) return undefined;
  return [...beats].sort((left, right) => {
    const leftScore = scheduleScore(left, now);
    const rightScore = scheduleScore(right, now);
    if (rightScore !== leftScore) return rightScore - leftScore;
    return left.name.localeCompare(right.name);
  })[0];
}

function scheduleScore(beat: BeatScheduleState, now: Date) {
  if (!beat.lastScheduledAt) return Number.POSITIVE_INFINITY;
  const elapsedHours = Math.max(0, now.getTime() - beat.lastScheduledAt.getTime()) / 3_600_000;
  return elapsedHours * Math.max(1, beat.cadenceWeight);
}
