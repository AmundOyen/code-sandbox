import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AudioService {
  private beep(freq: number, dur: number): void {
    try {
      const ctx = new AudioContext();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.3, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur / 1000);
      o.start();
      o.stop(ctx.currentTime + dur / 1000);
    } catch {
      // audio unavailable
    }
  }

  phaseChange(): void {
    this.beep(660, 200);
    setTimeout(() => this.beep(880, 200), 260);
  }

  workoutComplete(): void {
    [660, 770, 880, 1100].forEach((f, i) => setTimeout(() => this.beep(f, 220), i * 230));
  }

  restDone(): void {
    this.beep(1100, 300);
  }
}
