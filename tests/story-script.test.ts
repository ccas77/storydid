import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeStoryScript, wordCount } from "../src/lib/research/story";

test("sanitizeStoryScript strips invented source ids", () => {
  const cleaned = sanitizeStoryScript({
    hook: " A verified cold open with extra whitespace. ",
    segments: [{
      heading: "Opening",
      narration: " The first sourced segment keeps the real citation and removes the invented one. ",
      sourceIds: ["real-source", "fake-source", "real-source"],
    }],
    closingLine: " A grounded closing line. ",
    disclaimer: " Evidence disclaimer for the surviving record. ",
  }, new Set(["real-source"]));

  assert.equal(cleaned.hook, "A verified cold open with extra whitespace.");
  assert.deepEqual(cleaned.segments[0].sourceIds, ["real-source"]);
  assert.equal(cleaned.segments[0].narration, "The first sourced segment keeps the real citation and removes the invented one.");
});

test("wordCount includes hook, segments, closing line, and disclaimer", () => {
  const count = wordCount({
    hook: "one two",
    segments: [
      { heading: "A", narration: "three four five", sourceIds: ["a"] },
      { heading: "B", narration: "six", sourceIds: ["b"] },
    ],
    closingLine: "seven eight",
    disclaimer: "nine",
  });

  assert.equal(count, 9);
});
