export const ADMIN_NAME = "Daniel Guzev";
const PASSCODE = "2319";

export class Mods {
  noclip = false;
  startingScore = 0;
  startingFlies = 0;
  /** Per-session: must enter the passcode once before ModScene opens. */
  unlocked = false;

  isAdmin(playerName: string): boolean {
    return playerName === ADMIN_NAME;
  }

  tryUnlock(code: string): boolean {
    if (code === PASSCODE) {
      this.unlocked = true;
      return true;
    }
    return false;
  }

  lock(): void {
    this.unlocked = false;
  }

  /** Returns and clears the queued starting score so it only applies to the next run. */
  consumeStartingScore(): number {
    const v = this.startingScore;
    this.startingScore = 0;
    return v;
  }

  consumeStartingFlies(): number {
    const v = this.startingFlies;
    this.startingFlies = 0;
    return v;
  }
}
