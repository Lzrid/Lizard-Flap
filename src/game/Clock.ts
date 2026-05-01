import { FIXED_DT, MAX_FRAME_DT } from "../config";

export interface ClockStep {
  steps: number;
  alpha: number;
}

export class Clock {
  private accumulator = 0;

  reset(): void {
    this.accumulator = 0;
  }

  step(frameDtSeconds: number): ClockStep {
    let dt = frameDtSeconds;
    if (dt < 0) dt = 0;
    if (dt > MAX_FRAME_DT) dt = MAX_FRAME_DT;

    this.accumulator += dt;

    let steps = 0;
    while (this.accumulator >= FIXED_DT) {
      this.accumulator -= FIXED_DT;
      steps += 1;
    }

    return { steps, alpha: this.accumulator / FIXED_DT };
  }
}
