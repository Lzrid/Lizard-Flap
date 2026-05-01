import { describe, expect, it } from "vitest";
import { circleVsRect } from "./Collision";

describe("circleVsRect", () => {
  const rect = { x: 100, y: 100, w: 50, h: 50 };

  it("returns true when circle center is inside the rect", () => {
    expect(circleVsRect({ x: 110, y: 110, r: 5 }, rect)).toBe(true);
  });

  it("returns true when circle overlaps a rect edge", () => {
    expect(circleVsRect({ x: 95, y: 125, r: 8 }, rect)).toBe(true);
  });

  it("returns true when circle clips a rect corner", () => {
    expect(circleVsRect({ x: 96, y: 96, r: 6 }, rect)).toBe(true);
  });

  it("returns false when circle is clearly outside", () => {
    expect(circleVsRect({ x: 0, y: 0, r: 5 }, rect)).toBe(false);
  });

  it("returns false when circle is just shy of corner", () => {
    expect(circleVsRect({ x: 90, y: 90, r: 5 }, rect)).toBe(false);
  });
});
