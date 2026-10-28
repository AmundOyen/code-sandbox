import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class WakeLockService {
  readonly enabled = signal(false);
  private lock: WakeLockSentinel | null = null;

  constructor() {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.enabled() && !this.lock) {
        this.acquire();
      }
    });
  }

  async set(enable: boolean): Promise<void> {
    this.enabled.set(enable);
    if (enable) {
      await this.acquire();
    } else {
      await this.release();
    }
  }

  private async acquire(): Promise<void> {
    if (!('wakeLock' in navigator)) return;
    try {
      this.lock = await navigator.wakeLock.request('screen');
      this.lock.addEventListener('release', () => {
        this.lock = null;
        if (this.enabled() && !document.hidden) this.acquire();
      });
    } catch {
      this.enabled.set(false);
    }
  }

  private async release(): Promise<void> {
    if (this.lock) {
      await this.lock.release();
      this.lock = null;
    }
  }
}
