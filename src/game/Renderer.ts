import { VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from "../config";

export class Renderer {
  readonly ctx: CanvasRenderingContext2D;

  constructor(readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable");
    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;

    canvas.width = VIRTUAL_WIDTH;
    canvas.height = VIRTUAL_HEIGHT;

    this.fitToWindow();
    window.addEventListener("resize", this.fitToWindow);
    window.addEventListener("orientationchange", this.fitToWindow);
  }

  dispose(): void {
    window.removeEventListener("resize", this.fitToWindow);
    window.removeEventListener("orientationchange", this.fitToWindow);
  }

  private readonly fitToWindow = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const scale = Math.max(1, Math.floor(Math.min(w / VIRTUAL_WIDTH, h / VIRTUAL_HEIGHT)));
    const cssW = VIRTUAL_WIDTH * scale;
    const cssH = VIRTUAL_HEIGHT * scale;
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
  };

  clientToCanvas(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * VIRTUAL_WIDTH,
      y: ((clientY - rect.top) / rect.height) * VIRTUAL_HEIGHT,
    };
  }
}
