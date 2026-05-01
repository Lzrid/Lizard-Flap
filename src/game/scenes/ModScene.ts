import { VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from "../../config";
import { fillRoundedRect, strokeRoundedRect } from "../../utils/draw";
import type { Button } from "../systems/Buttons";
import { drawIconButton } from "../systems/Buttons";
import { ADMIN_NAME } from "../systems/Mods";
import { MenuScene } from "./MenuScene";
import type { GameContext, Scene } from "./Scene";

const PANEL_W = 280;
const ROW_H = 36;
const ROW_GAP = 8;
const FIRST_ROW_Y = 110;

export class ModScene implements Scene {
  constructor(
    private readonly ctxMgr: GameContext,
    private readonly returnTo?: Scene,
  ) {}

  enter(): void {
    this.rebuild();
  }

  exit(): void {
    this.ctxMgr.buttons.clear();
  }

  onFlap(): void {
    this.goBack();
  }

  private goBack(): void {
    this.ctxMgr.goTo(this.returnTo ?? new MenuScene(this.ctxMgr));
  }

  update(_dt: number): void {
    // static
  }

  render(ctx: CanvasRenderingContext2D, _alpha: number): void {
    ctx.fillStyle = "#1a1f2b";
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    ctx.fillStyle = "#f5e9c8";
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("MOD MENU", VIRTUAL_WIDTH / 2, 60);

    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText(`as ${ADMIN_NAME}`, VIRTUAL_WIDTH / 2, 80);

    ctx.fillStyle = "#f5e9c8";
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("starting score / flies apply to the next run", VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT - 24);
  }

  private rebuild(): void {
    const buttons: Button[] = [];
    let y = FIRST_ROW_Y;
    const x = (VIRTUAL_WIDTH - PANEL_W) / 2;

    const addRow = (label: string, onPress: () => void): void => {
      const rowY = y;
      buttons.push({
        x,
        y: rowY,
        w: PANEL_W,
        h: ROW_H,
        draw: (ctx, hit) => drawRowButton(ctx, label, x, rowY, hit),
        onPress,
      });
      y += ROW_H + ROW_GAP;
    };

    addRow(
      `Noclip: ${this.ctxMgr.mods.noclip ? "ON" : "OFF"}`,
      () => {
        this.ctxMgr.mods.noclip = !this.ctxMgr.mods.noclip;
        this.rebuild();
      },
    );
    addRow(
      `Set starting score (${this.ctxMgr.mods.startingScore})`,
      () => this.promptInt("score"),
    );
    addRow(
      `Set starting flies (${this.ctxMgr.mods.startingFlies})`,
      () => this.promptInt("flies"),
    );
    addRow("Reset leaderboard", () => this.confirmResetLeaderboard());
    addRow("Reset player score", () => this.confirmResetPlayerScore());

    buttons.push({
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
      onPress: () => this.goBack(),
    });

    this.ctxMgr.buttons.set(buttons);
  }

  private promptInt(field: "score" | "flies"): void {
    const current =
      field === "score" ? this.ctxMgr.mods.startingScore : this.ctxMgr.mods.startingFlies;
    const raw = window.prompt(`Set starting ${field}:`, String(current));
    if (raw === null) return;
    const n = Math.max(0, Math.floor(Number(raw)) || 0);
    if (field === "score") this.ctxMgr.mods.startingScore = n;
    else this.ctxMgr.mods.startingFlies = n;
    this.rebuild();
  }

  private confirmResetLeaderboard(): void {
    if (!window.confirm("Reset the entire leaderboard? This cannot be undone.")) return;
    void this.ctxMgr.leaderboard
      .resetLeaderboard(this.ctxMgr.settings.playerName)
      .then((success) => {
        window.alert(success ? "Leaderboard cleared." : "Failed to reset leaderboard.");
      });
  }

  private confirmResetPlayerScore(): void {
    if (!window.confirm("Reset YOUR high score and remove your global entry?")) return;
    this.ctxMgr.score.resetHigh();
    const name = this.ctxMgr.settings.playerName;
    if (!name) {
      window.alert("Local high score reset.");
      return;
    }
    void this.ctxMgr.leaderboard.resetPlayer(name, name).then((success) => {
      window.alert(
        success
          ? "Local high score & global entry reset."
          : "Local high score reset; failed to clear global entry.",
      );
    });
  }
}

function drawRowButton(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  hit: boolean,
): void {
  ctx.fillStyle = hit ? "#7a5e2a" : "rgba(245,233,200,0.9)";
  fillRoundedRect(ctx, x, y, PANEL_W, ROW_H, 8);
  ctx.strokeStyle = "#7a5e2a";
  ctx.lineWidth = 2;
  strokeRoundedRect(ctx, x + 0.5, y + 0.5, PANEL_W - 1, ROW_H - 1, 8);
  ctx.fillStyle = hit ? "#f5e9c8" : "#1a1f2b";
  ctx.font = "14px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + PANEL_W / 2, y + ROW_H / 2);
  ctx.textBaseline = "alphabetic";
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
