import { SCROLL_SPEED, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from "../../config";
import { fillRoundedRect, strokeRoundedRect } from "../../utils/draw";
import { Background, DAY_PALETTE } from "../entities/Background";
import { Ground } from "../entities/Ground";
import { KiwiFlock } from "../entities/KiwiFlock";
import { Lizard } from "../entities/Lizard";
import type { Button } from "../systems/Buttons";
import { drawIconButton } from "../systems/Buttons";
import { LeaderboardScene } from "./LeaderboardScene";
import { ModScene } from "./ModScene";
import { PlayScene } from "./PlayScene";
import type { GameContext, Scene } from "./Scene";

const LEADERBOARD_BTN = { x: VIRTUAL_WIDTH / 2 - 80, y: 360, w: 160, h: 40 };
const NAME_BTN = { x: VIRTUAL_WIDTH / 2 - 80, y: 410, w: 160, h: 32 };
const MOD_BTN = { x: VIRTUAL_WIDTH / 2 - 80, y: 450, w: 160, h: 32 };

export class MenuScene implements Scene {
  private readonly bg = new Background();
  private readonly ground = new Ground();
  private readonly kiwis = new KiwiFlock();
  private readonly lizard = new Lizard(VIRTUAL_WIDTH * 0.4, VIRTUAL_HEIGHT * 0.5);
  private leaderboardHover = false;
  private nameHover = false;

  constructor(private readonly ctxMgr: GameContext) {}

  enter(): void {
    this.ctxMgr.audio.music.setMode("jazz");
    void this.ctxMgr.leaderboard.refresh();

    const buttons: Button[] = [
      {
        ...LEADERBOARD_BTN,
        draw: (ctx, hit) => {
          this.leaderboardHover = hit;
          drawWideButton(ctx, LEADERBOARD_BTN, hit, "Leaderboard");
        },
        onPress: () => this.ctxMgr.goTo(new LeaderboardScene(this.ctxMgr, this.ctxMgr.renderer)),
      },
      {
        ...NAME_BTN,
        draw: (ctx, hit) => {
          this.nameHover = hit;
          const label = this.ctxMgr.settings.hasName()
            ? `Name: ${this.ctxMgr.settings.playerName}`
            : "Tap to enter name";
          drawWideButton(ctx, NAME_BTN, hit, label, true);
        },
        onPress: () => {
          void this.ctxMgr.promptForName();
        },
      },
      {
        x: VIRTUAL_WIDTH - 36,
        y: 8,
        w: 28,
        h: 28,
        draw: (ctx, hit) =>
          drawIconButton(
            ctx,
            { x: VIRTUAL_WIDTH - 36, y: 8, w: 28, h: 28, draw: () => undefined, onPress: () => undefined },
            hit,
            (c, x, y) => drawMuteIcon(c, x, y, this.ctxMgr.settings.muted),
          ),
        onPress: () => {
          const muted = this.ctxMgr.settings.toggleMuted();
          this.ctxMgr.audio.setMuted(muted);
        },
      },
    ];

    if (this.ctxMgr.mods.isAdmin(this.ctxMgr.settings.playerName)) {
      buttons.push({
        ...MOD_BTN,
        draw: (ctx, hit) => drawWideButton(ctx, MOD_BTN, hit, "Mod menu", true),
        onPress: () => this.openModMenu(),
      });
    }

    this.ctxMgr.buttons.set(buttons);
  }

  exit(): void {
    this.ctxMgr.buttons.clear();
  }

  onFlap(): void {
    this.ctxMgr.audio.resume();
    if (!this.ctxMgr.settings.hasName()) {
      void this.ctxMgr.promptForName().then((ok) => {
        if (ok) this.ctxMgr.goTo(new PlayScene(this.ctxMgr));
      });
      return;
    }
    this.ctxMgr.goTo(new PlayScene(this.ctxMgr));
  }

  private openModMenu(): void {
    if (this.ctxMgr.mods.unlocked) {
      this.ctxMgr.goTo(new ModScene(this.ctxMgr));
      return;
    }
    const code = window.prompt("Enter passcode:") ?? "";
    if (code === "") return;
    if (this.ctxMgr.mods.tryUnlock(code)) {
      this.ctxMgr.goTo(new ModScene(this.ctxMgr));
    } else {
      window.alert("Incorrect passcode.");
    }
  }

  update(dt: number): void {
    this.bg.update(dt, SCROLL_SPEED);
    this.ground.update(dt, SCROLL_SPEED);
    this.kiwis.update(dt, this.bg);
    this.lizard.update(dt);
  }

  render(ctx: CanvasRenderingContext2D, alpha: number): void {
    this.bg.render(ctx, DAY_PALETTE);
    this.kiwis.render(ctx, this.bg, false);
    this.ground.render(ctx);
    this.lizard.render(ctx, alpha);

    ctx.fillStyle = "#1a1f2b";
    ctx.font = "bold 32px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("LIZARD FLAP", VIRTUAL_WIDTH / 2, 110);

    ctx.font = "16px system-ui, sans-serif";
    ctx.fillText("tap / space to flap", VIRTUAL_WIDTH / 2, 150);

    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText("TKWoK Championship", VIRTUAL_WIDTH / 2, 178);

    if (this.ctxMgr.score.high > 0) {
      ctx.fillText(`best: ${this.ctxMgr.score.high}`, VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT - 130);
    }

    ctx.fillStyle = "#1a1f2b";
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("By: Daniel Guzev", VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT - 14);

    void this.leaderboardHover;
    void this.nameHover;
  }
}

function drawWideButton(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; w: number; h: number },
  hit: boolean,
  label: string,
  subtle = false,
): void {
  ctx.fillStyle = hit ? "#7a5e2a" : subtle ? "rgba(245,233,200,0.85)" : "#f5e9c8";
  fillRoundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
  ctx.strokeStyle = "#7a5e2a";
  ctx.lineWidth = 2;
  strokeRoundedRect(ctx, rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1, 8);
  ctx.fillStyle = hit ? "#f5e9c8" : "#7a5e2a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = subtle ? "13px system-ui, sans-serif" : "bold 16px system-ui, sans-serif";
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.textBaseline = "alphabetic";
}

export function drawMuteIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, muted: boolean): void {
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy - 4);
  ctx.lineTo(cx - 1, cy - 4);
  ctx.lineTo(cx + 4, cy - 8);
  ctx.lineTo(cx + 4, cy + 8);
  ctx.lineTo(cx - 1, cy + 4);
  ctx.lineTo(cx - 6, cy + 4);
  ctx.closePath();
  ctx.fill();
  if (muted) {
    ctx.strokeStyle = "#e53935";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - 7);
    ctx.lineTo(cx + 7, cy + 7);
    ctx.stroke();
  } else {
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx + 7, cy, 3, -0.6, 0.6);
    ctx.stroke();
  }
}
