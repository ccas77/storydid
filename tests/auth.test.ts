import test from "node:test";
import assert from "node:assert/strict";
import { isAuthorizedResearchRequest } from "../src/lib/auth";

test("isAuthorizedResearchRequest accepts cron bearer secret", () => {
  process.env.CRON_SECRET = "cron-secret";

  const request = new Request("https://storydid.test/api/research/run", {
    headers: { authorization: "Bearer cron-secret" },
  });

  assert.equal(isAuthorizedResearchRequest(request), true);
});

test("isAuthorizedResearchRequest rejects former owner access header", () => {
  process.env.CRON_SECRET = "cron-secret";

  const request = new Request("https://storydid.test/api/research/run", {
    headers: { "x-research-access-code": "owner-code" },
  });

  assert.equal(isAuthorizedResearchRequest(request), false);
});

test("isAuthorizedResearchRequest rejects missing credentials", () => {
  process.env.CRON_SECRET = "cron-secret";

  const request = new Request("https://storydid.test/api/research/run");

  assert.equal(isAuthorizedResearchRequest(request), false);
});
