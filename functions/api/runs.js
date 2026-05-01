import { entriesPayload, json, rankFor, readJson, sanitizeName } from "../_lib/util.js";

export const onRequestPost = async ({ request, env }) => {
  const body = await readJson(request);
  const name = sanitizeName(body?.name);
  const score = Math.max(0, Math.floor(Number(body?.score)) || 0);
  const flies = Math.max(0, Math.floor(Number(body?.flies)) || 0);
  if (!name) return json({ error: "invalid_name" }, 400);

  const row = await env.DB
    .prepare("SELECT name, score, flies FROM players WHERE name = ? COLLATE NOCASE")
    .bind(name)
    .first();
  if (!row) return json({ error: "name_not_claimed" }, 404);

  const better = score > row.score || (score === row.score && flies > row.flies);
  if (better) {
    await env.DB
      .prepare(
        "UPDATE players SET score = ?, flies = ?, ts = ? WHERE name = ? COLLATE NOCASE",
      )
      .bind(score, flies, Date.now(), name)
      .run();
  }

  return json({
    rank: await rankFor(env.DB, name),
    entries: await entriesPayload(env.DB),
  });
};
