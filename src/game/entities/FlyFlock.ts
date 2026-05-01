import { PIPE_WIDTH, VIRTUAL_WIDTH } from "../../config";
import { Rng } from "../../utils/rng";
import type { Pipe } from "./Pipe";

interface Fly {
  x: number;
  y: number;
  baseY: number;
  bobPhase: number;
  wingPhase: number;
  active: boolean;
  collected: boolean;
  collectAnim: number;
}

const POOL_SIZE = 6;
const FLY_RADIUS = 14;
const FLY_BOB_AMPLITUDE = 4;
const SPAWN_CHANCE = 0.7;

export class FlyFlock {
  private readonly pool: Fly[] = Array.from({ length: POOL_SIZE }, () => ({
    x: 0,
    y: 0,
    baseY: 0,
    bobPhase: 0,
    wingPhase: 0,
    active: false,
    collected: false,
    collectAnim: 0,
  }));
  /** Pipes we've already considered for fly spawning. Cleared when a pipe deactivates. */
  private considered = new Set<Pipe>();
  private rng: Rng;

  constructor(rng?: Rng) {
    this.rng = rng ?? new Rng();
  }

  reset(): void {
    for (const f of this.pool) f.active = false;
    this.considered.clear();
  }

  update(dt: number, scrollSpeed: number, pipes: Pipe[]): void {
    // Tag a fly to each new pipe (or skip it, by chance) once it enters the world.
    for (const p of pipes) {
      if (!p.active) {
        this.considered.delete(p);
        continue;
      }
      if (this.considered.has(p)) continue;
      if (p.x > VIRTUAL_WIDTH + 5) continue;            // not yet in view
      this.considered.add(p);
      if (this.rng.next() < SPAWN_CHANCE) {
        this.spawnAt(p.x + PIPE_WIDTH / 2, p.gapY);
      }
    }

    for (const f of this.pool) {
      if (!f.active) continue;
      f.bobPhase += dt * 6;
      f.wingPhase += dt * 40;
      f.x -= scrollSpeed * dt;
      f.y = f.baseY + Math.sin(f.bobPhase) * FLY_BOB_AMPLITUDE;
      if (f.collected) {
        f.collectAnim -= dt;
        if (f.collectAnim <= 0) f.active = false;
      } else if (f.x < -20) {
        f.active = false;
      }
    }
  }

  private spawnAt(x: number, y: number): void {
    const free = this.pool.find((f) => !f.active);
    if (!free) return;
    free.x = x;
    free.baseY = y;
    free.y = y;
    free.bobPhase = this.rng.range(0, Math.PI * 2);
    free.wingPhase = 0;
    free.active = true;
    free.collected = false;
    free.collectAnim = 0;
  }

  active(): Array<{ x: number; y: number; r: number; collected: boolean; consume: () => void }> {
    return this.pool
      .filter((f) => f.active && !f.collected)
      .map((f) => ({
        x: f.x,
        y: f.y,
        r: FLY_RADIUS,
        collected: f.collected,
        consume: () => {
          f.collected = true;
          f.collectAnim = 0.3;
        },
      }));
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const f of this.pool) {
      if (!f.active) continue;
      drawFly(ctx, f.x, f.y, f.wingPhase, f.collected ? f.collectAnim / 0.3 : 1);
    }
  }
}

function drawFly(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  wingPhase: number,
  alpha: number,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;

  const w = 1 + Math.abs(Math.sin(wingPhase)) * 4;
  ctx.fillStyle = "rgba(220,230,255,0.7)";
  ctx.beginPath();
  ctx.ellipse(x - 2, y - 2, w, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + 2, y - 2, w, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.ellipse(x, y, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#e53935";
  ctx.fillRect(x + 1, y - 1, 1, 1);

  ctx.restore();
}
