// Anonyme Zählung: speichert pro Tag nur {Ereignisname: Anzahl}. Keine IP, keine Cookies.
import { getStore } from "@netlify/blobs";

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|whatsapp|telegram|curl|wget|python|monitor/i;
const OK = /^[a-z0-9][a-z0-9/_-]{0,79}$/;

export default async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const url = new URL(req.url);
  const origin = req.headers.get("origin");
  if (origin && origin !== url.origin) return new Response(null, { status: 403 });
  if (BOT.test(req.headers.get("user-agent") || "")) return new Response(null, { status: 204 });

  const evs = [...new Set(url.searchParams.getAll("e"))].filter((e) => OK.test(e)).slice(0, 5);
  if (!evs.length) return new Response(null, { status: 204 });

  const day = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" }); // YYYY-MM-DD
  const key = "d/" + day;
  const store = getStore({ name: "stats", consistency: "strong" });

  for (let i = 0; i < 6; i++) {
    const cur = await store.getWithMetadata(key, { type: "json" });
    const data = cur && cur.data ? cur.data : {};
    if (Object.keys(data).length > 3000) break;
    for (const e of evs) data[e] = (data[e] || 0) + 1;
    const r = cur
      ? await store.setJSON(key, data, { onlyIfMatch: cur.etag })
      : await store.setJSON(key, data, { onlyIfNew: true });
    if (!r || r.modified !== false) break; // gespeichert (oder alte Bibliothek ohne Rückgabe)
  }
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
};

export const config = { path: "/api/hit" };
