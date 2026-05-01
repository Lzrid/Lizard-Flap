import { VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from "../config";
import { isValidName, sanitizeName } from "../utils/name";
import { Clock } from "./Clock";
import { DebugOverlay } from "./DebugOverlay";
import { Renderer } from "./Renderer";
import { MenuScene } from "./scenes/MenuScene";
import { SceneManager } from "./scenes/SceneManager";
import type { GameContext, Scene } from "./scenes/Scene";
import { Audio } from "./systems/Audio";
import { ButtonLayer } from "./systems/Buttons";
import { Effects } from "./systems/Effects";
import { Input } from "./systems/Input";
import { Leaderboard } from "./systems/Leaderboard";
import { Score } from "./systems/Score";
import { Settings } from "./systems/Settings";

export class Game {
  private readonly renderer: Renderer;
  private readonly input: Input;
  private readonly scenes = new SceneManager();
  private readonly clock = new Clock();
  private readonly debug = DebugOverlay.fromEnv();
  private readonly score = new Score();
  private readonly settings = new Settings();
  private readonly audio: Audio;
  private readonly effects = new Effects();
  private readonly buttons = new ButtonLayer();
  private readonly leaderboard = new Leaderboard();
  private rafId = 0;
  private lastTime = 0;
  private running = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.input = new Input(this.renderer);
    this.audio = new Audio(this.settings);

    const goTo = (scene: Scene): void => this.scenes.goTo(scene);
    const ctxMgr: GameContext = {
      goTo,
      audio: this.audio,
      effects: this.effects,
      score: this.score,
      settings: this.settings,
      buttons: this.buttons,
      leaderboard: this.leaderboard,
      renderer: this.renderer,
      promptForName: () => this.promptForName(),
    };

    this.input.onAction(() => this.debug.recordClick());
    this.input.onPress((x, y) => this.buttons.press(x, y));
    this.input.onFlap(() => {
      this.audio.resume();
      this.scenes.flap();
    });
    this.input.onPauseToggle(() => this.scenes.pauseToggle());
    this.input.onToggleMute(() => {
      const muted = this.settings.toggleMuted();
      this.audio.setMuted(muted);
    });

    this.scenes.goTo(new MenuScene(ctxMgr));
    void this.leaderboard.refresh();
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.input.dispose();
    this.renderer.dispose();
  }

  private async promptForName(): Promise<boolean> {
    const current = this.settings.playerName;
    const raw = window.prompt("Enter your name (English letters/digits, max 14 chars):", current) ?? "";
    const trimmed = sanitizeName(raw);
    if (trimmed.length === 0) return false;
    if (!isValidName(trimmed)) {
      window.alert("Name must use only English letters, digits, spaces, '-' or '_'.");
      return false;
    }
    if (trimmed === current && this.settings.hasName()) return true;

    const result = await this.leaderboard.claimName(trimmed);
    if (result === "taken") {
      window.alert(`The name "${trimmed}" is already taken — please choose another.`);
      return false;
    }
    if (result === "invalid") {
      window.alert("Name must use only English letters, digits, spaces, '-' or '_'.");
      return false;
    }
    if (result === "error") {
      window.alert("Couldn't reach the leaderboard server. Try again later.");
      return false;
    }

    this.settings.setPlayerName(trimmed);
    return this.settings.hasName();
  }

  private readonly onVisibility = (): void => {
    if (document.hidden) {
      this.lastTime = performance.now();
      this.clock.reset();
      this.scenes.pauseToggle();
    }
  };

  private readonly frame = (now: number): void => {
    if (!this.running) return;

    const frameDt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    const { steps, alpha } = this.clock.step(frameDt);
    for (let i = 0; i < steps; i += 1) {
      this.scenes.update(1 / 60);
    }

    const { ctx } = this.renderer;
    ctx.fillStyle = "#1a1f2b";
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    this.scenes.render(ctx, alpha);
    this.buttons.render(ctx);
    this.debug.sample(frameDt);
    this.debug.render(ctx, VIRTUAL_WIDTH);

    this.rafId = requestAnimationFrame(this.frame);
  };
}
