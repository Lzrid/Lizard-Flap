import { beforeEach, describe, expect, it } from "vitest";
import { Score, medalFor } from "./Score";

class MemStorage implements Storage {
  private map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  key(i: number): string | null {
    return Array.from(this.map.keys())[i] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

describe("medalFor", () => {
  it.each([
    [0, "none"],
    [4, "none"],
    [5, "bronze"],
    [14, "bronze"],
    [15, "silver"],
    [25, "gold"],
    [40, "platinum"],
    [100, "platinum"],
  ])("score %i → %s", (s, expected) => {
    expect(medalFor(s)).toBe(expected);
  });
});

describe("Score", () => {
  let storage: MemStorage;
  beforeEach(() => {
    storage = new MemStorage();
  });

  it("starts at 0 and increments", () => {
    const s = new Score(storage);
    expect(s.current).toBe(0);
    s.increment();
    s.increment();
    expect(s.current).toBe(2);
  });

  it("persists a new high score on finalize", () => {
    const s = new Score(storage);
    for (let i = 0; i < 7; i++) s.increment();
    const r = s.finalize();
    expect(r.isNewHigh).toBe(true);
    expect(r.medal).toBe("bronze");

    const s2 = new Score(storage);
    expect(s2.high).toBe(7);
  });

  it("does not overwrite a higher stored score", () => {
    const seed = new Score(storage);
    for (let i = 0; i < 20; i++) seed.increment();
    seed.finalize();

    const next = new Score(storage);
    next.increment();
    const r = next.finalize();
    expect(r.isNewHigh).toBe(false);
    expect(next.high).toBe(20);
  });

  it("recovers from corrupt storage", () => {
    storage.setItem("lizard-flap:v1", "{not json");
    const s = new Score(storage);
    expect(s.high).toBe(0);
  });
});
