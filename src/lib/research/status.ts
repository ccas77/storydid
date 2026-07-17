import { isCitedDossier, isCompletedStory } from "./display";
import { PUBLISH_READY_MIN_WORDS } from "./story-length";

export type BriefCycleStatus = {
  beatId: string | null;
  status: string;
  currentStage: string;
  stageState: Record<string, unknown>;
  createdAt: Date;
};

export type BriefBeatStatus = {
  id: string;
  name: string;
  description: string;
};

export type BriefStoryStatus = {
  id: string;
  beatId: string | null;
  workingTitle: string;
  confidenceScore: number;
  researchCompleteness: number;
  claimCitations: unknown;
  storyText?: string | null;
  keyFacts?: unknown;
  chronology?: unknown;
  summary?: string;
  premise?: string | null;
  scriptStatus?: string | null;
  scriptHook?: string | null;
  scriptSegments?: unknown;
  scriptWordCount?: number | null;
};

export type LatestBriefStatus = {
  name: string;
  statusText: string;
  storyHref?: string;
};

export function latestBriefProgress(
  cycles: BriefCycleStatus[],
  beatRows: BriefBeatStatus[],
  storyRows: BriefStoryStatus[] = [],
): LatestBriefStatus | undefined {
  const beatById = new Map(beatRows.map((beat) => [beat.id, beat]));
  for (const cycle of cycles) {
    const beat = cycle.beatId ? beatById.get(cycle.beatId) : undefined;
    const fromBrief = cycle.stageState?.source === "user_brief" || beat?.description.startsWith("User research brief:");
    if (!fromBrief) continue;
    const storiesForBeat = storyRows.filter((story) => story.beatId === cycle.beatId);
    const completed = storiesForBeat.find(isCompletedStory);
    if (completed) {
      return {
        name: beat?.name ?? "Research brief",
        statusText: "Story ready · publish-ready manuscript available",
        storyHref: `/stories/${completed.id}`,
      };
    }
    const dossier = storiesForBeat.find(isCitedDossier);
    return {
      name: beat?.name ?? "Research brief",
      statusText: dossier ? dossierStatusText(dossier) : progressText(cycle.status, cycle.currentStage),
      ...(dossier ? { storyHref: `/stories/${dossier.id}` } : {}),
    };
  }
  return undefined;
}

export function progressText(status: string, stage: string) {
  const stageLabel = stage.replaceAll("_", " ");
  if (status === "queued") return `Queued · next stage: ${stageLabel}`;
  if (status === "running") return `Running · current stage: ${stageLabel}`;
  if (status === "completed") return "Finished · no story passed the evidence gate yet";
  if (status === "failed") return `Needs attention · stopped during ${stageLabel}`;
  return `${status} · ${stageLabel}`;
}

function dossierStatusText(story: BriefStoryStatus) {
  if (story.scriptStatus === "generating") return "Dossier ready · story generation running";
  if (story.scriptStatus === "failed") return "Dossier ready · story generation needs attention";
  if (story.scriptStatus === "ready" && (story.scriptWordCount ?? 0) < PUBLISH_READY_MIN_WORDS) return "Dossier ready · story needs expansion to 2000 words";
  return "Dossier ready · story generation pending";
}
