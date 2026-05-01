import express from "express";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.LB_DB_PATH ?? path.join(__dirname, "leaderboard.db");

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode = WAL;");
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    name  TEXT PRIMARY KEY COLLATE NOCASE,
    score INTEGER NOT NULL DEFAULT 0,
    flies INTEGER NOT NULL DEFAULT 0,
    ts    INTEGER NOT NULL
  );
`);

const NAME_RE = /^[A-Za-z0-9 _-]+$/;
const MAX_NAME = 14;
const MAX_PLAYERS = 500;

function sanitizeName(raw) {
  if (typeof raw !== "string") return null;
  const s = raw.replace(/\s+/g, " ").trim();
  if (s.length === 0 || s.length > MAX_NAME) return null;
  if (!NAME_RE.test(s)) return null;
  return s;
}

const selectAll = db.prepare(
  `SELECT name, score, flies, ts
     FROM players
     WHERE score > 0 OR flies > 0
     ORDER BY score DESC, flies DESC, ts ASC
     LIMIT ?`,
);
const selectByName = db.prepare(
  "SELECT name, score, flies, ts FROM players WHERE name = ? COLLATE NOCASE",
);
const insertPlayer = db.prepare(
  "INSERT OR IGNORE INTO players (name, score, flies, ts) VALUES (?, 0, 0, ?)",
);
const updateRun = db.prepare(
  "UPDATE players SET score = ?, flies = ?, ts = ? WHERE name = ? COLLATE NOCASE",
);

function entriesPayload() {
  return selectAll.all(MAX_PLAYERS);
}

function rankFor(name) {
  const list = entriesPayload();
  const lower = name.toLowerCase();
  const idx = list.findIndex((e) => e.name.toLowerCase() === lower);
  return idx >= 0 ? idx + 1 : null;
}

const app = express();
app.use(express.json({ limit: "8kb" }));

app.get("/api/leaderboard", (_req, res) => {
  res.json(entriesPayload());
});

app.get("/api/players/:name", (req, res) => {
  const name = sanitizeName(req.params.name);
  if (!name) return res.status(400).json({ error: "invalid_name" });
  const row = selectByName.get(name);
  res.json({ exists: Boolean(row), name: row?.name ?? null });
});

app.post("/api/players", (req, res) => {
  const name = sanitizeName(req.body?.name);
  if (!name) return res.status(400).json({ error: "invalid_name" });
  const result = insertPlayer.run(name, Date.now());
  if (result.changes === 0) {
    return res.status(409).json({ error: "name_taken" });
  }
  res.status(201).json({ name });
});

const DEFAULT_ADMIN = "Daniel Guzev";
function isAdminAuthorized(body) {
  const allowed = (process.env.ADMIN_NAME ?? DEFAULT_ADMIN).toLowerCase();
  const claimed = typeof body?.name === "string" ? body.name.trim().toLowerCase() : "";
  return claimed.length > 0 && claimed === allowed;
}

app.post("/api/admin/reset-leaderboard", (req, res) => {
  if (!isAdminAuthorized(req.body)) return res.status(403).json({ error: "forbidden" });
  db.prepare("DELETE FROM players").run();
  res.json({ ok: true });
});

app.post("/api/admin/reset-player", (req, res) => {
  if (!isAdminAuthorized(req.body)) return res.status(403).json({ error: "forbidden" });
  const target = sanitizeName(req.body?.target);
  if (!target) return res.status(400).json({ error: "invalid_target" });
  const result = db
    .prepare("DELETE FROM players WHERE name = ? COLLATE NOCASE")
    .run(target);
  res.json({ ok: true, deleted: result.changes ?? 0 });
});

app.post("/api/runs", (req, res) => {
  const name = sanitizeName(req.body?.name);
  const score = Math.max(0, Math.floor(Number(req.body?.score)) || 0);
  const flies = Math.max(0, Math.floor(Number(req.body?.flies)) || 0);
  if (!name) return res.status(400).json({ error: "invalid_name" });

  const row = selectByName.get(name);
  if (!row) return res.status(404).json({ error: "name_not_claimed" });

  const better = score > row.score || (score === row.score && flies > row.flies);
  if (better) updateRun.run(score, flies, Date.now(), name);

  res.json({ rank: rankFor(name), entries: entriesPayload() });
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`leaderboard server listening on http://localhost:${port}`);
});
