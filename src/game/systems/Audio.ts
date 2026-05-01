import { Music } from "./Music";
import type { Settings } from "./Settings";

export type SfxName = "flap" | "score" | "hit" | "die" | "lick";

export class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  readonly music: Music;

  constructor(private readonly settings: Settings) {
    this.music = new Music(settings);
  }

  private ensureCtx(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.3;
    this.master.connect(this.ctx.destination);
    this.music.attach(this.ctx);
    return this.ctx;
  }

  resume(): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => undefined);
    this.music.start();
  }

  setMuted(muted: boolean): void {
    this.music.setMuted(muted);
  }

  play(name: SfxName): void {
    if (this.settings.muted) return;
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    switch (name) {
      case "flap":
        this.tone(ctx, 600, 900, 0.08, "triangle");
        break;
      case "score":
        this.tone(ctx, 880, 1320, 0.12, "square", 0.5);
        break;
      case "hit":
        this.noise(ctx, 0.14);
        break;
      case "die":
        this.tone(ctx, 440, 110, 0.5, "sawtooth", 0.7);
        break;
      case "lick":
        this.lick(ctx);
        break;
    }
  }

  private lick(ctx: AudioContext): void {
    if (!this.master) return;
    const now = ctx.currentTime;

    // 1) bandpassed noise burst → wet "smack" / "ssp"
    const burstDur = 0.11;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * burstDur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(2800, now);
    bp.frequency.exponentialRampToValueAtTime(900, now + burstDur);
    bp.Q.value = 4;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.6, now + 0.005);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + burstDur);
    src.connect(bp).connect(noiseGain).connect(this.master);
    src.start(now);

    // 2) quick downward sine sweep → tongue "thock"
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.07);
    oscGain.gain.setValueAtTime(0.0001, now);
    oscGain.gain.exponentialRampToValueAtTime(0.4, now + 0.005);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    osc.connect(oscGain).connect(this.master);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  private tone(
    ctx: AudioContext,
    fromHz: number,
    toHz: number,
    durationS: number,
    type: OscillatorType,
    volume = 1,
  ): void {
    if (!this.master) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(fromHz, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, toHz), now + durationS);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationS);
    osc.connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + durationS + 0.02);
  }

  private noise(ctx: AudioContext, durationS: number): void {
    if (!this.master) return;
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, Math.floor(sampleRate * durationS), sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.6;
    src.connect(gain).connect(this.master);
    src.start();
  }
}
