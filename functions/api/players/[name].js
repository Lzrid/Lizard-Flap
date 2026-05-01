import { json, sanitizeName } from "../../_lib/util.js";

export const onRequestGet = async ({ params, env }) => {
  const name = sanitizeName(params?.name);
  if (!name) return json({ error: "invalid_name" }, 400);

  const row = await env.DB
    .prepare("SELECT name FROM players WHERE name = ? COLLATE NOCASE")
    .bind(name)
    .first();

  return json({ exists: Boolean(row), name: row?.name ?? null });
};
