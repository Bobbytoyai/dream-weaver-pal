// Cloud integration tests for Bobby.
// Run: SUPABASE_ANON_KEY=... bun test tests/cloud-integration.test.ts
//
// These hit the deployed cloud — DO NOT run against prod without coordination.

import { describe, expect, test } from "vitest";

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? "zvvyuxgqbuooifowjcqc";
const BASE = `https://${PROJECT_REF}.supabase.co/functions/v1`;
const KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

const skip = !KEY;
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${KEY}`,
};

async function postJson(path: string, body: unknown) {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return { status: r.status, body: (await r.json()) as Record<string, unknown> };
}

async function getJson(path: string) {
  const r = await fetch(`${BASE}${path}`, { headers });
  return { status: r.status, body: (await r.json()) as Record<string, unknown> };
}

describe.skipIf(skip)("Cloud /_health", () => {
  test("returns status field", async () => {
    const { status, body } = await getJson("/_health");
    expect([200, 503]).toContain(status);
    expect(["ok", "degraded"]).toContain(body.status);
  });

  test("reports env_present for known vars", async () => {
    const { body } = await getJson("/_health");
    const env = body.env_present as Record<string, unknown>;
    expect(env).toHaveProperty("SUPABASE_URL");
    expect(env).toHaveProperty("SUPABASE_SERVICE_ROLE_KEY");
  });
});

describe.skipIf(skip)("Cloud /safety", () => {
  test("neutral text → level 0", async () => {
    const { status, body } = await postJson("/safety", { text: "bonjour", lang: "fr" });
    expect(status).toBe(200);
    expect(body.level).toBeLessThanOrEqual(1);
  });

  test("empty text → level 0 short-circuit", async () => {
    const { body } = await postJson("/safety", { text: "", lang: "fr" });
    expect(body.level).toBe(0);
    expect(body.reason).toBe("empty_or_short");
  });

  test("too-long text → 413", async () => {
    const long = "a".repeat(6000);
    const { status } = await postJson("/safety", { text: long });
    expect(status).toBe(413);
  });
});

describe.skipIf(skip)("Cloud /bobby-brain", () => {
  test("returns reply for a greeting", async () => {
    const { status, body } = await postJson("/bobby-brain", {
      messages: [{ role: "user", content: "salut" }],
      childAge: 7,
      userId: "00000000-0000-0000-0000-000000000001",
    });
    expect(status).toBe(200);
    expect(body).toHaveProperty("reply");
    expect(typeof body.reply).toBe("string");
  });

  test("400 on invalid payload (no messages)", async () => {
    const { status } = await postJson("/bobby-brain", {});
    expect(status).toBe(400);
  });
});
