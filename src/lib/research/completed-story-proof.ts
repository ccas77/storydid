import { buildPublishReadyStory } from "./publishable-story";
import { PUBLISH_READY_MIN_WORDS } from "./story-length";

const refs = [
  {
    id: "loc:dayton-explosion-inquest",
    archiveIdentifier: "loc:dayton-explosion-inquest",
    title: "Factory explosion inquest testimony names preventable boiler failures",
    url: "https://www.loc.gov/item/dayton-explosion-inquest/",
    publicationDate: "1912",
  },
  {
    id: "internet_archive:factorysafetyreport1912",
    archiveIdentifier: "internet_archive:factorysafetyreport1912",
    title: "Factory safety investigation after Dayton explosion",
    url: "https://archive.org/details/factorysafetyreport1912",
    publicationDate: "1912",
  },
];

const segments = [
  {
    heading: "The Warning",
    sourceIds: ["loc:dayton-explosion-inquest"],
    narration: paragraphs([
      "The story begins before the explosion, in the uneasy space between warning and disaster. Witnesses at the inquest described a factory where the boiler was not simply a background machine but a known source of anxiety. Men who worked near it understood its noises, its pressure, and the difference between ordinary trouble and a warning that should have stopped the day. Their testimony turned the opening of the story away from spectacle and toward knowledge: what was known, who heard it, and why the warning did not become action.",
      "That question gives the investigation its spine. A boiler failure can be written as an accident in a single sentence, but the inquest testimony made it harder to leave the event there. The surviving record suggests a workplace where danger had been noticed before the blast, where routine may have dulled urgency, and where people with the least power were closest to the risk. The warning mattered because it placed responsibility in time. It said the disaster was not only the moment of rupture, but also the hours and decisions that came before it.",
      "A full treatment lingers on that interval because it is where the audience can feel the story becoming morally legible. The men near the machinery did not need a later report to know that the boiler mattered; they needed the warning to travel upward with urgency. The tragedy is that industrial danger often moved through channels designed to slow it down: a complaint became a note, a note became a judgment call, and a judgment call became another hour of work. By the time the record preserved the warning, it had already become a question that could no longer save anyone.",
      "That is the human opening: not an explosion, but a warning trying to become action. It lets the story begin with workers reading the signs around them, not with officials explaining the aftermath. It also gives the audience a fair standard for everything that follows. If the evidence later shows confusion, the story can say so. If it shows neglect, the story can say that too. The point is to keep the warning in view long enough for responsibility to emerge from the record rather than from accusation alone.",
    ]),
  },
  {
    heading: "The Blast",
    sourceIds: ["loc:dayton-explosion-inquest"],
    narration: paragraphs([
      "When the explosion came, it rearranged the factory in an instant. The testimony that survived did not need theatrical language to communicate terror. It described workers thrown from the ordinary rhythm of the day into smoke, splintered material, and confusion. The force of the blast mattered, but the more important narrative fact was what it exposed. A machine that had been treated as manageable became the center of a public record, and the private knowledge of workers became evidence that officials could no longer ignore.",
      "The blast also changed who had the authority to tell the story. Beforehand, warnings could be minimized, delayed, or absorbed into the habits of production. Afterward, the inquest created a formal setting where those warnings had to be spoken aloud. Survivors and witnesses were no longer merely employees inside a factory system; they became narrators of risk. Their accounts forced a wider audience to ask whether the explosion had been unforeseeable, or whether the disaster had been waiting in plain sight while production continued around it.",
      "The story should handle the blast with restraint because the explosion is not the whole point. It is the turn that makes everything before it newly important. In a weaker version, the scene would be all noise and wreckage. In the stronger version, the blast is the moment when hidden knowledge becomes public evidence. The audience should understand the physical violence, but also the administrative shock: people who had tolerated uncertainty now had to explain it under scrutiny.",
      "That shift gives the middle of the story its momentum. Every detail after the blast points backward. Witnesses remember what they heard. Investigators ask what inspectors saw. Managers and officials become part of a chain rather than distant observers. The explosion did not create those relationships; it revealed them. A 2000-word story has enough room to show that revelation patiently, letting the reader move from the factory floor to the public record without losing the people whose testimony gave the case its urgency.",
    ]),
  },
  {
    heading: "The Inquest",
    sourceIds: ["loc:dayton-explosion-inquest", "internet_archive:factorysafetyreport1912"],
    narration: paragraphs([
      "The inquest is where the story becomes more than a disaster account. It gathered statements, compared memories, and turned scattered warnings into a sequence. That sequence is the reason the case has narrative force. The record did not merely ask what exploded. It asked how a warning moved, or failed to move, through a workplace hierarchy. It asked whether the people who heard the danger had the power to stop the machinery, and whether the people with authority had listened closely enough to those below them.",
      "The investigation report gives the inquest a second foundation. Where testimony preserved voices and immediate memory, the later safety record added institutional shape: inspections, disputed judgments, and the technical language of preventable failure. The two kinds of evidence are stronger together than either one alone. One shows what people said they experienced; the other shows how the event was studied after the fact. Together they make the central question harder to dismiss: did the factory treat a warning as an inconvenience until it became evidence?",
      "This is also where the story earns its citations. The inquest supplies claim-level evidence for what witnesses said, while the investigation supplies a separate source base for how the disaster was interpreted. The script should not collapse those two kinds of proof into one. When a worker said a warning was ignored, that is testimony. When an investigation described inspection disputes, that is a second kind of record. The finished story becomes stronger when it names those differences instead of pretending all evidence has the same weight.",
      "That distinction is what turns the inquest from paperwork into drama. Each source changes what the audience is allowed to believe. A single newspaper account might support a careful allegation. A corroborating investigation can raise confidence about the broader pattern. The writing should make that movement visible: first the voice of a witness, then the structure of a report, then the unresolved question between them. The result is not a pile of links. It is a story whose claims can be followed back to the records that made them possible.",
    ]),
  },
  {
    heading: "The Fight Over Responsibility",
    sourceIds: ["internet_archive:factorysafetyreport1912"],
    narration: paragraphs([
      "Responsibility in this story does not arrive as a single confession. It appears through conflict: testimony against routine, inspection against production, memory against the simpler language of accident. The safety investigation documented disputed inspections after the disaster, which matters because an inspection is supposed to convert danger into action. If the inspection system failed, the story is not only about one boiler. It is about a chain of trust between workers, supervisors, inspectors, and the public institutions that claimed to make industrial work safe.",
      "That is why the strongest version of the story should resist easy villains while still preserving accountability. The evidence supports a narrative about preventable risk, but it also requires careful language. Newspaper testimony should remain testimony, allegations should remain allegations, and the script should distinguish between what the witnesses said and what the investigation independently supported. The drama is not weakened by that caution. It is sharpened, because the audience can see the difference between rumor, memory, official record, and corroborated fact.",
      "The conflict over responsibility should unfold as a contest over interpretation. One side of the story can treat the explosion as the kind of catastrophe that factories sometimes suffered. The other side can point to warnings, inspection disputes, and the people who said danger had been visible before the blast. The writer does not need to invent a courtroom confrontation to make this compelling. The record already contains the clash: accident versus preventable failure, routine versus warning, authority versus testimony.",
      "By this point, the audience should understand why the story matters beyond one workplace. Industrial disasters are often remembered for their casualties and forgotten in their mechanisms. This case asks the more useful historical question: how does a system respond when the people closest to danger say something is wrong? A publish-ready script should let that question breathe. It should show how responsibility can be dispersed across habits, inspections, assumptions, and delays, while still refusing to let dispersion become an excuse.",
    ]),
  },
  {
    heading: "Why It Was Overlooked",
    sourceIds: ["loc:dayton-explosion-inquest", "internet_archive:factorysafetyreport1912"],
    narration: paragraphs([
      "The case is easy to overlook because it does not announce itself as a national scandal. It sits in local testimony and technical aftermath, the kinds of records that often look small until someone reads them together. A title about an inquest can sound procedural. A safety report can sound dry. But the combination contains a human story with pressure, fear, institutional failure, and a public struggle over what counted as proof. The overlooked quality is not a weakness; it is the reason StoryDid exists.",
      "A publish-ready telling should end by returning to the warning. The most haunting fact is not simply that a factory exploded, but that people later said the danger had spoken first. The inquest preserved that claim, and the investigation gave it structure. What remains is a story about the distance between hearing danger and acting on it. In that distance, workers lived, officials judged, machines ran, and history left behind enough evidence to ask whether the blast was truly sudden or only suddenly undeniable.",
      "That ending also clarifies what the app is supposed to produce. The user should not be handed a stack of archive links and asked to assemble meaning from them. The finished output should already have made the editorial judgment: this is the premise, this is the evidence, this is the tension, and this is where caution remains necessary. The sources still matter, but they serve the story rather than replacing it. Citations become supports under the floor, not furniture scattered across the room.",
      "For a completed StoryDid result, the final page should therefore read as a manuscript first and a dossier second. The reader should encounter a hook, a sequence, an argument about consequence, and a closing line that earns its confidence from the cited evidence. Then, if they want to inspect the work, the source list should be waiting underneath each claim. That is the standard this proof fixture enforces: a long-form story with citations throughout, visible source labels, and enough narrative substance to be ready for editorial review.",
    ]),
  },
];

export function completedStoryProofManuscript() {
  return buildPublishReadyStory({
    title: "The Factory Inquest That Named the Boiler",
    hook: "Before the factory exploded, the warning was already there. The story is what happened between hearing danger and admitting it.",
    segments,
    closingLine: "The finished story is the warning before the blast and the public fight over whether that warning should have saved lives.",
    disclaimer: "This proof fixture demonstrates rendering and citation behavior; a production story must be generated from saved archive sources and reviewed against its dossier.",
    refs,
  });
}

export function completedStoryProofIsPublishReady() {
  return completedStoryProofManuscript().wordCount >= PUBLISH_READY_MIN_WORDS;
}

function paragraphs(values: string[]) {
  return values.join(" ");
}
