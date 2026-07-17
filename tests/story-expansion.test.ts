import test from "node:test";
import assert from "node:assert/strict";
import { generateStoryScript, type StoryScriptModel, wordCount } from "../src/lib/research/story";
import { PUBLISH_READY_MIN_WORDS } from "../src/lib/research/story-length";
import type { StoryScriptInput } from "../src/lib/types";

const input: StoryScriptInput = {
  workingTitle: "The Factory Inquest That Named the Boiler",
  premise: "A 1912 factory explosion inquest exposed ignored boiler warnings and disputed inspections.",
  narrativeHook: "Who ignored the boiler warnings before the blast?",
  sources: [
    { id: "loc:dayton", title: "Inquest testimony", date: "1912", excerpt: "Witnesses described ignored warnings." },
    { id: "ia:report", title: "Safety investigation", date: "1912", excerpt: "The report documented disputed inspections." },
  ],
};

function words(n: number) {
  return Array.from({ length: n }, () => "boiler").join(" ");
}

function segment(narrationWords: number, sourceId = "loc:dayton") {
  return { heading: "Segment", narration: words(narrationWords), sourceIds: [sourceId] };
}

test("generateStoryScript expands a short draft until it clears the 2000-word target", async () => {
  let scriptCalls = 0;
  let expansionCalls = 0;
  const model: StoryScriptModel = async ({ schemaName }) => {
    if (schemaName === "story_script") {
      scriptCalls += 1;
      // ~6 short segments: well under 2000 words on the first pass.
      return {
        hook: "The warning came before the blast, and the inquest could not treat it as routine.",
        segments: Array.from({ length: 6 }, () => segment(120)),
        closingLine: "The published story is the warning before the blast and the fight over what it meant.",
        disclaimer: "Newspaper allegations remain labeled as allegations unless independently corroborated.",
      };
    }
    expansionCalls += 1;
    // Each expansion round appends more grounded segments.
    return { segments: Array.from({ length: 2 }, () => segment(200, expansionCalls % 2 === 0 ? "ia:report" : "loc:dayton")) };
  };

  const script = await generateStoryScript(input, model);

  assert.equal(scriptCalls, 1);
  assert.ok(expansionCalls >= 1, "expansion loop should run when the draft is short");
  assert.ok(wordCount(script) >= PUBLISH_READY_MIN_WORDS, `expected >= ${PUBLISH_READY_MIN_WORDS} words, got ${wordCount(script)}`);
  assert.ok(script.segments.some((s) => s.sourceIds.length > 0));
});

test("generateStoryScript skips expansion when the first draft is already long enough", async () => {
  let expansionCalls = 0;
  const model: StoryScriptModel = async ({ schemaName }) => {
    if (schemaName === "story_script") {
      return {
        hook: "The warning came before the blast, and the inquest could not treat it as routine.",
        segments: Array.from({ length: 8 }, () => segment(300)),
        closingLine: "The published story is the warning before the blast and the fight over what it meant.",
        disclaimer: "Newspaper allegations remain labeled as allegations unless independently corroborated.",
      };
    }
    expansionCalls += 1;
    return { segments: [segment(200)] };
  };

  const script = await generateStoryScript(input, model);
  assert.equal(expansionCalls, 0);
  assert.ok(wordCount(script) >= PUBLISH_READY_MIN_WORDS);
});

test("generateStoryScript drops invented citations from expansion segments", async () => {
  const model: StoryScriptModel = async ({ schemaName }) => {
    if (schemaName === "story_script") {
      return {
        hook: "The warning came before the blast, and the inquest could not treat it as routine.",
        segments: Array.from({ length: 6 }, () => segment(140)),
        closingLine: "The published story is the warning before the blast and the fight over what it meant.",
        disclaimer: "Newspaper allegations remain labeled as allegations unless independently corroborated.",
      };
    }
    return { segments: [{ heading: "Invented", narration: words(220), sourceIds: ["made-up-source", "ia:report"] }] };
  };

  const script = await generateStoryScript(input, model);
  const invented = script.segments.flatMap((s) => s.sourceIds).filter((id) => id === "made-up-source");
  assert.equal(invented.length, 0);
  assert.ok(script.segments.flatMap((s) => s.sourceIds).includes("ia:report"));
});

test("generateStoryScript refuses to run without saved sources", async () => {
  await assert.rejects(
    () => generateStoryScript({ ...input, sources: [] }, async () => ({ segments: [] })),
    /requires saved cited sources/,
  );
});
