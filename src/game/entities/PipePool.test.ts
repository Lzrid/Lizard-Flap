import { describe, expect, it } from "vitest";
import { PipePool } from "./PipePool";
import { Rng } from "../../utils/rng";
import { PIPE_GAP, PIPE_SPACING, SCROLL_SPEED, VIRTUAL_WIDTH } from "../../config";

const opts = () => ({ rng: new Rng(42), scrollSpeed: SCROLL_SPEED, pipeGap: PIPE_GAP });

describe("PipePool", () => {
  it("spawns its first pipe within one spacing of the right edge", () => {
    const pool = new PipePool(opts());
    pool.update(PIPE_SPACING / SCROLL_SPEED + 0.001);
    const active = pool.active();
    expect(active.length).toBeGreaterThanOrEqual(1);
    expect(active[0]!.x).toBeGreaterThan(VIRTUAL_WIDTH - 1);
  });

  it("recycles pipes that scroll off the left edge", () => {
    const pool = new PipePool({ ...opts(), rng: new Rng(7) });
    const totalTime = (VIRTUAL_WIDTH + PIPE_SPACING * 4) / SCROLL_SPEED + 1;
    const dt = 1 / 60;
    let elapsed = 0;
    while (elapsed < totalTime) {
      pool.update(dt);
      elapsed += dt;
    }
    expect(pool.active().every((p) => p.x > -100)).toBe(true);
    expect(pool.pipes.length).toBe(6);
  });

  it("reset() with seed produces deterministic spawns", () => {
    const a = new PipePool(opts());
    const b = new PipePool(opts());
    a.reset(123);
    b.reset(123);
    for (let i = 0; i < 100; i++) {
      a.update(1 / 60);
      b.update(1 / 60);
    }
    const ax = a.active().map((p) => Math.round(p.gapY));
    const bx = b.active().map((p) => Math.round(p.gapY));
    expect(ax).toEqual(bx);
  });
});
