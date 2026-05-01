interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  active: boolean;
}

const POOL_SIZE = 64;

export class Particles {
  private readonly pool: Particle[] = Array.from({ length: POOL_SIZE }, () => ({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    maxLife: 0,
    size: 0,
    color: "#fff",
    active: false,
  }));

  reset(): void {
    for (const p of this.pool) p.active = false;
  }

  emitPuff(x: number, y: number, count = 6): void {
    for (let i = 0; i < count; i += 1) {
      const p = this.pool.find((q) => !q.active);
      if (!p) return;
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 40;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 20;
      p.maxLife = 0.4 + Math.random() * 0.3;
      p.life = p.maxLife;
      p.size = 2 + Math.random() * 2;
      p.color = "#f0e0a8";
      p.active = true;
    }
  }

  update(dt: number): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.vy += 80 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
}
