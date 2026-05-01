import { HIT_STOP_SECONDS, SHAKE_TRAUMA_DECAY } from "../../config";

export class Effects {
  private trauma = 0;
  private hitStop = 0;
  private flashOpacity = 0;
  reducedMotion: boolean;

  constructor() {
    this.reducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  shake(amount: number): void {
    if (this.reducedMotion) return;
    this.trauma = Math.min(1, this.trauma + amount);
  }

  triggerHitStop(): void {
    this.hitStop = HIT_STOP_SECONDS;
    this.flashOpacity = 1;
  }

  isPaused(): boolean {
    return this.hitStop > 0;
  }

  tick(dt: number): void {
    if (this.hitStop > 0) this.hitStop = Math.max(0, this.hitStop - dt);
    if (this.trauma > 0) this.trauma = Math.max(0, this.trauma - SHAKE_TRAUMA_DECAY * dt);
    if (this.flashOpacity > 0) this.flashOpacity = Math.max(0, this.flashOpacity - dt * 4);
  }

  shakeOffset(): { x: number; y: number } {
    if (this.trauma <= 0) return { x: 0, y: 0 };
    const t = this.trauma * this.trauma;
    return {
      x: (Math.random() * 2 - 1) * 8 * t,
      y: (Math.random() * 2 - 1) * 8 * t,
    };
  }

  flash(): number {
    return this.flashOpacity;
  }
}
