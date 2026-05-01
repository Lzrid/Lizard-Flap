import { FLAP_IMPULSE, GRAVITY, MAX_FALL_SPEED } from "../../config";
import { clamp, lerp } from "../../utils/math";

export type LizardState = "idle" | "flying" | "dead";

const RADIUS = 14;
const HITBOX_RADIUS = 11;

export class Lizard {
  x: number;
  y: number;
  vy = 0;
  rot = 0;
  state: LizardState = "idle";

  private prevY: number;
  private prevRot = 0;
  private idleAnchorY: number;
  private bobTime = 0;
  private flapTime = 0;
  private propellerAngle = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.prevY = y;
    this.idleAnchorY = y;
  }

  reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.prevY = y;
    this.idleAnchorY = y;
    this.vy = 0;
    this.rot = 0;
    this.prevRot = 0;
    this.state = "idle";
    this.bobTime = 0;
    this.flapTime = 0;
    this.propellerAngle = 0;
  }

  flap(): void {
    if (this.state === "dead") return;
    this.state = "flying";
    this.vy = -FLAP_IMPULSE;
    this.flapTime = 0.15;
  }

  kill(): void {
    this.state = "dead";
  }

  update(dt: number): void {
    this.prevY = this.y;
    this.prevRot = this.rot;

    // propeller spins constantly; faster shortly after a flap
    const propSpeed = this.state === "dead" ? 4 : this.flapTime > 0 ? 32 : 14;
    this.propellerAngle = (this.propellerAngle + propSpeed * dt) % (Math.PI * 2);

    if (this.state === "idle") {
      this.bobTime += dt;
      this.y = this.idleAnchorY + Math.sin(this.bobTime * 4) * 4;
      this.rot = 0;
      return;
    }

    this.vy = clamp(this.vy + GRAVITY * dt, -FLAP_IMPULSE, MAX_FALL_SPEED);
    this.y += this.vy * dt;

    if (this.flapTime > 0) this.flapTime = Math.max(0, this.flapTime - dt);

    const targetRot = clamp(this.vy / 600, -0.5, 1.2);
    this.rot = lerp(this.rot, targetRot, this.vy < 0 ? 0.4 : 0.1);
  }

  hitboxRadius(): number {
    return HITBOX_RADIUS;
  }

  render(ctx: CanvasRenderingContext2D, alpha: number): void {
    const drawY = lerp(this.prevY, this.y, alpha);
    const drawRot = lerp(this.prevRot, this.rot, alpha);

    ctx.save();
    ctx.translate(this.x, drawY);
    ctx.rotate(drawRot);

    const r = RADIUS;
    const isFlapping = this.flapTime > 0;

    // body
    ctx.fillStyle = "#4caf50";
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();

    // belly
    ctx.fillStyle = "#aed581";
    ctx.beginPath();
    ctx.ellipse(0, 4, r * 0.7, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // tail
    ctx.fillStyle = "#388e3c";
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, 0);
    ctx.lineTo(-r * 1.7, -3 + Math.sin(this.bobTime * 12) * 2);
    ctx.lineTo(-r * 0.9, 5);
    ctx.closePath();
    ctx.fill();

    // back legs (small)
    ctx.fillStyle = "#2e7d32";
    ctx.fillRect(-2, r * 0.5, 4, 4);
    ctx.fillRect(-r * 0.5, r * 0.4, 4, 5);

    // eye
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(r * 0.45, -r * 0.25, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(r * 0.55, -r * 0.25, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // tongue flick on flap
    if (isFlapping) {
      ctx.strokeStyle = "#e53935";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(r * 0.9, 0);
      ctx.lineTo(r * 1.5, -2);
      ctx.moveTo(r * 1.5, -2);
      ctx.lineTo(r * 1.7, 0);
      ctx.lineTo(r * 1.5, 2);
      ctx.stroke();
    }

    drawPropellerCap(ctx, r, this.propellerAngle);

    ctx.restore();
  }
}

function drawPropellerCap(ctx: CanvasRenderingContext2D, r: number, propAngle: number): void {
  const headX = r * 0.35;
  const headY = -r * 0.7;

  // brim
  ctx.fillStyle = "#1a1f2b";
  ctx.beginPath();
  ctx.ellipse(headX, headY + 1, 7, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // cap dome — red & blue beanie wedges for the classic propeller-hat look
  ctx.fillStyle = "#d32f2f";
  ctx.beginPath();
  ctx.arc(headX, headY, 6, Math.PI, Math.PI * 1.5, false);
  ctx.lineTo(headX, headY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#fbc02d";
  ctx.beginPath();
  ctx.arc(headX, headY, 6, Math.PI * 1.5, Math.PI * 2, false);
  ctx.lineTo(headX, headY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#1976d2";
  ctx.beginPath();
  ctx.arc(headX, headY, 6, Math.PI * 0.5, Math.PI, false);
  ctx.lineTo(headX, headY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#388e3c";
  ctx.beginPath();
  ctx.arc(headX, headY, 6, 0, Math.PI * 0.5, false);
  ctx.lineTo(headX, headY);
  ctx.closePath();
  ctx.fill();

  // stalk + button
  ctx.strokeStyle = "#1a1f2b";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(headX, headY - 2);
  ctx.lineTo(headX, headY - 6);
  ctx.stroke();

  ctx.fillStyle = "#1a1f2b";
  ctx.beginPath();
  ctx.arc(headX, headY - 6, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // propeller blades
  ctx.save();
  ctx.translate(headX, headY - 7);
  ctx.rotate(propAngle);
  ctx.fillStyle = "#e0e0e0";
  ctx.fillRect(-7, -0.8, 14, 1.6);
  ctx.fillStyle = "#bdbdbd";
  ctx.fillRect(-7, -0.8, 14, 0.8);
  ctx.restore();

  // hub cap nut
  ctx.fillStyle = "#fbc02d";
  ctx.beginPath();
  ctx.arc(headX, headY - 7, 1, 0, Math.PI * 2);
  ctx.fill();
}
