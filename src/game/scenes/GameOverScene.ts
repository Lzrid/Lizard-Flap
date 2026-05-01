import { VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from "../../config";
import { fillRoundedRect, strokeRoundedRect } from "../../utils/draw";
import type { Medal } from "../systems/Score";
import { MenuScene } from "./MenuScene";
import type { GameContext, Scene } from "./Scene";

const MEDAL_COLORS: Record<Medal, string> = {
  none: "#777",
  bronze: "#cd7f32",
  silver: "#c0c0c0",
  gold: "#ffd54a",
  platinum: "#a8e3ff",
};

export class GameOverScene implements Scene {
  private cooldown = 0.4;
  private rank: number | null = null;

  constructor(
    private readonly ctxMgr: GameContext,
    private readonly result: { isNewHigh: boolean; medal: Medal },
  ) {
    const name = ctxMgr.settings.playerName;
    if (name && (ctxMgr.score.current > 0 || ctxMgr.score.flies > 0)) {
      void ctxMgr.leaderboard
        .submit(name, ctxMgr.score.current, ctxMgr.score.flies)
        .then((r) => {
          this.rank = r.rank;
        });
    }
  }

  enter(): void {
    this.ctxMgr.buttons.clear();
  }

  onFlap(): void {
    if (this.cooldown > 0) return;
    this.ctxMgr.goTo(new MenuScene(this.ctxMgr));
  }

  update(dt: number): void {
    if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt);
  }

  render(ctx: CanvasRenderingContext2D, _alpha: number): void {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    const cx = VIRTUAL_WIDTH / 2;
    const cardY = VIRTUAL_HEIGHT * 0.22;
    const cardW = 240;
    const cardH = 250;
    ctx.fillStyle = "#f5e9c8";
    fillRoundedRect(ctx, cx - cardW / 2, cardY, cardW, cardH, 12);
    ctx.strokeStyle = "#7a5e2a";
    ctx.lineWidth = 3;
    strokeRoundedRect(ctx, cx - cardW / 2, cardY, cardW, cardH, 12);

    ctx.fillStyle = "#7a5e2a";
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Game Over", cx, cardY + 30);

    const medalCx = cx - 70;
    const medalCy = cardY + 95;
    ctx.fillStyle = MEDAL_COLORS[this.result.medal];
    ctx.beginPath();
    ctx.arc(medalCx, medalCy, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#7a5e2a";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#7a5e2a";
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText(this.result.medal.toUpperCase(), medalCx, medalCy + 50);

    ctx.textAlign = "right";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText("score", cx + 90, cardY + 80);
    ctx.fillText("best", cx + 90, cardY + 120);
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.fillText(String(this.ctxMgr.score.current), cx + 90, cardY + 100);
    ctx.fillText(String(this.ctxMgr.score.high), cx + 90, cardY + 140);

    if (this.result.isNewHigh) {
      ctx.fillStyle = "#e53935";
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("NEW BEST!", cx, cardY + 170);
    }

    if (this.rank !== null) {
      ctx.fillStyle = "#7a5e2a";
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Leaderboard rank: #${this.rank}`, cx, cardY + 200);
    }

    const playerName = this.ctxMgr.settings.playerName;
    if (playerName) {
      ctx.fillStyle = "#7a5e2a";
      ctx.font = "11px system-ui, sans-serif";
      ctx.fillText(`as ${playerName}`, cx, cardY + 220);
    }

    ctx.fillStyle = "#7a5e2a";
    ctx.textAlign = "center";
    ctx.font = "13px system-ui, sans-serif";
    ctx.fillText("tap to continue", cx, cardY + cardH + 30);
  }
}
