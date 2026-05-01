import { VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from "../../config";
import type { GameContext, Scene } from "./Scene";

export class PauseScene implements Scene {
  constructor(
    private readonly ctxMgr: GameContext,
    private readonly resumeTo: Scene,
  ) {}

  enter(): void {
    this.ctxMgr.buttons.clear();
  }

  onFlap(): void {
    this.ctxMgr.goTo(this.resumeTo);
  }

  onPauseToggle(): void {
    this.ctxMgr.goTo(this.resumeTo);
  }

  update(_dt: number): void {
    // frozen
  }

  render(ctx: CanvasRenderingContext2D, alpha: number): void {
    this.resumeTo.render(ctx, alpha);

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "bold 28px system-ui, sans-serif";
    ctx.fillText("paused", VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2 - 10);
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText("tap / space / esc to resume", VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2 + 18);

    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("By: Daniel Guzev", VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT - 14);
  }
}
