import { json, readJson, sanitizeName } from "../../_lib/util.js";

export const onRequestPost = async ({ request, env }) => {
  const body = await readJson(request);
  const name = sanitizeName(body?.name);
  if (!name) return json({ error: "invalid_name" }, 400);

  const result = await env.DB
    .prepare(
      "INSERT OR IGNORE INTO players (name, score, flies, ts) VALUES (?, 0, 0, ?)",
    )
    .bind(name, Date.now())
    .run();

  if (!result.meta?.changes) return json({ error: "name_taken" }, 409);
  return json({ name }, 201);
};
