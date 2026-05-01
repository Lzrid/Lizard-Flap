import type { AABB } from "../entities/Pipe";
import { clamp } from "../../utils/math";

export interface Circle {
  x: number;
  y: number;
  r: number;
}

export function circleVsRect(c: Circle, r: AABB): boolean {
  const cx = clamp(c.x, r.x, r.x + r.w);
  const cy = clamp(c.y, r.y, r.y + r.h);
  const dx = c.x - cx;
  const dy = c.y - cy;
  return dx * dx + dy * dy <= c.r * c.r;
}

export function circleVsCircle(a: Circle, b: Circle): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const r = a.r + b.r;
  return dx * dx + dy * dy <= r * r;
}
