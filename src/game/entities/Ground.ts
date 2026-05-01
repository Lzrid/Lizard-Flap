import { GROUND_HEIGHT, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from "../../config";

export class Ground {
  private offset = 0;
  scrolling = true;

  update(dt: number, scrollSpeed: number): void {
    if (!this.scrolling) return;
    this.offset = (this.offset + scrollSpeed * dt) % 24;
  }

  topY(): number {
    return VIRTUAL_HEIGHT - GROUND_HEIGHT;
  }

  render(ctx: CanvasRenderingContext2D, palette = defaultPalette): void {
    const y = this.topY();
    ctx.fillStyle = palette.sand;
    ctx.fillRect(0, y, VIRTUAL_WIDTH, GROUND_HEIGHT);

    ctx.fillStyle = palette.sandEdge;
    ctx.fillRect(0, y, VIRTUAL_WIDTH, 6);

    ctx.fillStyle = palette.sandDots;
    for (let x = -24 + (this.offset % 24); x < VIRTUAL_WIDTH; x += 24) {
      ctx.fillRect(x, y + 12, 12, 4);
      ctx.fillRect(x + 4, y + 30, 8, 4);
    }
  }
}

export interface GroundPalette {
  sand: string;
  sandEdge: string;
  sandDots: string;
}

const defaultPalette: GroundPalette = {
  sand: "#5b8a3a",
  sandEdge: "#3f6a25",
  sandDots: "#2f4f1c",
};
