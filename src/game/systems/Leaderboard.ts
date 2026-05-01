export interface LeaderboardEntry {
  name: string;
  score: number;
  flies: number;
  ts: number;
}

const API_BASE = "/api";

export class Leaderboard {
  private entries: LeaderboardEntry[] = [];

  /** Last fetched / submitted snapshot. Synchronous so renderers can read it on every frame. */
  all(): LeaderboardEntry[] {
    return this.entries.slice();
  }

  async refresh(): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/leaderboard`);
      if (!res.ok) return;
      const data = (await res.json()) as unknown;
      if (Array.isArray(data)) this.entries = data as LeaderboardEntry[];
    } catch {
      // network errors leave the previous cache in place
    }
  }

  /** Reserves a name globally. Resolves to "ok" on success, "taken" if already used, "invalid" if format is bad, "error" otherwise. */
  async claimName(name: string): Promise<"ok" | "taken" | "invalid" | "error"> {
    try {
      const res = await fetch(`${API_BASE}/players`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.status === 201) return "ok";
      if (res.status === 409) return "taken";
      if (res.status === 400) return "invalid";
      return "error";
    } catch {
      return "error";
    }
  }

  /** Checks whether a name is already taken globally. */
  async isNameAvailable(name: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/players/${encodeURIComponent(name)}`);
      if (!res.ok) return false;
      const data = (await res.json()) as { exists?: boolean };
      return data.exists === false;
    } catch {
      return false;
    }
  }

  async submit(name: string, score: number, flies: number): Promise<{ rank: number | null }> {
    if (!name) return { rank: null };
    try {
      const res = await fetch(`${API_BASE}/runs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, score, flies }),
      });
      if (!res.ok) return { rank: null };
      const data = (await res.json()) as { rank?: number | null; entries?: LeaderboardEntry[] };
      if (Array.isArray(data.entries)) this.entries = data.entries;
      return { rank: data.rank ?? null };
    } catch {
      return { rank: null };
    }
  }
}
