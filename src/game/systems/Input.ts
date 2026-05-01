import type { Renderer } from "../Renderer";

type FlapListener = () => void;
type PressListener = (x: number, y: number) => boolean;

export class Input {
  private readonly flapListeners = new Set<FlapListener>();
  private readonly pressListeners: PressListener[] = [];
  private readonly pauseListeners = new Set<() => void>();
  private readonly muteListeners = new Set<() => void>();
  private readonly actionListeners = new Set<() => void>();

  constructor(private readonly renderer: Renderer) {
    const canvas = renderer.canvas;
    canvas.addEventListener("pointerdown", this.onPointer);
    window.addEventListener("keydown", this.onKey);
    canvas.addEventListener("touchstart", this.preventDefault, { passive: false });
  }

  dispose(): void {
    const canvas = this.renderer.canvas;
    canvas.removeEventListener("pointerdown", this.onPointer);
    window.removeEventListener("keydown", this.onKey);
    canvas.removeEventListener("touchstart", this.preventDefault);
  }

  onFlap(fn: FlapListener): () => void {
    this.flapListeners.add(fn);
    return () => this.flapListeners.delete(fn);
  }

  /** Press handlers run in registration order; return true to consume (skips flap). */
  onPress(fn: PressListener): () => void {
    this.pressListeners.push(fn);
    return () => {
      const i = this.pressListeners.indexOf(fn);
      if (i >= 0) this.pressListeners.splice(i, 1);
    };
  }

  onPauseToggle(fn: () => void): () => void {
    this.pauseListeners.add(fn);
    return () => this.pauseListeners.delete(fn);
  }

  onToggleMute(fn: () => void): () => void {
    this.muteListeners.add(fn);
    return () => this.muteListeners.delete(fn);
  }

  /** Fires exactly once per user pointerdown / actionable keypress. */
  onAction(fn: () => void): () => void {
    this.actionListeners.add(fn);
    return () => this.actionListeners.delete(fn);
  }

  private emitAction(): void {
    for (const fn of this.actionListeners) fn();
  }

  private readonly onPointer = (e: PointerEvent): void => {
    this.emitAction();
    const { x, y } = this.renderer.clientToCanvas(e.clientX, e.clientY);
    for (const fn of this.pressListeners) {
      if (fn(x, y)) return;
    }
    for (const fn of this.flapListeners) fn();
  };

  private readonly onKey = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
      e.preventDefault();
      this.emitAction();
      for (const fn of this.flapListeners) fn();
    } else if (e.code === "KeyP" || e.code === "Escape") {
      e.preventDefault();
      this.emitAction();
      for (const fn of this.pauseListeners) fn();
    } else if (e.code === "KeyM") {
      e.preventDefault();
      this.emitAction();
      for (const fn of this.muteListeners) fn();
    }
  };

  private readonly preventDefault = (e: Event): void => {
    e.preventDefault();
  };
}
