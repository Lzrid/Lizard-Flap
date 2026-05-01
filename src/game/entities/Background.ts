import { GROUND_HEIGHT, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from "../../config";

export interface SkyPalette {
  skyTop: string;
  skyBottom: string;
  treeFar: string;
  treeNear: string;
  cloud: string;
  sun: string;
  isNight: boolean;
}

export const DAY_PALETTE: SkyPalette = {
  skyTop: "#7ed0ff",
  skyBottom: "#cdeec8",
  treeFar: "#3f7a3a",
  treeNear: "#1f5a2c",
  cloud: "rgba(255,255,255,0.85)",
  sun: "#ffe27a",
  isNight: false,
};

export const NIGHT_PALETTE: SkyPalette = {
  skyTop: "#0e1a3a",
  skyBottom: "#23365a",
  treeFar: "#1a3324",
  treeNear: "#0c1e15",
  cloud: "rgba(220,220,255,0.35)",
  sun: "#e8eef7",
  isNight: true,
};

export const TREE_TILE = 280;

export interface TreeSpec {
  x: number;
  height: number;
  width: number;
}

export const NEAR_TREES: TreeSpec[] = [
  { x: 0, height: 110, width: 50 },
  { x: 46, height: 130, width: 56 },
  { x: 100, height: 100, width: 48 },
  { x: 148, height: 140, width: 60 },
  { x: 206, height: 115, width: 52 },
];

const FAR_TREES: TreeSpec[] = [
  { x: 0, height: 70, width: 30 },
  { x: 28, height: 90, width: 36 },
  { x: 64, height: 60, width: 28 },
  { x: 96, height: 100, width: 40 },
  { x: 132, height: 75, width: 32 },
  { x: 168, height: 95, width: 38 },
  { x: 206, height: 65, width: 30 },
  { x: 238, height: 85, width: 34 },
];

export class Background {
  // continuous (non-modulo) world scroll so trees can be addressed by tile index
  private farScroll = 0;
  nearScroll = 0;
  private cloudScroll = 0;
  scrolling = true;

  update(dt: number, scrollSpeed: number): void {
    if (!this.scrolling) return;
    this.farScroll += scrollSpeed * 0.18 * dt;
    this.nearScroll += scrollSpeed * 0.4 * dt;
    this.cloudScroll = (this.cloudScroll + scrollSpeed * 0.08 * dt) % VIRTUAL_WIDTH;
  }

  /** World x of every visible near-tree center (for kiwi alignment). */
  visibleNearTreeCenters(): Array<{ worldX: number; spec: TreeSpec }> {
    const out: Array<{ worldX: number; spec: TreeSpec }> = [];
    const startTile = Math.floor(this.nearScroll / TREE_TILE) - 1;
    const endTile = Math.floor((this.nearScroll + VIRTUAL_WIDTH) / TREE_TILE) + 1;
    for (let tile = startTile; tile <= endTile; tile += 1) {
      for (const t of NEAR_TREES) {
        out.push({ worldX: tile * TREE_TILE + t.x + t.width / 2, spec: t });
      }
    }
    return out;
  }

  render(ctx: CanvasRenderingContext2D, palette: SkyPalette = DAY_PALETTE): void {
    const baseY = VIRTUAL_HEIGHT - GROUND_HEIGHT;

    const grad = ctx.createLinearGradient(0, 0, 0, baseY);
    grad.addColorStop(0, palette.skyTop);
    grad.addColorStop(1, palette.skyBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, baseY);

    if (palette.isNight) drawStars(ctx);

    ctx.fillStyle = palette.sun;
    ctx.beginPath();
    ctx.arc(VIRTUAL_WIDTH - 60, 70, palette.isNight ? 18 : 24, 0, Math.PI * 2);
    ctx.fill();
    if (palette.isNight) {
      ctx.fillStyle = palette.skyTop;
      ctx.beginPath();
      ctx.arc(VIRTUAL_WIDTH - 53, 65, 16, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = palette.cloud;
    drawCloud(ctx, 60 - this.cloudScroll, 90, 0);
    drawCloud(ctx, 220 - this.cloudScroll, 140, 1);
    drawCloud(ctx, 140 - this.cloudScroll, 60, 2);
    drawCloud(ctx, 300 - this.cloudScroll, 100, 3);
    drawCloud(ctx, 60 + VIRTUAL_WIDTH - this.cloudScroll, 90, 4);
    drawCloud(ctx, 220 + VIRTUAL_WIDTH - this.cloudScroll, 140, 0);
    drawCloud(ctx, 140 + VIRTUAL_WIDTH - this.cloudScroll, 60, 2);
    drawCloud(ctx, 300 + VIRTUAL_WIDTH - this.cloudScroll, 100, 3);

    drawTreeline(ctx, palette.treeFar, baseY - 60, baseY, FAR_TREES, this.farScroll);
    drawTreeline(ctx, palette.treeNear, baseY - 30, baseY, NEAR_TREES, this.nearScroll);
  }
}

function drawTreeline(
  ctx: CanvasRenderingContext2D,
  color: string,
  topRef: number,
  baseY: number,
  trees: TreeSpec[],
  scroll: number,
): void {
  ctx.fillStyle = color;
  const startTile = Math.floor(scroll / TREE_TILE) - 1;
  const endTile = Math.floor((scroll + VIRTUAL_WIDTH) / TREE_TILE) + 1;
  for (let tile = startTile; tile <= endTile; tile += 1) {
    for (const t of trees) {
      const x = tile * TREE_TILE + t.x - scroll;
      if (x + t.width < -10 || x > VIRTUAL_WIDTH + 10) continue;
      drawTree(ctx, x, baseY, t.width, Math.max(40, baseY - topRef + t.height - 70));
    }
  }
}

function drawTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  w: number,
  h: number,
): void {
  const cx = x + w / 2;
  ctx.beginPath();
  ctx.moveTo(cx, baseY - h);
  ctx.lineTo(x, baseY - h * 0.55);
  ctx.lineTo(cx - w * 0.25, baseY - h * 0.55);
  ctx.lineTo(x - w * 0.05, baseY - h * 0.25);
  ctx.lineTo(cx - w * 0.2, baseY - h * 0.25);
  ctx.lineTo(x - w * 0.1, baseY);
  ctx.lineTo(x + w + w * 0.1, baseY);
  ctx.lineTo(cx + w * 0.2, baseY - h * 0.25);
  ctx.lineTo(x + w + w * 0.05, baseY - h * 0.25);
  ctx.lineTo(cx + w * 0.25, baseY - h * 0.55);
  ctx.lineTo(x + w, baseY - h * 0.55);
  ctx.closePath();
  ctx.fill();
}

type Puff = [dx: number, dy: number, r: number];

const CLOUD_SHAPES: Puff[][] = [
  [
    [0, 0, 12],
    [12, -4, 10],
    [22, 2, 11],
  ],
  [
    [0, 0, 10],
    [12, -3, 13],
    [26, 0, 14],
    [40, 1, 11],
    [52, 4, 9],
  ],
  [
    [0, 4, 11],
    [10, -8, 13],
    [22, -10, 14],
    [34, -2, 12],
    [16, 6, 10],
  ],
  [
    [0, 2, 8],
    [10, -2, 9],
    [22, -1, 10],
    [34, 3, 8],
  ],
  [
    [0, 0, 13],
    [16, -8, 12],
    [30, -2, 13],
    [40, 6, 9],
    [10, 8, 9],
  ],
];

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, variant: number): void {
  const shape = CLOUD_SHAPES[variant % CLOUD_SHAPES.length]!;
  ctx.beginPath();
  for (const [dx, dy, r] of shape) ctx.moveTo(x + dx + r, y + dy), ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
  ctx.fill();
}

const STARS: Array<[number, number, number]> = [
  [30, 40, 1.2],
  [80, 70, 1.6],
  [140, 30, 1],
  [200, 60, 1.4],
  [260, 35, 1.2],
  [320, 80, 1.6],
  [50, 110, 1],
  [180, 100, 1.2],
  [300, 120, 1.4],
];

function drawStars(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "#fff";
  for (const [x, y, r] of STARS) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}
