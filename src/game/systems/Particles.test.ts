import { describe, expect, it } from "vitest";
import { Particles } from "./Particles";

interface ParticleProbe {
  active: boolean;
  life: number;
}

describe("Particles", () => {
  it("emits up to pool size and recycles", () => {
    const ps = new Particles();
    ps.emitPuff(0, 0, 200);
    const pool = ps as unknown as { pool: ParticleProbe[] };
    const activeCount = pool.pool.filter((p) => p.active).length;
    expect(activeCount).toBe(64);
  });

  it("particles expire after their lifetime", () => {
    const ps = new Particles();
    ps.emitPuff(0, 0, 5);
    for (let i = 0; i < 60; i++) ps.update(1 / 60);
    const pool = ps as unknown as { pool: ParticleProbe[] };
    expect(pool.pool.every((p) => !p.active)).toBe(true);
  });

  it("reset clears all active particles", () => {
    const ps = new Particles();
    ps.emitPuff(0, 0, 10);
    ps.reset();
    const pool = ps as unknown as { pool: ParticleProbe[] };
    expect(pool.pool.every((p) => !p.active)).toBe(true);
  });
});
