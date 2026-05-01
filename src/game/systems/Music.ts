import type { Settings } from "./Settings";

export type MusicMode = "jazz" | "rock";

interface ModeSpec {
  bpm: number;
  bassPattern: number[];          // semitone offsets per 8th, length 16 (two bars)
  chordPattern: number[][];       // chords per bar (length 4 → quarter notes), each chord = semitone offsets
  drumPattern: Array<"k" | "s" | "h" | "-">; // 16 cells, k=kick s=snare h=hat -=rest
  rootHz: number;                 // fundamental
  bassWave: OscillatorType;
  padWave: OscillatorType;
  bassGain: number;
  padGain: number;
  drumGain: number;
  filterCutoff: number;
}

const C2 = 65.41;
const D2 = 73.42;
const E2 = 82.41;
const G2 = 98.0;

const ratio = (semis: number): number => Math.pow(2, semis / 12);

// Lazy ii-V-I in C: Dm7 (D F A C) | G7 (G B D F) | Cmaj7 (C E G B) | Cmaj7
// Bass plays a walking-style line outlining each chord
const JAZZ: ModeSpec = {
  bpm: 84,
  bassPattern: [
    /* Dm7 */ 0, 0, 7, 5,   /* (D F A C-ish via offsets from D2)        */
    /* G7  */ 0, 4, 7, 5,
    /* Cm7 */ 0, 4, 7, 11,
    /* Cm7 */ 11, 9, 7, 4,
  ],
  chordPattern: [
    [0, 3, 7, 10], // Dm7 voicing on D
    [0, 4, 7, 10], // G7 voicing on G
    [0, 4, 7, 11], // Cmaj7 on C
    [0, 4, 7, 11],
  ],
  drumPattern: [
    "h","-","h","h","-","h","h","-",
    "h","-","h","h","-","h","h","-",
  ],
  rootHz: D2, // walking line is in scale of D-ish; we'll override per-bar root
  bassWave: "sine",
  padWave: "triangle",
  bassGain: 0.18,
  padGain: 0.06,
  drumGain: 0.12,
  filterCutoff: 1400,
};

// Driving rock/dubstep groove in E minor: i - VI - VII - i
const ROCK: ModeSpec = {
  bpm: 132,
  bassPattern: [
    0, 0, 12, 0,  0, 0, 7, 0,
    0, 0, 12, 0,  0, 0, 7, 0,
  ],
  chordPattern: [
    [0, 7, 12], // E5 power
    [-4, 3, 8], // C5
    [-2, 5, 10], // D5
    [0, 7, 12], // E5
  ],
  drumPattern: [
    "k","-","h","-","s","-","h","-",
    "k","k","h","-","s","-","h","-",
  ],
  rootHz: E2,
  bassWave: "sawtooth",
  padWave: "square",
  bassGain: 0.22,
  padGain: 0.09,
  drumGain: 0.22,
  filterCutoff: 900,
};

const BAR_ROOTS_JAZZ = [D2, G2, C2 * 2, C2 * 2];
const BAR_ROOTS_ROCK = [E2, C2 * ratio(8), D2 * ratio(0), E2];

const SCHEDULE_AHEAD = 0.12;
const TICK_INTERVAL_MS = 25;

export class Music {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private nextNoteTime = 0;
  private step = 0;
  private mode: MusicMode = "jazz";
  private timer: number | null = null;
  private running = false;

  constructor(private readonly settings: Settings) {}

  attach(ctx: AudioContext): void {
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.settings.muted ? 0 : 0.5;
    this.filter = ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = JAZZ.filterCutoff;
    this.filter.connect(this.master).connect(ctx.destination);
  }

  setMuted(muted: boolean): void {
    if (!this.master || !this.ctx) return;
    const target = muted ? 0 : 0.5;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.2);
  }

  setMode(mode: MusicMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    if (this.filter && this.ctx) {
      const spec = mode === "jazz" ? JAZZ : ROCK;
      this.filter.frequency.cancelScheduledValues(this.ctx.currentTime);
      this.filter.frequency.linearRampToValueAtTime(spec.filterCutoff, this.ctx.currentTime + 0.4);
    }
  }

  start(): void {
    if (this.running || !this.ctx || !this.master) return;
    this.running = true;
    this.step = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.timer = window.setInterval(() => this.scheduler(), TICK_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.running = false;
  }

  private spec(): ModeSpec {
    return this.mode === "jazz" ? JAZZ : ROCK;
  }

  private barRoots(): number[] {
    return this.mode === "jazz" ? BAR_ROOTS_JAZZ : BAR_ROOTS_ROCK;
  }

  private scheduler(): void {
    if (!this.ctx || !this.master || !this.filter) return;
    const now = this.ctx.currentTime;
    while (this.nextNoteTime < now + SCHEDULE_AHEAD) {
      this.scheduleStep(this.step, this.nextNoteTime);
      const stepDur = 60 / this.spec().bpm / 2; // 8th note
      this.nextNoteTime += stepDur;
      this.step = (this.step + 1) % 16;
    }
  }

  private scheduleStep(step: number, when: number): void {
    if (!this.ctx || !this.filter) return;
    const spec = this.spec();
    const barIdx = Math.floor(step / 4);
    const root = this.barRoots()[barIdx]!;

    // bass on every 8th
    const bassSemis = spec.bassPattern[step]!;
    const bassFreq = root * ratio(bassSemis);
    this.tone(when, bassFreq, 0.16, spec.bassWave, spec.bassGain, this.filter);

    // pad on quarter notes 1 & 3 of each bar
    if (step % 8 === 0 || step % 8 === 4) {
      const chord = spec.chordPattern[barIdx]!;
      for (const semi of chord) {
        this.tone(when + 0.005, root * ratio(semi), 0.5, spec.padWave, spec.padGain, this.filter);
      }
    }

    // drums per pattern
    const drum = spec.drumPattern[step]!;
    if (drum === "k") this.kick(when, spec.drumGain);
    else if (drum === "s") this.snare(when, spec.drumGain);
    else if (drum === "h") this.hat(when, spec.drumGain * 0.6);
  }

  private tone(when: number, freq: number, dur: number, wave: OscillatorType, gain: number, dest: AudioNode): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g).connect(dest);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }

  private kick(when: number, gain: number): void {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, when);
    osc.frequency.exponentialRampToValueAtTime(40, when + 0.15);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.18);
    osc.connect(g).connect(this.master);
    osc.start(when);
    osc.stop(when + 0.22);
  }

  private snare(when: number, gain: number): void {
    if (!this.ctx || !this.master) return;
    const dur = 0.12;
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1200;
    src.connect(hp).connect(g).connect(this.master);
    src.start(when);
  }

  private hat(when: number, gain: number): void {
    if (!this.ctx || !this.master) return;
    const dur = 0.04;
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 6000;
    src.connect(hp).connect(g).connect(this.master);
    src.start(when);
  }
}
