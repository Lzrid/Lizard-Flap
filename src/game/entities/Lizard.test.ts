import { describe, expect, it } from "vitest";
import { Lizard } from "./Lizard";
import { FLAP_IMPULSE, MAX_FALL_SPEED } from "../../config";

describe("Lizard", () => {
  it("starts idle and bobs around its anchor without drifting", () => {
    const l = new Lizard(100, 200);
    const samples: number[] = [];
    for (let i = 0; i < 600; i++) {
      l.update(1 / 60);
      samples.push(l.y);
    }
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    expect((min + max) / 2).toBeCloseTo(200, 0);
    expect(max - min).toBeLessThan(10);
    expect(l.state).toBe("idle");
  });

  it("flap() switches to flying with upward velocity", () => {
    const l = new Lizard(100, 200);
    l.flap();
    expect(l.state).toBe("flying");
    expect(l.vy).toBeCloseTo(-FLAP_IMPULSE);
  });

  it("falls under gravity once flying, capped at MAX_FALL_SPEED", () => {
    const l = new Lizard(100, 200);
    l.flap();
    for (let i = 0; i < 120; i++) l.update(1 / 60);
    expect(l.vy).toBeGreaterThan(0);
    expect(l.vy).toBeLessThanOrEqual(MAX_FALL_SPEED + 1e-6);
    expect(l.y).toBeGreaterThan(200);
  });

  it("dead lizard ignores flap", () => {
    const l = new Lizard(100, 200);
    l.kill();
    l.flap();
    expect(l.state).toBe("dead");
    expect(l.vy).toBe(0);
  });

  it("reset() restores idle state and clears velocity", () => {
    const l = new Lizard(100, 200);
    l.flap();
    for (let i = 0; i < 30; i++) l.update(1 / 60);
    l.reset(50, 50);
    expect(l.x).toBe(50);
    expect(l.y).toBe(50);
    expect(l.vy).toBe(0);
    expect(l.state).toBe("idle");
  });
});
