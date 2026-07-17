import type { StoryScript, StoryScriptSegment } from "@/lib/types";

export type PublishSourceRef = {
  id: string;
  archiveIdentifier: string | null;
  title: string;
  url: string;
  publicationDate?: string | null;
};

export type PublishReadyStory = {
  title: string;
  body: PublishReadyStoryBlock[];
  sources: Array<{ label: string; title: string; url: string; publicationDate?: string | null }>;
  plainText: string;
  wordCount: number;
};

export type PublishReadyStoryBlock = { kind: "hook" | "segment" | "closing" | "note"; heading?: string; text: string; citations: string[] };

export function buildPublishReadyStory(input: {
  title: string;
  hook: string;
  segments: StoryScriptSegment[];
  closingLine?: string | null;
  disclaimer?: string | null;
  refs: PublishSourceRef[];
}): PublishReadyStory {
  const sourceLabels = sourceLabelMap(input.refs);
  const body: PublishReadyStoryBlock[] = [
    {
      kind: "hook" as const,
      text: clean(input.hook),
      citations: citationsFor(input.segments[0]?.sourceIds ?? [], sourceLabels),
    },
    ...input.segments.map((segment) => ({
      kind: "segment" as const,
      heading: clean(segment.heading),
      text: clean(segment.narration),
      citations: citationsFor(segment.sourceIds, sourceLabels),
    })),
    ...(input.closingLine ? [{
      kind: "closing" as const,
      text: clean(input.closingLine),
      citations: citationsFor(input.segments.at(-1)?.sourceIds ?? [], sourceLabels),
    }] : []),
    ...(input.disclaimer ? [{
      kind: "note" as const,
      text: clean(input.disclaimer),
      citations: [] as string[],
    }] : []),
  ].filter((item) => item.text);
  const usedLabels = new Set(body.flatMap((item) => item.citations));
  const sources = input.refs.map((ref, index) => ({
    label: `S${index + 1}`,
    title: ref.title,
    url: ref.url,
    publicationDate: ref.publicationDate,
  })).filter((source) => usedLabels.has(source.label));
  const plainText = [
    input.title,
    ...body.map((item) => `${item.heading ? `${item.heading}\n` : ""}${item.text}${item.citations.length ? ` ${item.citations.map((label) => `[${label}]`).join(" ")}` : ""}`),
    sources.length ? `Sources\n${sources.map((source) => `[${source.label}] ${source.title}${source.publicationDate ? `, ${source.publicationDate}` : ""} ${source.url}`).join("\n")}` : "",
  ].filter(Boolean).join("\n\n");

  return {
    title: input.title,
    body,
    sources,
    plainText,
    wordCount: plainText.split(/\s+/).filter(Boolean).length,
  };
}

export function storyScriptFromFields(input: {
  hook?: string | null;
  segments: StoryScriptSegment[];
  closingLine?: string | null;
  disclaimer?: string | null;
}): StoryScript | undefined {
  if (!input.hook || input.segments.length === 0) return undefined;
  return {
    hook: input.hook,
    segments: input.segments,
    closingLine: input.closingLine ?? "",
    disclaimer: input.disclaimer ?? "",
  };
}

function citationsFor(sourceIds: string[], sourceLabels: Map<string, string>) {
  return Array.from(new Set(sourceIds.flatMap((sourceId) => sourceLabels.get(sourceId) ?? sourceLabels.get(stripSourcePrefix(sourceId)) ?? [])));
}

function sourceLabelMap(refs: PublishSourceRef[]) {
  const labels = new Map<string, string>();
  refs.forEach((ref, index) => {
    const label = `S${index + 1}`;
    labels.set(ref.id, label);
    if (ref.archiveIdentifier) {
      labels.set(ref.archiveIdentifier, label);
      labels.set(stripSourcePrefix(ref.archiveIdentifier), label);
    }
  });
  return labels;
}

function stripSourcePrefix(sourceId: string) {
  return sourceId.replace(/^(loc|internet_archive):/, "");
}

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}
