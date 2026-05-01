import { isAdminAuthorized } from "../../_lib/admin.js";
import { json, readJson, sanitizeName } from "../../_lib/util.js";

export const onRequestPost = async ({ request, env }) => {
  const body = await readJson(request);
  if (!isAdminAuthorized(env, body)) return json({ error: "forbidden" }, 403);
  const target = sanitizeName(body?.target);
  if (!target) return json({ error: "invalid_target" }, 400);
  const result = await env.DB
    .prepare("DELETE FROM players WHERE name = ? COLLATE NOCASE")
    .bind(target)
    .run();
  return json({ ok: true, deleted: result.meta?.changes ?? 0 });
};
