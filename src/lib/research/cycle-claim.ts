type ClaimableCycle = {
  status: "queued" | "running" | string;
  createdAt: Date | string | null;
  stageState: Record<string, unknown>;
};

export function compareClaimableCycles(a: ClaimableCycle, b: ClaimableCycle) {
  const priorityDiff = claimPriority(a) - claimPriority(b);
  if (priorityDiff !== 0) return priorityDiff;
  return createdAtMs(a.createdAt) - createdAtMs(b.createdAt);
}

function claimPriority(cycle: ClaimableCycle) {
  const userBrief = cycle.stageState?.source === "user_brief";
  if (cycle.status === "queued" && userBrief) return 0;
  if (cycle.status === "running" && userBrief) return 1;
  if (cycle.status === "queued") return 2;
  return 3;
}

function createdAtMs(value: Date | string | null) {
  if (!value) return 0;
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}
