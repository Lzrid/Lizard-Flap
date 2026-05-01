import { GROUND_HEIGHT, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from "../../config";
import { Rng } from "../../utils/rng";
import type { Background } from "./Background";

interface Kiwi {
  worldX: number;       // tile-space x of the parent tree's center; never modulo'd
  legPhase: number;
  scale: number;
  active: boolean;
}

const POOL_SIZE = 6;

export class KiwiFlock {
  private readonly pool: Kiwi[] = Array.from({ length: POOL_SIZE }, () => ({
    worldX: 0,
    legPhase: 0,
    scale: 1,
    active: false,
  }));
  private spawnCooldown = 0;
  private rng: Rng;
  /** worldX values already occupied by an active kiwi — avoids stacking two on the same tree. */
  private occupied = new Set<number>();

  constructor(rng?: Rng) {
    this.rng = rng ?? new Rng();
    this.spawnCooldown = this.rng.range(1, 3);
  }

  reset(): void {
    for (const k of this.pool) k.active = false;
    this.occupied.clear();
    this.spawnCooldown = this.rng.range(1, 3);
  }

  update(dt: number, bg: Background): void {
    this.spawnCooldown -= dt;
    if (this.spawnCooldown <= 0) {
      this.trySpawn(bg);
      this.spawnCooldown = this.rng.range(1.5, 4);
    }

    for (const k of this.pool) {
      if (!k.active) continue;
      k.legPhase += dt * 5;
      const screenX = k.worldX - bg.nearScroll;
      if (screenX < -30) {
        k.active = false;
        this.occupied.delete(k.worldX);
      }
    }
  }

  private trySpawn(bg: Background): void {
    const free = this.pool.find((k) => !k.active);
    if (!free) return;
    // Pick a tree whose center is currently off-screen to the right and not already occupied.
    const candidates = bg
      .visibleNearTreeCenters()
      .filter(({ worldX }) => worldX - bg.nearScroll > VIRTUAL_WIDTH * 0.6)
      .filter(({ worldX }) => !this.occupied.has(worldX));
    if (candidates.length === 0) return;
    const pick = candidates[Math.floor(this.rng.next() * candidates.length)]!;
    free.worldX = pick.worldX;
    free.legPhase = this.rng.range(0, Math.PI * 2);
    free.scale = this.rng.range(0.85, 1.15);
    free.active = true;
    this.occupied.add(pick.worldX);
  }

  render(ctx: CanvasRenderingContext2D, bg: Background, isNight: boolean): void {
    const groundTop = VIRTUAL_HEIGHT - GROUND_HEIGHT;
    for (const k of this.pool) {
      if (!k.active) continue;
      const screenX = k.worldX - bg.nearScroll;
      drawKiwi(ctx, screenX, groundTop, k.scale, k.legPhase, isNight);
    }
  }
}

function drawKiwi(
  ctx: CanvasRenderingContext2D,
  x: number,
  feetY: number,
  scale: number,
  legPhase: number,
  isNight: boolean,
): void {
  const bodyColor = isNight ? "#3a2a1c" : "#6b4a2b";
  const bellyColor = isNight ? "#4f3826" : "#8a6a44";
  const beakColor = isNight ? "#c9a76a" : "#e8c884";
  const legColor = isNight ? "#caa56a" : "#d8b676";

  ctx.save();
  ctx.translate(x, feetY);
  ctx.scale(scale, scale);

  const lA = Math.sin(legPhase) * 3;
  const lB = Math.sin(legPhase + Math.PI) * 3;
  ctx.strokeStyle = legColor;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-3, -6);
  ctx.lineTo(-3 + lA * 0.3, 0);
  ctx.moveTo(-3 + lA * 0.3, 0);
  ctx.lineTo(-1 + lA * 0.6, 0);
  ctx.moveTo(3, -6);
  ctx.lineTo(3 + lB * 0.3, 0);
  ctx.moveTo(3 + lB * 0.3, 0);
  ctx.lineTo(5 + lB * 0.6, 0);
  ctx.stroke();

  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.ellipse(0, -10, 9, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = bellyColor;
  ctx.beginPath();
  ctx.ellipse(0, -8, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = beakColor;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-7, -11);
  ctx.quadraticCurveTo(-13, -10.5, -16, -9);
  ctx.stroke();

  ctx.fillStyle = "#000";
  ctx.fillRect(-5, -12, 1, 1);

  ctx.restore();
}
