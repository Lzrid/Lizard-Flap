import { isAdminAuthorized } from "../../_lib/admin.js";
import { json, readJson } from "../../_lib/util.js";

export const onRequestPost = async ({ request, env }) => {
  const body = await readJson(request);
  if (!isAdminAuthorized(env, body)) return json({ error: "forbidden" }, 403);
  // Zero scores instead of DELETE so existing name claims survive — otherwise
  // every player's next /api/runs submit would 404 (name_not_claimed) until
  // they re-entered their name from the menu.
  await env.DB
    .prepare("UPDATE players SET score = 0, flies = 0, ts = ?")
    .bind(Date.now())
    .run();
  return json({ ok: true });
};
