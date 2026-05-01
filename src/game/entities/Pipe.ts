import { PIPE_WIDTH } from "../../config";

export interface AABB {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class Pipe {
  x = 0;
  gapY = 0;
  gapHeight = 0;
  passed = false;
  active = false;

  reset(x: number, gapY: number, gapHeight: number): void {
    this.x = x;
    this.gapY = gapY;
    this.gapHeight = gapHeight;
    this.passed = false;
    this.active = true;
  }

  topRect(): AABB {
    return {
      x: this.x,
      y: 0,
      w: PIPE_WIDTH,
      h: this.gapY - this.gapHeight / 2,
    };
  }

  bottomRect(groundY: number): AABB {
    const top = this.gapY + this.gapHeight / 2;
    return {
      x: this.x,
      y: top,
      w: PIPE_WIDTH,
      h: groundY - top,
    };
  }

  update(dt: number, scrollSpeed: number): void {
    if (!this.active) return;
    this.x -= scrollSpeed * dt;
  }

  render(ctx: CanvasRenderingContext2D, groundY: number): void {
    if (!this.active) return;
    const top = this.topRect();
    const bot = this.bottomRect(groundY);

    drawPineTrunk(ctx, top.x, top.y, top.w, top.h, true);
    drawPineTrunk(ctx, bot.x, bot.y, bot.w, bot.h, false);
  }
}

function drawPineTrunk(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  topColumn: boolean,
): void {
  // bark base
  ctx.fillStyle = "#5a3a22";
  ctx.fillRect(x, y, w, h);

  // shadow side
  ctx.fillStyle = "#3f2614";
  ctx.fillRect(x + w - 8, y, 8, h);

  // highlight side
  ctx.fillStyle = "#7a5232";
  ctx.fillRect(x + 1, y, 4, h);

  // bark grooves — vertical streaks
  ctx.fillStyle = "#3f2614";
  for (let gx = x + 8; gx < x + w - 10; gx += 9) {
    ctx.fillRect(gx, y, 1, h);
  }

  // ring at the cut end so the trunk reads as a clean cross-section
  const ringH = 6;
  const ringY = topColumn ? y + h - ringH : y;
  ctx.fillStyle = "#3f2614";
  ctx.fillRect(x, ringY, w, ringH);
  ctx.fillStyle = "#7a5232";
  ctx.fillRect(x, ringY + ringH - 2, w, 2);
}
