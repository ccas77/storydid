import test from "node:test";
import assert from "node:assert/strict";
import { completedStoryProofIsPublishReady, completedStoryProofManuscript } from "../src/lib/research/completed-story-proof";
import { PUBLISH_READY_MIN_WORDS } from "../src/lib/research/story-length";

test("completed story proof fixture renders a publish-ready cited manuscript", () => {
  const manuscript = completedStoryProofManuscript();

  assert.equal(completedStoryProofIsPublishReady(), true);
  assert.ok(manuscript.wordCount >= PUBLISH_READY_MIN_WORDS);
  assert.match(manuscript.plainText, /The Factory Inquest That Named the Boiler/);
  assert.match(manuscript.plainText, /\[S1\]/);
  assert.match(manuscript.plainText, /\[S2\]/);
  assert.equal(manuscript.sources.length, 2);
});
