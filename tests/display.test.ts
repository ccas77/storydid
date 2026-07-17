import test from "node:test";
import assert from "node:assert/strict";
import { isCitedDossier, uniqueEditorialStories } from "../src/lib/research/display";

const cited = {
  confidenceScore: 100,
  researchCompleteness: 100,
  storyText: [
    "Before dawn, the factory floor had already become a place of warnings. Witnesses later described a boiler system that had been treated as a nuisance rather than a threat, and the inquest turned that ignored danger into the center of the story.",
    "The explosion did not read like an unavoidable accident in the surviving evidence. Testimony tied the disaster to warnings, disputed inspections, and decisions made before anyone outside the building understood how close the danger had come.",
    "That is why the inquest matters. It put survivors, inspectors, and factory leadership into conflict over what had been known, who had acted, and whether the official account could survive the record left behind.",
    "The story is still bounded by the archive, but it has a narrative spine: warnings before the blast, testimony after it, and a public fight over responsibility for the deaths and damage that followed.",
  ].join("\n\n"),
  claimCitations: [
    { claim: "Witness testimony said ignored boiler warnings preceded the factory explosion and shaped the inquest.", sourceIds: ["loc:one"] },
    { claim: "A second report documented disputed safety inspections after the disaster and identified accountability questions.", sourceIds: ["ia:two"] },
  ],
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

test("isCitedDossier rejects placeholder disaster dossiers without a written story", () => {
  assert.equal(isCitedDossier({
    confidenceScore: 100,
    researchCompleteness: 100,
    claimCitations: [
      { claim: "The Mather mine disaster in pennsylvania, mather around 1928", sourceIds: ["loc:mather"] },
      { claim: "The Mather Mine Disaster has sufficient source depth for editorial development.", sourceIds: ["loc:mather"] },
    ],
    storyText: "What exactly happened in The Mather mine disaster? That is the story lead StoryDid found behind The Mather Mine Disaster.",
    workingTitle: "The Mather Mine Disaster",
    summary: "The Mather mine disaster in Pennsylvania around 1928.",
    premise: "A mine disaster, testimony, and warnings before the collapse.",
    keyFacts: [
      "The Mather mine disaster in pennsylvania, mather around 1928",
      "The Mather Mine Disaster has sufficient source depth for editorial development.",
    ],
  }), false);
});

test("isCitedDossier rejects developed evidence without a finished story text", () => {
  assert.equal(isCitedDossier({
    ...cited,
    storyText: null,
    workingTitle: "The Factory Explosion Inquest",
    summary: "A factory explosion inquest exposed ignored boiler warnings and a dispute over safety inspections.",
    premise: "A factory disaster, witness testimony, and disputed inspections raised accountability questions.",
    keyFacts: [
      "Witness testimony said ignored boiler warnings preceded the factory explosion and shaped the inquest.",
      "A second report documented disputed safety inspections after the disaster and identified accountability questions.",
      "The surviving accounts give the story a conflict between official safety claims and what witnesses said happened.",
    ],
  }), false);
});

test("isCitedDossier keeps developed story-like historical leads", () => {
  assert.equal(isCitedDossier({
    ...cited,
    workingTitle: "The Factory Explosion Inquest",
    summary: "A factory explosion inquest exposed ignored boiler warnings and a dispute over safety inspections.",
    premise: "A factory disaster, witness testimony, and disputed inspections raised accountability questions.",
    keyFacts: [
      "Witness testimony said ignored boiler warnings preceded the factory explosion and shaped the inquest.",
      "A second report documented disputed safety inspections after the disaster and identified accountability questions.",
      "The surviving accounts give the story a conflict between official safety claims and what witnesses said happened.",
    ],
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
