export class Rng {
  private state: number;

  constructor(seed = (Math.random() * 0x7fffffff) | 0) {
    this.state = seed || 1;
  }

  next(): number {
    let x = this.state | 0;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x | 0;
    return ((x >>> 0) % 0x100000000) / 0x100000000;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}
