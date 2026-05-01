import { fillRoundedRect, strokeRoundedRect } from "../../utils/draw";

export interface Button {
  x: number;
  y: number;
  w: number;
  h: number;
  draw: (ctx: CanvasRenderingContext2D, hit: boolean) => void;
  onPress: () => void;
}

export class ButtonLayer {
  private buttons: Button[] = [];
  private pressed: Button | null = null;

  set(buttons: Button[]): void {
    this.buttons = buttons;
    this.pressed = null;
  }

  clear(): void {
    this.set([]);
  }

  /** Returns true if the press was consumed by a button. */
  press(x: number, y: number): boolean {
    for (const b of this.buttons) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        this.pressed = b;
        b.onPress();
        return true;
      }
    }
    return false;
  }

  release(): void {
    this.pressed = null;
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const b of this.buttons) b.draw(ctx, b === this.pressed);
  }
}

export function drawIconButton(
  ctx: CanvasRenderingContext2D,
  b: Button,
  hit: boolean,
  drawIcon: (ctx: CanvasRenderingContext2D, x: number, y: number) => void,
): void {
  ctx.fillStyle = hit ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.4)";
  fillRoundedRect(ctx, b.x, b.y, b.w, b.h, 6);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  strokeRoundedRect(ctx, b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1, 6);
  drawIcon(ctx, b.x + b.w / 2, b.y + b.h / 2);
}
