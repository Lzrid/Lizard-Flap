import {
  GROUND_HEIGHT,
  PIPE_SPACING,
  PIPE_WIDTH,
  VIRTUAL_HEIGHT,
  VIRTUAL_WIDTH,
} from "../../config";
import { Rng } from "../../utils/rng";
import { Pipe } from "./Pipe";

const POOL_SIZE = 6;
const MIN_GAP_FROM_EDGE = 60;

export class PipePool {
  readonly pipes: Pipe[] = Array.from({ length: POOL_SIZE }, () => new Pipe());
  private nextSpawnX = 0;
  private rng: Rng;

  scrollSpeed: number;
  pipeGap: number;

  constructor(opts: { rng?: Rng; scrollSpeed: number; pipeGap: number }) {
    this.rng = opts.rng ?? new Rng();
    this.scrollSpeed = opts.scrollSpeed;
    this.pipeGap = opts.pipeGap;
    this.reset();
  }

  reset(seed?: number): void {
    if (seed !== undefined) this.rng = new Rng(seed);
    for (const p of this.pipes) p.active = false;
    this.nextSpawnX = VIRTUAL_WIDTH + PIPE_SPACING;
  }

  update(dt: number): void {
    for (const p of this.pipes) p.update(dt, this.scrollSpeed);
    this.nextSpawnX -= this.scrollSpeed * dt;
    while (this.nextSpawnX <= VIRTUAL_WIDTH) {
      this.spawn(VIRTUAL_WIDTH + (VIRTUAL_WIDTH - this.nextSpawnX));
      this.nextSpawnX += PIPE_SPACING;
    }
    for (const p of this.pipes) {
      if (p.active && p.x + PIPE_WIDTH < 0) p.active = false;
    }
  }

  private spawn(x: number): void {
    const free = this.pipes.find((p) => !p.active);
    if (!free) return;
    const top = MIN_GAP_FROM_EDGE + this.pipeGap / 2;
    const bottom = VIRTUAL_HEIGHT - GROUND_HEIGHT - MIN_GAP_FROM_EDGE - this.pipeGap / 2;
    const gapY = this.rng.range(top, bottom);
    free.reset(x, gapY, this.pipeGap);
  }

  active(): Pipe[] {
    return this.pipes.filter((p) => p.active);
  }

  render(ctx: CanvasRenderingContext2D, groundY: number): void {
    for (const p of this.pipes) p.render(ctx, groundY);
  }
}
