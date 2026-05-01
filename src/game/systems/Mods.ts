export const ADMIN_NAME = "Daniel Guzev";

export class Mods {
  noclip = false;
  startingScore = 0;
  startingFlies = 0;

  isAdmin(playerName: string): boolean {
    return playerName === ADMIN_NAME;
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
