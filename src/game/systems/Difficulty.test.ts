import { describe, expect, it } from "vitest";
import { difficultyFor } from "./Difficulty";
import {
  DIFFICULTY_MAX_SCROLL,
  DIFFICULTY_MIN_GAP,
  DIFFICULTY_RAMP_SCORES,
  PIPE_GAP,
  SCROLL_SPEED,
} from "../../config";

describe("difficultyFor", () => {
  it("at score 0 matches base config", () => {
    const d = difficultyFor(0);
    expect(d.scrollSpeed).toBeCloseTo(SCROLL_SPEED);
    expect(d.pipeGap).toBeCloseTo(PIPE_GAP);
  });

  it("at full ramp hits the cap", () => {
    const d = difficultyFor(DIFFICULTY_RAMP_SCORES);
    expect(d.scrollSpeed).toBeCloseTo(DIFFICULTY_MAX_SCROLL);
    expect(d.pipeGap).toBeCloseTo(DIFFICULTY_MIN_GAP);
  });

  it("clamps beyond ramp instead of overshooting", () => {
    const d = difficultyFor(DIFFICULTY_RAMP_SCORES * 5);
    expect(d.scrollSpeed).toBeCloseTo(DIFFICULTY_MAX_SCROLL);
    expect(d.pipeGap).toBeCloseTo(DIFFICULTY_MIN_GAP);
  });

  it("interpolates monotonically: speed up, gap down", () => {
    let prevSpeed = -Infinity;
    let prevGap = Infinity;
    for (let s = 0; s <= DIFFICULTY_RAMP_SCORES; s += 5) {
      const d = difficultyFor(s);
      expect(d.scrollSpeed).toBeGreaterThanOrEqual(prevSpeed);
      expect(d.pipeGap).toBeLessThanOrEqual(prevGap);
      prevSpeed = d.scrollSpeed;
      prevGap = d.pipeGap;
    }
  });
});
