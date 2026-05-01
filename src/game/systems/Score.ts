import { STORAGE_KEY } from "../../config";

export type Medal = "none" | "bronze" | "silver" | "gold" | "platinum";

const MEDAL_THRESHOLDS: Array<{ score: number; medal: Medal }> = [
  { score: 40, medal: "platinum" },
  { score: 25, medal: "gold" },
  { score: 15, medal: "silver" },
  { score: 5, medal: "bronze" },
];

export function medalFor(score: number): Medal {
  for (const t of MEDAL_THRESHOLDS) if (score >= t.score) return t.medal;
  return "none";
}

interface Stored {
  highScore: number;
}

export class Score {
  current = 0;
  flies = 0;
  high: number;

  constructor(private readonly storage: Storage = window.localStorage) {
    this.high = this.load();
  }

  reset(): void {
    this.current = 0;
    this.flies = 0;
  }

  increment(): void {
    this.current += 1;
  }

  collectFly(): void {
    this.flies += 1;
  }

  finalize(): { isNewHigh: boolean; medal: Medal } {
    const isNewHigh = this.current > this.high;
    if (isNewHigh) {
      this.high = this.current;
      this.save();
    }
    return { isNewHigh, medal: medalFor(this.current) };
  }

  private load(): number {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return 0;
      const parsed = JSON.parse(raw) as Partial<Stored>;
      return Math.max(0, Math.floor(parsed.highScore ?? 0));
    } catch {
      return 0;
    }
  }

  private save(): void {
    try {
      const data: Stored = { highScore: this.high };
      this.storage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore quota / privacy-mode errors
    }
  }
}
