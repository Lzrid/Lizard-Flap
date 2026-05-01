import { isAdminAuthorized } from "../../_lib/admin.js";
import { json, readJson } from "../../_lib/util.js";

export const onRequestPost = async ({ request, env }) => {
  const body = await readJson(request);
  if (!isAdminAuthorized(env, body)) return json({ error: "forbidden" }, 403);
  await env.DB.prepare("DELETE FROM players").run();
  return json({ ok: true });
};
