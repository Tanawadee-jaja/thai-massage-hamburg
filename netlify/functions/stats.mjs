import { getStore } from "@netlify/blobs";
import { createHash, timingSafeEqual } from "node:crypto";
const HASH = "384ac83744751486aa99695c5d54c8124f24e6fa733ad13c05cf616abdb4a58b";
const sha = (s) => createHash("sha256").update(s).digest();
export default async (req) => {
  const url = new URL(req.url);
  const want = Buffer.from(process.env.STATS_HASH || HASH, "hex");
  const got = sha(req.headers.get("x-stats-key") || "");
  if (want.length !== got.length || !timingSafeEqual(want, got)) {
    await new Promise((r) => setTimeout(r, 800));
    return Response.json({ error: "key" }, { status: 401, headers: { "cache-control": "no-store" } });
  }
  const from = url.searchParams.get("from") || "0000-00-00";
  const to = url.searchParams.get("to") || "9999-99-99";
  const store = getStore({ name: "stats", consistency: "strong" });
  const { blobs } = await store.list({ prefix: "d/" });
  const days = {};
  await Promise.all(blobs.map((b) => b.key.slice(2)).filter((d) => d >= from && d <= to)
    .map(async (d) => { days[d] = (await store.get("d/" + d, { type: "json" })) || {}; }));
  return Response.json({ days }, { headers: { "cache-control": "no-store" } });
};
export const config = { path: "/api/stats" };
