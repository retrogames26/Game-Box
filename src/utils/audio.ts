/**
 * Retro Chiptune & Arcade Sound Synthesizer via Web Audio API.
 * High-performance, zero asset downloads, customizable, zero latency.
 */

class SoundSystem {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private volume: number = 0.3;

  constructor() {
    // Check saved audio preference
    const saved = localStorage.getItem('arcade_sound_enabled');
    if (saved !== null) {
      this.soundEnabled = saved === 'true';
    }
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public toggleSound(): boolean {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem('arcade_sound_enabled', String(this.soundEnabled));
    if (this.soundEnabled) {
      this.playInsertCoin();
    }
    return this.soundEnabled;
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    localStorage.setItem('arcade_sound_enabled', String(enabled));
  }

  private playTone(freqs: number[], durations: number[], type: OscillatorType = 'square', gainScale: number = 1) {
    if (!this.soundEnabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      let startTime = this.ctx.currentTime;
      for (let i = 0; i < freqs.length; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freqs[i], startTime);

        gain.gain.setValueAtTime(this.volume * gainScale, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + durations[i]);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + durations[i]);

        startTime += durations[i];
      }
    } catch {
      // Audio context might be restricted before interaction
    }
  }

  // --- UI & System Sounds ---
  public playClick() {
    this.playTone([440, 880], [0.03, 0.04], 'sine', 0.5);
  }

  public playSelect() {
    this.playTone([523.25, 659.25], [0.06, 0.08], 'triangle', 0.6);
  }

  public playInsertCoin() {
    this.playTone([987.77, 1318.5], [0.08, 0.25], 'square', 0.8);
  }

  public playWinFanfare() {
    this.playTone(
      [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5],
      [0.08, 0.08, 0.08, 0.15, 0.08, 0.3],
      'triangle',
      0.9
    );
  }

  public playGameOver() {
    this.playTone([392, 349.23, 311.13, 261.63], [0.15, 0.15, 0.18, 0.4], 'sawtooth', 0.7);
  }

  // --- Game 1: Claw Machine Sounds ---
  public playClawMove() {
    this.playTone([180, 210], [0.03, 0.03], 'square', 0.2);
  }

  public playClawDrop() {
    this.playTone([320, 260, 200, 160], [0.08, 0.08, 0.08, 0.1], 'sawtooth', 0.5);
  }

  public playClawGrab() {
    this.playTone([300, 450, 600], [0.06, 0.06, 0.1], 'square', 0.7);
  }

  public playPrizeCollected() {
    this.playTone([523, 659, 784, 1046, 1318], [0.07, 0.07, 0.07, 0.09, 0.25], 'sine', 0.8);
  }

  // --- Game 2: Pac-Maze Sounds ---
  public playPellet() {
    this.playTone([240, 300], [0.03, 0.03], 'triangle', 0.25);
  }

  public playPowerPellet() {
    this.playTone([400, 600, 800, 1000], [0.05, 0.05, 0.05, 0.1], 'sine', 0.7);
  }

  public playEatGhost() {
    this.playTone([300, 500, 750, 1100], [0.06, 0.06, 0.06, 0.15], 'square', 0.8);
  }

  public playPlayerHit() {
    this.playTone([500, 400, 300, 200, 100], [0.06, 0.06, 0.06, 0.08, 0.15], 'sawtooth', 0.8);
  }

  // --- Game 3: Shooter Sounds ---
  public playLaser() {
    if (!this.soundEnabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(this.volume * 0.5, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch {}
  }

  public playExplosion() {
    if (!this.soundEnabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const bufferSize = this.ctx.sampleRate * 0.2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, this.ctx.currentTime);
      filter.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.2);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.volume * 0.7, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
      noise.stop(this.ctx.currentTime + 0.2);
    } catch {}
  }

  public playPowerUp() {
    this.playTone([330, 392, 494, 659, 988], [0.05, 0.05, 0.05, 0.07, 0.15], 'sine', 0.8);
  }

  // --- Game 4: Breakout Sounds ---
  public playPaddleBounce() {
    this.playTone([440, 520], [0.03, 0.04], 'square', 0.4);
  }

  public playBrickBreak(pitchMultiplier: number = 1) {
    this.playTone([300 * pitchMultiplier, 600 * pitchMultiplier], [0.03, 0.05], 'triangle', 0.5);
  }

  // --- Game 5: Highway Racer Sounds ---
  public playTireDrift() {
    this.playTone([200, 180, 220, 190], [0.03, 0.03, 0.03, 0.04], 'sawtooth', 0.3);
  }

  public playTurbo() {
    this.playTone([200, 400, 800, 1200], [0.04, 0.04, 0.06, 0.12], 'sine', 0.7);
  }

  // --- Game 6: Lunar Lander Sounds ---
  public playThruster() {
    if (!this.soundEnabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(65 + Math.random() * 20, this.ctx.currentTime);
      gain.gain.setValueAtTime(this.volume * 0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    } catch {}
  }

  public playSafeTouchdown() {
    this.playTone([440, 554, 659, 880], [0.08, 0.08, 0.08, 0.3], 'triangle', 0.8);
  }
}

export const sound = new SoundSystem();
