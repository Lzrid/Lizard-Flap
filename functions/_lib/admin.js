const DEFAULT_ADMIN = "Daniel Guzev";

/**
 * Returns true if the request is authorized as the admin.
 *
 * Auth model: name-based — the admin name in the request body must match
 * `env.ADMIN_NAME` (defaulting to "Daniel Guzev"). This is sufficient for a
 * hobby leaderboard but anyone who knows the name can spoof it. To harden,
 * set an `ADMIN_TOKEN` Pages secret and require a matching `x-admin-token`
 * header here.
 */
export function isAdminAuthorized(env, body) {
  const allowed = (env.ADMIN_NAME ?? DEFAULT_ADMIN).toLowerCase();
  const claimed = typeof body?.name === "string" ? body.name.trim().toLowerCase() : "";
  return claimed.length > 0 && claimed === allowed;
}
