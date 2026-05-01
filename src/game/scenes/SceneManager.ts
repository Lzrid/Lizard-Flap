import type { Scene } from "./Scene";

export class SceneManager {
  private current: Scene | null = null;

  goTo(scene: Scene): void {
    this.current?.exit?.();
    this.current = scene;
    this.current.enter?.();
  }

  active(): Scene | null {
    return this.current;
  }

  flap(): void {
    this.current?.onFlap?.();
  }

  pauseToggle(): void {
    this.current?.onPauseToggle?.();
  }

  update(dt: number): void {
    this.current?.update(dt);
  }

  render(ctx: CanvasRenderingContext2D, alpha: number): void {
    this.current?.render(ctx, alpha);
  }
}
