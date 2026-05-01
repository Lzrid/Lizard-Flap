import { fillRoundedRect } from "../utils/draw";

export class DebugOverlay {
  private samples: number[] = [];
  private readonly windowSize = 60;
  private fps = 0;
  private clickTimes: number[] = [];
  private readonly cpsWindowMs = 1000;

  enabled: boolean;

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  static fromEnv(): DebugOverlay {
    const isDev = import.meta.env?.DEV ?? false;
    const flag = new URLSearchParams(window.location.search).has("debug");
    return new DebugOverlay(isDev || flag);
  }

  sample(frameDtSeconds: number): void {
    if (!this.enabled) return;
    this.samples.push(frameDtSeconds);
    if (this.samples.length > this.windowSize) this.samples.shift();
    const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    this.fps = avg > 0 ? 1 / avg : 0;
  }

  recordClick(): void {
    if (!this.enabled) return;
    this.clickTimes.push(performance.now());
  }

  private cps(): number {
    if (this.clickTimes.length === 0) return 0;
    const cutoff = performance.now() - this.cpsWindowMs;
    while (this.clickTimes.length > 0 && this.clickTimes[0]! < cutoff) {
      this.clickTimes.shift();
    }
    return this.clickTimes.length;
  }

  render(ctx: CanvasRenderingContext2D, width: number): void {
    if (!this.enabled) return;
    const cx = width / 2;
    const boxW = 72;
    const boxH = 20;
    const y = 4;
    const gap = 4;
    const fpsX = cx - boxW / 2;
    const cpsX = fpsX + boxW + gap;

    ctx.save();
    ctx.font = "12px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "rgba(0,0,0,0.5)";
    fillRoundedRect(ctx, fpsX, y, boxW, boxH, 6);
    ctx.fillStyle = "#9ad36a";
    ctx.fillText(`${this.fps.toFixed(0)} fps`, fpsX + boxW / 2, y + boxH / 2);

    ctx.fillStyle = "rgba(0,0,0,0.5)";
    fillRoundedRect(ctx, cpsX, y, boxW, boxH, 6);
    ctx.fillStyle = "#f0e0a8";
    ctx.fillText(`${this.cps()} cps`, cpsX + boxW / 2, y + boxH / 2);

    ctx.restore();
  }
}
