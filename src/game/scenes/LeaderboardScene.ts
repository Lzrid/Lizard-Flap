import { VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from "../../config";
import { fillRoundedRect, strokeRoundedRect } from "../../utils/draw";
import type { Renderer } from "../Renderer";
import { drawIconButton } from "../systems/Buttons";
import { MenuScene } from "./MenuScene";
import type { GameContext, Scene } from "./Scene";

const ROW_HEIGHT = 24;
const HEADER_OFFSET = 50;

export class LeaderboardScene implements Scene {
  private scrollY = 0;
  private maxScroll = 0;
  private dragLastY: number | null = null;
  private cardX = 0;
  private cardY = 0;
  private cardW = 0;
  private cardH = 0;
  private listTop = 0;
  private listH = 0;

  constructor(
    private readonly ctxMgr: GameContext,
    private readonly renderer: Renderer,
  ) {}

  enter(): void {
    this.ctxMgr.buttons.set([
      {
        x: 8,
        y: 8,
        w: 28,
        h: 28,
        draw: (ctx, hit) =>
          drawIconButton(
            ctx,
            { x: 8, y: 8, w: 28, h: 28, draw: () => undefined, onPress: () => undefined },
            hit,
            drawBackIcon,
          ),
        onPress: () => this.ctxMgr.goTo(new MenuScene(this.ctxMgr)),
      },
    ]);

    this.cardW = 320;
    this.cardH = VIRTUAL_HEIGHT - 160;
    this.cardX = (VIRTUAL_WIDTH - this.cardW) / 2;
    this.cardY = 90;
    this.listTop = this.cardY + HEADER_OFFSET;
    this.listH = this.cardH - HEADER_OFFSET - 8;

    this.recomputeScrollBounds();
    this.scrollY = 0;
    void this.ctxMgr.leaderboard.refresh().then(() => this.recomputeScrollBounds());

    this.renderer.canvas.addEventListener("wheel", this.onWheel, { passive: false });
    this.renderer.canvas.addEventListener("pointerdown", this.onDragStart);
    window.addEventListener("pointermove", this.onDragMove);
    window.addEventListener("pointerup", this.onDragEnd);
  }

  exit(): void {
    this.ctxMgr.buttons.clear();
    this.renderer.canvas.removeEventListener("wheel", this.onWheel);
    this.renderer.canvas.removeEventListener("pointerdown", this.onDragStart);
    window.removeEventListener("pointermove", this.onDragMove);
    window.removeEventListener("pointerup", this.onDragEnd);
  }

  onFlap(): void {
    this.ctxMgr.goTo(new MenuScene(this.ctxMgr));
  }

  update(_dt: number): void {
    // static
  }

  private readonly onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.scrollY = clamp(this.scrollY + e.deltaY, 0, this.maxScroll);
  };

  private readonly onDragStart = (e: PointerEvent): void => {
    const { x, y } = this.renderer.clientToCanvas(e.clientX, e.clientY);
    if (this.isInsideList(x, y)) {
      this.dragLastY = e.clientY;
    }
  };

  private readonly onDragMove = (e: PointerEvent): void => {
    if (this.dragLastY === null) return;
    const dyClient = e.clientY - this.dragLastY;
    this.dragLastY = e.clientY;
    const rect = this.renderer.canvas.getBoundingClientRect();
    const dyCanvas = (dyClient / rect.height) * VIRTUAL_HEIGHT;
    this.scrollY = clamp(this.scrollY - dyCanvas, 0, this.maxScroll);
  };

  private readonly onDragEnd = (): void => {
    this.dragLastY = null;
  };

  private recomputeScrollBounds(): void {
    const total = this.ctxMgr.leaderboard.all().length;
    const contentH = total * ROW_HEIGHT;
    this.maxScroll = Math.max(0, contentH - this.listH);
    if (this.scrollY > this.maxScroll) this.scrollY = this.maxScroll;
  }

  private isInsideList(x: number, y: number): boolean {
    return (
      x >= this.cardX &&
      x <= this.cardX + this.cardW &&
      y >= this.listTop &&
      y <= this.listTop + this.listH
    );
  }

  render(ctx: CanvasRenderingContext2D, _alpha: number): void {
    ctx.fillStyle = "#1a1f2b";
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    ctx.fillStyle = "#f5e9c8";
    ctx.font = "bold 24px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("LEADERBOARD", VIRTUAL_WIDTH / 2, 60);

    const entries = this.ctxMgr.leaderboard.all();

    ctx.fillStyle = "#f5e9c8";
    fillRoundedRect(ctx, this.cardX, this.cardY, this.cardW, this.cardH, 12);
    ctx.strokeStyle = "#7a5e2a";
    ctx.lineWidth = 3;
    strokeRoundedRect(ctx, this.cardX, this.cardY, this.cardW, this.cardH, 12);

    ctx.fillStyle = "#7a5e2a";
    ctx.font = "bold 11px ui-monospace, monospace";
    ctx.textAlign = "left";
    ctx.fillText("#  NAME", this.cardX + 16, this.cardY + 30);
    ctx.textAlign = "right";
    ctx.fillText("PIPES  FLIES", this.cardX + this.cardW - 16, this.cardY + 30);

    if (entries.length === 0) {
      ctx.fillStyle = "#7a5e2a";
      ctx.font = "14px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No runs yet!", VIRTUAL_WIDTH / 2, this.cardY + this.cardH / 2 - 8);
      ctx.fillText("Play to set your record.", VIRTUAL_WIDTH / 2, this.cardY + this.cardH / 2 + 12);
    } else {
      ctx.save();
      // Clip to the list area so scrolled rows can't bleed past the card edges
      ctx.beginPath();
      ctx.rect(this.cardX + 4, this.listTop, this.cardW - 8, this.listH);
      ctx.clip();

      ctx.font = "13px ui-monospace, monospace";
      const myName = this.ctxMgr.settings.playerName;
      const firstVisible = Math.max(0, Math.floor(this.scrollY / ROW_HEIGHT) - 1);
      const lastVisible = Math.min(
        entries.length - 1,
        Math.ceil((this.scrollY + this.listH) / ROW_HEIGHT) + 1,
      );

      for (let i = firstVisible; i <= lastVisible; i += 1) {
        const entry = entries[i]!;
        const rowY = this.listTop + i * ROW_HEIGHT - this.scrollY + ROW_HEIGHT / 2;
        const isMe = entry.name === myName;
        if (isMe) {
          ctx.fillStyle = "rgba(229,57,53,0.18)";
          fillRoundedRect(ctx, this.cardX + 8, rowY - ROW_HEIGHT / 2 + 1, this.cardW - 16, ROW_HEIGHT - 2, 6);
        }
        ctx.fillStyle = "#7a5e2a";
        ctx.textAlign = "left";
        ctx.fillText(`${i + 1}.`, this.cardX + 16, rowY + 4);
        ctx.fillText(truncate(entry.name, 14), this.cardX + 44, rowY + 4);
        ctx.textAlign = "right";
        ctx.fillStyle = "#1a1f2b";
        ctx.fillText(String(entry.score), this.cardX + this.cardW - 80, rowY + 4);
        ctx.fillText(String(entry.flies), this.cardX + this.cardW - 24, rowY + 4);
      }
      ctx.restore();

      // scroll indicator
      if (this.maxScroll > 0) {
        const trackX = this.cardX + this.cardW - 6;
        const trackH = this.listH;
        const thumbH = Math.max(20, (this.listH / (this.maxScroll + this.listH)) * trackH);
        const thumbY = this.listTop + (this.scrollY / this.maxScroll) * (trackH - thumbH);
        ctx.fillStyle = "rgba(122,94,42,0.3)";
        fillRoundedRect(ctx, trackX, this.listTop, 3, trackH, 1.5);
        ctx.fillStyle = "#7a5e2a";
        fillRoundedRect(ctx, trackX, thumbY, 3, thumbH, 1.5);
      }
    }

    ctx.fillStyle = "#f5e9c8";
    ctx.textAlign = "center";
    ctx.font = "12px system-ui, sans-serif";
    const hint = this.maxScroll > 0
      ? "scroll to see more · tap back to return"
      : "tap or press space to return";
    ctx.fillText(hint, VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT - 20);
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function drawBackIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx + 5, cy - 6);
  ctx.lineTo(cx - 5, cy);
  ctx.lineTo(cx + 5, cy + 6);
  ctx.stroke();
}
