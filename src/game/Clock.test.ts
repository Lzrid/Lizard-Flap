import { describe, expect, it } from "vitest";
import { Clock } from "./Clock";
import { FIXED_DT, MAX_FRAME_DT } from "../config";

describe("Clock", () => {
  it("emits exactly one update per fixed-dt frame", () => {
    const clock = new Clock();
    const { steps, alpha } = clock.step(FIXED_DT);
    expect(steps).toBe(1);
    expect(alpha).toBeCloseTo(0, 10);
  });

  it("emits two updates when frame is twice fixed dt", () => {
    const clock = new Clock();
    const { steps } = clock.step(FIXED_DT * 2);
    expect(steps).toBe(2);
  });

  it("accumulates fractional time across frames", () => {
    const clock = new Clock();
    expect(clock.step(FIXED_DT * 0.5).steps).toBe(0);
    expect(clock.step(FIXED_DT * 0.6).steps).toBe(1);
  });

  it("clamps frame dt to MAX_FRAME_DT to prevent spiral of death", () => {
    const clock = new Clock();
    const huge = MAX_FRAME_DT * 10;
    const { steps } = clock.step(huge);
    expect(steps).toBeLessThanOrEqual(Math.ceil(MAX_FRAME_DT / FIXED_DT));
  });

  it("ignores negative dt", () => {
    const clock = new Clock();
    const { steps } = clock.step(-1);
    expect(steps).toBe(0);
  });

  it("reset() drops accumulated time so next frame starts clean", () => {
    const clock = new Clock();
    clock.step(FIXED_DT * 0.9);
    clock.reset();
    expect(clock.step(FIXED_DT * 0.5).steps).toBe(0);
  });

  it("alpha reflects leftover fractional accumulator after stepping", () => {
    const clock = new Clock();
    const { alpha } = clock.step(FIXED_DT * 1.25);
    expect(alpha).toBeCloseTo(0.25, 6);
  });
});
