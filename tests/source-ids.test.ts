import test from "node:test";
import assert from "node:assert/strict";
import { archiveLookupIds, stripSourcePrefix } from "../src/lib/research/source-ids";

test("archiveLookupIds supports prefixed and raw archive identifiers", () => {
  assert.equal(stripSourcePrefix("loc:dayton-explosion-inquest"), "dayton-explosion-inquest");
  assert.deepEqual(
    archiveLookupIds(["loc:dayton-explosion-inquest", "factorysafetyreport1912"]),
    ["loc:dayton-explosion-inquest", "dayton-explosion-inquest", "factorysafetyreport1912"]
  );
});
