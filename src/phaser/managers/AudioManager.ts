export type SfxName = 'shoot' | 'pop' | 'drop' | 'combo' | 'levelComplete' | 'gameOver' | 'uiClick';

interface AudioSettings {
  sfxVolume: number;
  musicVolume: number;
  muted: boolean;
}

/**
 * Small synthesized-SFX engine built on the Web Audio API. The project ships
 * no audio asset files, so rather than block gameplay on missing sound
 * effects this generates short, cheap procedural blips for each game event.
 * All playback funnels through here so scenes never touch WebAudio directly.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private settings: AudioSettings = { sfxVolume: 1, musicVolume: 0.7, muted: false };

  configure(settings: AudioSettings): void {
    this.settings = settings;
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  /** Must be called from a user gesture (pointerdown) to satisfy browser autoplay policies. */
  unlock(): void {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume();
    }
  }

  play(name: SfxName): void {
    if (this.settings.muted || this.settings.sfxVolume <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const recipe = RECIPES[name];
    const now = ctx.currentTime;
    for (const tone of recipe) {
      this.playTone(ctx, now + tone.delay, tone.freqStart, tone.freqEnd, tone.duration, tone.type, tone.gain);
    }
  }

  private playTone(
    ctx: AudioContext,
    startTime: number,
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    gainPeak: number,
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), startTime + duration);

    const peak = gainPeak * this.settings.sfxVolume;
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), startTime + duration * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }
}

interface ToneRecipe {
  delay: number;
  freqStart: number;
  freqEnd: number;
  duration: number;
  type: OscillatorType;
  gain: number;
}

const RECIPES: Record<SfxName, ToneRecipe[]> = {
  shoot: [{ delay: 0, freqStart: 620, freqEnd: 880, duration: 0.09, type: 'triangle', gain: 0.18 }],
  pop: [{ delay: 0, freqStart: 900, freqEnd: 300, duration: 0.14, type: 'sine', gain: 0.22 }],
  drop: [{ delay: 0, freqStart: 500, freqEnd: 180, duration: 0.22, type: 'sine', gain: 0.15 }],
  combo: [
    { delay: 0, freqStart: 700, freqEnd: 1000, duration: 0.1, type: 'triangle', gain: 0.2 },
    { delay: 0.08, freqStart: 900, freqEnd: 1300, duration: 0.12, type: 'triangle', gain: 0.2 },
  ],
  levelComplete: [
    { delay: 0, freqStart: 523, freqEnd: 523, duration: 0.14, type: 'triangle', gain: 0.22 },
    { delay: 0.14, freqStart: 659, freqEnd: 659, duration: 0.14, type: 'triangle', gain: 0.22 },
    { delay: 0.28, freqStart: 784, freqEnd: 784, duration: 0.22, type: 'triangle', gain: 0.24 },
    { delay: 0.5, freqStart: 1047, freqEnd: 1047, duration: 0.3, type: 'triangle', gain: 0.26 },
  ],
  gameOver: [
    { delay: 0, freqStart: 400, freqEnd: 300, duration: 0.2, type: 'sawtooth', gain: 0.16 },
    { delay: 0.2, freqStart: 300, freqEnd: 150, duration: 0.35, type: 'sawtooth', gain: 0.16 },
  ],
  uiClick: [{ delay: 0, freqStart: 500, freqEnd: 650, duration: 0.06, type: 'square', gain: 0.1 }],
};
