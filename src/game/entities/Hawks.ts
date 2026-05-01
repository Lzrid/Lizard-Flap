import { GROUND_HEIGHT, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from "../../config";
import { Rng } from "../../utils/rng";

interface Hawk {
  x: number;
  baseY: number;
  amplitude: number;
  speed: number;
  bobPhase: number;
  wingPhase: number;
  active: boolean;
}

const POOL_SIZE = 3;
const HAWK_HITBOX = 11;

export class Hawks {
  private readonly pool: Hawk[] = Array.from({ length: POOL_SIZE }, () => ({
    x: 0,
    baseY: 0,
    amplitude: 0,
    speed: 0,
    bobPhase: 0,
    wingPhase: 0,
    active: false,
  }));
  private spawnCooldown: number;
  private rng: Rng;

  constructor(rng?: Rng) {
    this.rng = rng ?? new Rng();
    this.spawnCooldown = this.rng.range(7, 12);
  }

  reset(): void {
    for (const h of this.pool) h.active = false;
    this.spawnCooldown = this.rng.range(7, 12);
  }

  update(dt: number, scrollSpeed: number): void {
    this.spawnCooldown -= dt;
    if (this.spawnCooldown <= 0) {
      this.spawn();
      this.spawnCooldown = this.rng.range(6, 12);
    }

    for (const h of this.pool) {
      if (!h.active) continue;
      h.bobPhase += dt * 1.4;
      h.wingPhase += dt * 8;
      h.x -= (h.speed + scrollSpeed * 0.4) * dt;
      if (h.x < -40) h.active = false;
    }
  }

  private spawn(): void {
    const free = this.pool.find((h) => !h.active);
    if (!free) return;
    free.x = VIRTUAL_WIDTH + 30;
    free.baseY = this.rng.range(90, VIRTUAL_HEIGHT - GROUND_HEIGHT - 120);
    free.amplitude = this.rng.range(20, 60);
    free.speed = this.rng.range(40, 90);
    free.bobPhase = this.rng.range(0, Math.PI * 2);
    free.wingPhase = 0;
    free.active = true;
  }

  active(): Array<{ x: number; y: number; r: number }> {
    return this.pool
      .filter((h) => h.active)
      .map((h) => ({
        x: h.x,
        y: h.baseY + Math.sin(h.bobPhase) * h.amplitude,
        r: HAWK_HITBOX,
      }));
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const h of this.pool) {
      if (!h.active) continue;
      const y = h.baseY + Math.sin(h.bobPhase) * h.amplitude;
      drawHawk(ctx, h.x, y, h.wingPhase);
    }
  }
}

function drawHawk(ctx: CanvasRenderingContext2D, x: number, y: number, wingPhase: number): void {
  ctx.save();
  ctx.translate(x, y);

  const wingFlap = Math.sin(wingPhase);
  const wingTipY = -wingFlap * 6;

  // wings — chevron pair
  ctx.fillStyle = "#3a2618";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-18, wingTipY - 4);
  ctx.lineTo(-12, 2);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(18, wingTipY - 4);
  ctx.lineTo(12, 2);
  ctx.closePath();
  ctx.fill();

  // wing underside highlight
  ctx.fillStyle = "#5e3f24";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-14, wingTipY - 1);
  ctx.lineTo(-10, 1);
  ctx.closePath();
  ctx.fill();

  // body
  ctx.fillStyle = "#5e3f24";
  ctx.beginPath();
  ctx.ellipse(0, 1, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // chest / belly
  ctx.fillStyle = "#caa56a";
  ctx.beginPath();
  ctx.ellipse(0, 3, 5, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // head + hooked beak
  ctx.fillStyle = "#3a2618";
  ctx.beginPath();
  ctx.arc(-6, -1, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f5c453";
  ctx.beginPath();
  ctx.moveTo(-9, -1);
  ctx.lineTo(-13, 0);
  ctx.lineTo(-9, 1);
  ctx.closePath();
  ctx.fill();

  // eye glint
  ctx.fillStyle = "#fff";
  ctx.fillRect(-7, -2, 1, 1);

  ctx.restore();
}
