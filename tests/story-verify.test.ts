import test from "node:test";
import assert from "node:assert/strict";
import { verifyStoryScript, wordCount } from "../src/lib/research/story";
import type { StoryScriptModel } from "../src/lib/research/story";
import type { StoryScript as Script } from "../src/lib/types";

function words(n: number) {
  return Array.from({ length: n }, () => "history").join(" ");
}

const valid = new Set(["loc:a", "ia:b"]);

const original: Script = {
  hook: "The scandal began quietly, long before anyone thought to call it a scandal at all.",
  segments: Array.from({ length: 8 }, (_, i) => ({ heading: `Original ${i}`, narration: words(210), sourceIds: [i % 2 === 0 ? "loc:a" : "ia:b"] })),
  closingLine: "What remained afterward was a changed sense of what the public would tolerate.",
  disclaimer: "Some contested details are described in general terms.",
};

test("verifyStoryScript keeps a valid corrected draft", async () => {
  const model: StoryScriptModel = async () => ({
    hook: original.hook,
    segments: Array.from({ length: 8 }, (_, i) => ({ heading: `Corrected ${i}`, narration: words(205), sourceIds: [i % 2 === 0 ? "loc:a" : "ia:b"] })),
    closingLine: original.closingLine,
    disclaimer: original.disclaimer,
  });

  const result = await verifyStoryScript(original, "Some Scandal", valid, model);
  assert.ok(result.segments[0].heading.startsWith("Corrected"));
  assert.ok(result.segments.every((s) => s.sourceIds.length > 0));
  assert.ok(wordCount(result) >= 1500);
});

test("verifyStoryScript reattaches citations the review pass dropped", async () => {
  const model: StoryScriptModel = async () => ({
    hook: original.hook,
    segments: Array.from({ length: 8 }, (_, i) => ({ heading: `Corrected ${i}`, narration: words(205), sourceIds: [] })),
    closingLine: original.closingLine,
    disclaimer: original.disclaimer,
  });

  const result = await verifyStoryScript(original, "Some Scandal", valid, model);
  assert.ok(result.segments[0].heading.startsWith("Corrected"));
  assert.ok(result.segments.some((s) => s.sourceIds.length > 0), "citations carried over from the original");
});

test("verifyStoryScript falls back to the draft when the correction is too short", async () => {
  const model: StoryScriptModel = async () => ({
    hook: original.hook,
    segments: [{ heading: "Too short", narration: words(30), sourceIds: ["loc:a"] }],
    closingLine: original.closingLine,
    disclaimer: original.disclaimer,
  });

  const result = await verifyStoryScript(original, "Some Scandal", valid, model);
  assert.equal(result.segments[0].heading, "Original 0");
});

test("verifyStoryScript falls back to the draft when the review call fails", async () => {
  const model: StoryScriptModel = async () => { throw new Error("model down"); };
  const result = await verifyStoryScript(original, "Some Scandal", valid, model);
  assert.equal(result, original);
});
