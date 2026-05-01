import { NIGHT_THRESHOLD, PIPE_WIDTH, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from "../../config";
import { Background, DAY_PALETTE, NIGHT_PALETTE } from "../entities/Background";
import { FlyFlock } from "../entities/FlyFlock";
import { Ground } from "../entities/Ground";
import { Hawks } from "../entities/Hawks";
import { KiwiFlock } from "../entities/KiwiFlock";
import { Lizard } from "../entities/Lizard";
import { PipePool } from "../entities/PipePool";
import { drawIconButton } from "../systems/Buttons";
import { circleVsCircle, circleVsRect } from "../systems/Collision";
import { difficultyFor } from "../systems/Difficulty";
import { Particles } from "../systems/Particles";
import { fillRoundedRect } from "../../utils/draw";
import { GameOverScene } from "./GameOverScene";
import { drawMuteIcon } from "./MenuScene";
import { PauseScene } from "./PauseScene";
import type { GameContext, Scene } from "./Scene";

type Phase = "ready" | "playing" | "dying";

export class PlayScene implements Scene {
  private readonly bg = new Background();
  private readonly ground = new Ground();
  private readonly kiwis = new KiwiFlock();
  private readonly flies = new FlyFlock();
  private readonly hawks = new Hawks();
  private readonly pipes: PipePool;
  private readonly lizard = new Lizard(VIRTUAL_WIDTH * 0.3, VIRTUAL_HEIGHT * 0.5);
  private readonly particles = new Particles();
  private phase: Phase = "ready";
  private deathTimer = 0;

  constructor(private readonly ctxMgr: GameContext) {
    this.ctxMgr.score.reset();
    const startScore = this.ctxMgr.mods.consumeStartingScore();
    const startFlies = this.ctxMgr.mods.consumeStartingFlies();
    if (startScore > 0) this.ctxMgr.score.current = startScore;
    if (startFlies > 0) this.ctxMgr.score.flies = startFlies;
    const initial = difficultyFor(this.ctxMgr.score.current);
    this.pipes = new PipePool({ scrollSpeed: initial.scrollSpeed, pipeGap: initial.pipeGap });
  }

  enter(): void {
    this.ctxMgr.audio.music.setMode("jazz");
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
            drawPauseIcon,
          ),
        onPress: () => this.onPauseToggle(),
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
    ]);
  }

  exit(): void {
    this.ctxMgr.buttons.clear();
  }

  onPauseToggle(): void {
    if (this.phase !== "playing") return;
    this.ctxMgr.goTo(new PauseScene(this.ctxMgr, this));
  }

  onFlap(): void {
    if (this.phase === "ready") {
      this.phase = "playing";
    }
    if (this.phase === "playing") {
      this.lizard.flap();
      this.ctxMgr.audio.play("flap");
      this.particles.emitPuff(this.lizard.x - 8, this.lizard.y + 4, 5);
    }
  }

  update(dt: number): void {
    this.ctxMgr.effects.tick(dt);

    const score = this.ctxMgr.score.current;
    const diff = difficultyFor(score);
    this.pipes.scrollSpeed = diff.scrollSpeed;
    this.pipes.pipeGap = diff.pipeGap;
    this.ctxMgr.audio.music.setMode(score >= NIGHT_THRESHOLD ? "rock" : "jazz");

    this.bg.update(dt, diff.scrollSpeed);
    this.kiwis.update(dt, this.bg);

    if (this.phase === "ready") {
      this.lizard.update(dt);
      this.ground.update(dt, diff.scrollSpeed);
      return;
    }

    if (this.ctxMgr.effects.isPaused()) {
      this.particles.update(dt);
      return;
    }

    if (this.phase === "dying") {
      this.lizard.update(dt);
      this.particles.update(dt);
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) {
        const result = this.ctxMgr.score.finalize();
        this.ctxMgr.goTo(new GameOverScene(this.ctxMgr, result));
      }
      return;
    }

    this.lizard.update(dt);
    this.pipes.update(dt);
    this.ground.update(dt, diff.scrollSpeed);
    this.flies.update(dt, diff.scrollSpeed, this.pipes.pipes);
    this.hawks.update(dt, diff.scrollSpeed);
    this.particles.update(dt);

    const groundY = this.ground.topY();
    const liz = { x: this.lizard.x, y: this.lizard.y, r: this.lizard.hitboxRadius() };
    const noclip = this.ctxMgr.mods.noclip;

    if (noclip) {
      if (this.lizard.y + liz.r > groundY) {
        this.lizard.y = groundY - liz.r;
        if (this.lizard.vy > 0) this.lizard.vy = 0;
      }
      if (this.lizard.y - liz.r < 0) {
        this.lizard.y = liz.r;
        if (this.lizard.vy < 0) this.lizard.vy = 0;
      }
    } else if (this.lizard.y + liz.r >= groundY || this.lizard.y - liz.r <= 0) {
      this.die();
      return;
    }

    for (const p of this.pipes.active()) {
      if (!noclip && (circleVsRect(liz, p.topRect()) || circleVsRect(liz, p.bottomRect(groundY)))) {
        this.die();
        return;
      }
      if (!p.passed && p.x + PIPE_WIDTH < this.lizard.x) {
        p.passed = true;
        this.ctxMgr.score.increment();
        this.ctxMgr.audio.play("score");
      }
    }

    for (const f of this.flies.active()) {
      if (circleVsCircle(liz, { x: f.x, y: f.y, r: f.r })) {
        f.consume();
        this.ctxMgr.score.collectFly();
        this.ctxMgr.audio.play("lick");
        this.particles.emitPuff(f.x, f.y, 4);
      }
    }

    for (const h of this.hawks.active()) {
      if (!noclip && circleVsCircle(liz, h)) {
        this.die();
        return;
      }
    }
  }

  private die(): void {
    this.phase = "dying";
    this.lizard.kill();
    this.ground.scrolling = false;
    this.deathTimer = 0.6;
    this.ctxMgr.audio.play("hit");
    this.ctxMgr.audio.play("die");
    this.ctxMgr.effects.shake(0.7);
    this.ctxMgr.effects.triggerHitStop();
  }

  render(ctx: CanvasRenderingContext2D, alpha: number): void {
    const palette = this.ctxMgr.score.current >= NIGHT_THRESHOLD ? NIGHT_PALETTE : DAY_PALETTE;
    const offset = this.ctxMgr.effects.shakeOffset();
    ctx.save();
    ctx.translate(offset.x, offset.y);

    this.bg.render(ctx, palette);
    this.kiwis.render(ctx, this.bg, palette === NIGHT_PALETTE);
    this.pipes.render(ctx, this.ground.topY());
    this.flies.render(ctx);
    this.hawks.render(ctx);
    this.ground.render(ctx);
    this.particles.render(ctx);
    this.lizard.render(ctx, alpha);

    ctx.restore();

    const flash = this.ctxMgr.effects.flash();
    if (flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${flash * 0.6})`;
      ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    }

    if (this.phase === "ready") {
      ctx.fillStyle = "rgba(26,31,43,0.9)";
      ctx.font = "bold 22px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("get ready", VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT * 0.3);
      ctx.font = "14px system-ui, sans-serif";
      ctx.fillText("tap to flap", VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT * 0.3 + 24);
    } else {
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#1a1f2b";
      ctx.lineWidth = 4;
      ctx.font = "bold 36px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.strokeText(String(this.ctxMgr.score.current), VIRTUAL_WIDTH / 2, 70);
      ctx.fillText(String(this.ctxMgr.score.current), VIRTUAL_WIDTH / 2, 70);
    }

    drawFlyHud(ctx, this.ctxMgr.score.flies);
  }
}

function drawFlyHud(ctx: CanvasRenderingContext2D, flies: number): void {
  const cx = VIRTUAL_WIDTH / 2;
  const fpsLeft = cx - 36;
  const boxW = 56;
  const boxH = 20;
  const x = fpsLeft - 8 - boxW;
  const y = 4;

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  fillRoundedRect(ctx, x, y, boxW, boxH, 6);

  // tiny fly icon
  const fx = x + 10;
  const fy = y + boxH / 2;
  ctx.fillStyle = "rgba(220,230,255,0.7)";
  ctx.beginPath();
  ctx.ellipse(fx - 1.5, fy - 1, 3, 1.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(fx + 1.5, fy - 1, 3, 1.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.ellipse(fx, fy, 2.4, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f0e0a8";
  ctx.font = "12px ui-monospace, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`× ${flies}`, x + 20, y + boxH / 2);
  ctx.restore();
}

function drawPauseIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.fillStyle = "#fff";
  ctx.fillRect(cx - 5, cy - 6, 3, 12);
  ctx.fillRect(cx + 2, cy - 6, 3, 12);
}
