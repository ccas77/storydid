import test from "node:test";
import assert from "node:assert/strict";
import { latestBriefProgress, progressText, type BriefStoryStatus } from "../src/lib/research/status";

const storyText = [
  "Before dawn, the factory floor had already become a place of warnings. Witnesses later described a boiler system that had been treated as a nuisance rather than a threat, and the inquest turned that ignored danger into the center of the story.",
  "The explosion did not read like an unavoidable accident in the surviving evidence. Testimony tied the disaster to warnings, disputed inspections, and decisions made before anyone outside the building understood how close the danger had come.",
  "That is why the inquest matters. It put survivors, inspectors, and factory leadership into conflict over what had been known, who had acted, and whether the official account could survive the record left behind.",
  "The story is still bounded by the archive, but it has a narrative spine: warnings before the blast, testimony after it, and a public fight over responsibility for the deaths and damage that followed.",
].join("\n\n");

const baseStory: BriefStoryStatus = {
  id: "story-dossier",
  beatId: "beat-brief",
  workingTitle: "The Factory Explosion Inquest",
  summary: "A factory explosion inquest exposed ignored boiler warnings and a dispute over safety inspections.",
  premise: "A factory disaster, witness testimony, and disputed inspections raised accountability questions.",
  confidenceScore: 90,
  researchCompleteness: 92,
  storyText,
  claimCitations: [
    {
      claim: "Witness testimony said ignored boiler warnings preceded the factory explosion and shaped the disaster inquest.",
      sourceIds: ["loc:one"],
    },
    {
      claim: "A second report documented disputed safety inspections after the disaster and identified accountability conflict.",
      sourceIds: ["ia:two"],
    },
  ],
  keyFacts: [
    "Witness testimony said ignored boiler warnings preceded the factory explosion and shaped the disaster inquest.",
    "A second report documented disputed safety inspections after the disaster and identified accountability conflict.",
    "The surviving accounts frame a conflict between official safety claims and what witnesses said happened.",
  ],
  chronology: [
    { date: "1913", event: "Ignored boiler warnings preceded the factory explosion and later shaped the inquest." },
    { date: "1913", event: "Witness testimony and disputed inspections created a public fight over responsibility." },
  ],
  scriptStatus: "none",
  scriptHook: null,
  scriptSegments: [],
};

const beats = [
  {
    id: "beat-brief",
    name: "Factory explosion brief",
    description: "User research brief: factory explosion warnings",
  },
];

const cycles = [
  {
    beatId: "beat-brief",
    status: "running",
    currentStage: "deep_research",
    stageState: { source: "user_brief" },
    createdAt: new Date("2026-07-17T10:00:00Z"),
  },
];

test("progressText reports queued and running cycle stages plainly", () => {
  assert.equal(progressText("queued", "candidate_funnel"), "Queued · next stage: candidate funnel");
  assert.equal(progressText("running", "deep_research"), "Running · current stage: deep research");
});

test("latestBriefProgress links a completed generated story", () => {
  const status = latestBriefProgress(cycles, beats, [
    {
      ...baseStory,
      id: "story-ready",
      scriptStatus: "ready",
      scriptHook: "The warning came before the blast, and that is what made the inquest impossible to ignore.",
      scriptSegments: [
        {
          heading: "Cold open",
          narration: "The factory explosion story begins before the explosion itself, with boiler warnings that witnesses later described as ignored. Those warnings gave the inquest its dramatic question: whether the danger was known before the blast and whether anyone had the power to stop it.",
          sourceIds: ["loc:one"],
        },
      ],
    },
  ]);

  assert.deepEqual(status, {
    name: "Factory explosion brief",
    statusText: "Story ready · publish-ready manuscript available",
    storyHref: "/stories/story-ready",
  });
});

test("latestBriefProgress links a cited dossier while story generation is pending", () => {
  const status = latestBriefProgress(cycles, beats, [baseStory]);

  assert.deepEqual(status, {
    name: "Factory explosion brief",
    statusText: "Dossier ready · story generation pending",
    storyHref: "/stories/story-dossier",
  });
});

test("latestBriefProgress tells the user when story generation failed for a dossier", () => {
  const status = latestBriefProgress(cycles, beats, [{ ...baseStory, scriptStatus: "failed" }]);

  assert.deepEqual(status, {
    name: "Factory explosion brief",
    statusText: "Dossier ready · story generation needs attention",
    storyHref: "/stories/story-dossier",
  });
});

test("latestBriefProgress falls back to cycle progress when there is no story yet", () => {
  const status = latestBriefProgress(cycles, beats, []);

  assert.deepEqual(status, {
    name: "Factory explosion brief",
    statusText: "Running · current stage: deep research",
  });
});
