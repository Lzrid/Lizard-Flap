export const NAME_RE = /^[A-Za-z0-9 _-]+$/;
export const MAX_NAME = 14;
export const MAX_PLAYERS = 500;

export function sanitizeName(raw) {
  if (typeof raw !== "string") return null;
  const s = raw.replace(/\s+/g, " ").trim();
  if (s.length === 0 || s.length > MAX_NAME) return null;
  if (!NAME_RE.test(s)) return null;
  return s;
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function entriesPayload(db) {
  const { results } = await db
    .prepare(
      `SELECT name, score, flies, ts
         FROM players
         WHERE score > 0 OR flies > 0
         ORDER BY score DESC, flies DESC, ts ASC
         LIMIT ?`,
    )
    .bind(MAX_PLAYERS)
    .all();
  return results ?? [];
}

export async function rankFor(db, name) {
  const list = await entriesPayload(db);
  const lower = name.toLowerCase();
  const idx = list.findIndex((e) => e.name.toLowerCase() === lower);
  return idx >= 0 ? idx + 1 : null;
}
