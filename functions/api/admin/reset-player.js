import { isAdminAuthorized } from "../../_lib/admin.js";
import { json, readJson, sanitizeName } from "../../_lib/util.js";

export const onRequestPost = async ({ request, env }) => {
  const body = await readJson(request);
  if (!isAdminAuthorized(env, body)) return json({ error: "forbidden" }, 403);
  const target = sanitizeName(body?.target);
  if (!target) return json({ error: "invalid_target" }, 400);
  // Zero the player's score in place rather than DELETE so the name claim
  // survives and the next /api/runs submit still finds the row.
  const result = await env.DB
    .prepare(
      "UPDATE players SET score = 0, flies = 0, ts = ? WHERE name = ? COLLATE NOCASE",
    )
    .bind(Date.now(), target)
    .run();
  return json({ ok: true, reset: result.meta?.changes ?? 0 });
};
