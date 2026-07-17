import test from "node:test";
import assert from "node:assert/strict";
import { buildPublishReadyStory, storyScriptFromFields } from "../src/lib/research/publishable-story";

test("buildPublishReadyStory creates a manuscript with source labels and source list", () => {
  const manuscript = buildPublishReadyStory({
    title: "The Factory Inquest That Named the Boiler",
    hook: "The warning came before the blast, which is why the inquest could not treat the explosion as routine.",
    segments: [
      {
        heading: "Opening",
        narration: "Witness testimony put ignored boiler warnings at the center of the factory explosion story. That made the event more than an accident report: it became a question of who knew about the danger and who had power to respond.",
        sourceIds: ["loc:dayton-inquest", "invented-source"],
      },
      {
        heading: "Accountability",
        narration: "A later safety investigation added the second half of the narrative by documenting disputed inspections. The sources together turn the story toward accountability rather than spectacle.",
        sourceIds: ["source-row-2"],
      },
    ],
    closingLine: "The story is the warning before the blast and the fight over what that warning meant.",
    disclaimer: "Newspaper allegations should remain labeled as allegations unless independently corroborated.",
    refs: [
      {
        id: "source-row-1",
        archiveIdentifier: "loc:dayton-inquest",
        title: "Factory explosion inquest testimony",
        url: "https://www.loc.gov/item/dayton-inquest/",
        publicationDate: "1912",
      },
      {
        id: "source-row-2",
        archiveIdentifier: null,
        title: "Factory safety investigation",
        url: "https://archive.org/details/factory-safety",
        publicationDate: "1912",
      },
    ],
  });

  assert.equal(manuscript.title, "The Factory Inquest That Named the Boiler");
  assert.deepEqual(manuscript.body[0].citations, ["S1"]);
  assert.deepEqual(manuscript.body[1].citations, ["S1"]);
  assert.deepEqual(manuscript.body[2].citations, ["S2"]);
  assert.equal(manuscript.sources.length, 2);
  assert.match(manuscript.plainText, /\[S1\] Factory explosion inquest testimony/);
  assert.doesNotMatch(manuscript.plainText, /invented-source/);
  assert.ok(manuscript.wordCount > 60);
});

test("storyScriptFromFields returns undefined until a generated story exists", () => {
  assert.equal(storyScriptFromFields({ hook: null, segments: [] }), undefined);
  assert.deepEqual(storyScriptFromFields({
    hook: "A hook",
    segments: [{ heading: "Opening", narration: "Narration", sourceIds: ["s1"] }],
    closingLine: null,
    disclaimer: null,
  }), {
    hook: "A hook",
    segments: [{ heading: "Opening", narration: "Narration", sourceIds: ["s1"] }],
    closingLine: "",
    disclaimer: "",
  });
});
