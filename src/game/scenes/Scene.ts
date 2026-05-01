import type { Audio } from "../systems/Audio";
import type { Effects } from "../systems/Effects";
import type { Mods } from "../systems/Mods";
import type { Score } from "../systems/Score";
import type { Settings } from "../systems/Settings";
import type { ButtonLayer } from "../systems/Buttons";
import type { Leaderboard } from "../systems/Leaderboard";
import type { Renderer } from "../Renderer";

export interface GameContext {
  goTo(scene: Scene): void;
  audio: Audio;
  effects: Effects;
  score: Score;
  settings: Settings;
  buttons: ButtonLayer;
  leaderboard: Leaderboard;
  renderer: Renderer;
  mods: Mods;
  /** Prompts the user for a name (uses native prompt for cross-platform input). Resolves true if a valid, unique name was set. */
  promptForName(): Promise<boolean>;
}

export interface Scene {
  enter?(): void;
  exit?(): void;
  onFlap?(): void;
  onPauseToggle?(): void;
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D, alpha: number): void;
}
