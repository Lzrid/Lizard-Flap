import { onRequestGet as getLeaderboard } from "../functions/api/leaderboard.js";
import { onRequestPost as postPlayers } from "../functions/api/players/index.js";
import { onRequestGet as getPlayer } from "../functions/api/players/[name].js";
import { onRequestPost as postRuns } from "../functions/api/runs.js";

const NOT_FOUND = () =>
  new Response(JSON.stringify({ error: "not_found" }), {
    status: 404,
    headers: { "content-type": "application/json" },
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method.toUpperCase();

    if (path === "/api/leaderboard" && method === "GET") {
      return getLeaderboard({ request, env });
    }
    if (path === "/api/players" && method === "POST") {
      return postPlayers({ request, env });
    }
    if (path.startsWith("/api/players/") && method === "GET") {
      const name = decodeURIComponent(path.slice("/api/players/".length));
      return getPlayer({ request, env, params: { name } });
    }
    if (path === "/api/runs" && method === "POST") {
      return postRuns({ request, env });
    }
    if (path.startsWith("/api/")) return NOT_FOUND();

    // Anything else only reaches the Worker if no static asset matched
    // (assets are served first). Defer back to the asset binding so SPA
    // fallback still works for unknown paths.
    return env.ASSETS.fetch(request);
  },
};
