import test from "node:test";
import assert from "node:assert/strict";
import { isCitedDossier, uniqueEditorialStories } from "../src/lib/research/display";

const cited = {
  confidenceScore: 100,
  researchCompleteness: 100,
  claimCitations: [{ claim: "Supported claim", sourceIds: ["loc:one"] }],
};

test("isCitedDossier hides archive containers and routine files from the story feed", () => {
  assert.equal(isCitedDossier({
    ...cited,
    workingTitle: "1913 October 31 Atlanta Georgian 43 Pages Georgia Pages",
    summary: "1913 October 31 Atlanta Georgian 43 Pages Georgia Pages around 1913-10-31T00:00:00Z",
  }), false);

  assert.equal(isCitedDossier({
    ...cited,
    workingTitle: "CIA Reading Room Cia-rdp90g01353r002000020005-7: ARRANGEMENTS FOR ADDRESS",
    summary: "Routine retirement dinner arrangements.",
  }), false);

  assert.equal(isCitedDossier({
    ...cited,
    workingTitle: "The Literatures Of Colonial America : An Anthology",
    summary: "The literatures of colonial America : an anthology around 2001-01-01T00:00:00Z",
  }), false);
});

test("isCitedDossier keeps story-like historical leads", () => {
  assert.equal(isCitedDossier({
    ...cited,
    workingTitle: "The Mather Mine Disaster",
    summary: "The Mather mine disaster in Pennsylvania around 1928.",
    premise: "A mine disaster, testimony, and warnings before the collapse.",
  }), true);
});

test("uniqueEditorialStories deduplicates repeated story titles", () => {
  const stories = uniqueEditorialStories([
    { workingTitle: "The Mather Mine Disaster", summary: "First" },
    { workingTitle: "Mather Mine Disaster", summary: "Second" },
    { workingTitle: "Factory Explosion Inquest", summary: "Third" },
  ]);

  assert.deepEqual(stories.map((story) => story.summary), ["First", "Third"]);
});
