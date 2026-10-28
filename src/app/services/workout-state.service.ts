import { Injectable, effect, inject, signal } from '@angular/core';
import {
  Exercise,
  PHASES,
  RestTimerState,
  defaultExercises,
  defaultRestTimer,
} from '../models/workout.models';
import { AudioService } from './audio.service';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class WorkoutStateService {
  private storage = inject(StorageService);
  private audio = inject(AudioService);

  // Condition training
  conditionIdx = signal(0);
  conditionLeft = signal(PHASES[0].dur);
  conditionRunning = signal(false);
  conditionDone = signal(false);
  private condIntervalId: ReturnType<typeof setInterval> | null = null;

  // Strength training
  exercises = signal<Exercise[]>(defaultExercises());
  restTimer = signal<RestTimerState>(defaultRestTimer());
  private restIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.loadFromStorage();
    effect(() => {
      // Track all signals to persist on any change
      const c = {
        idx: this.conditionIdx(),
        left: this.conditionLeft(),
        done: this.conditionDone(),
      };
      const exs = this.exercises();
      this.storage.save({
        c,
        s: { exercises: exs.map(e => ({ name: e.name, sets: [...e.sets], restMins: e.restMins })) },
      });
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  fmt(s: number): string {
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  phaseName(idx: number): string {
    const p = PHASES[idx];
    return p.round ? `${p.label} ${p.round}` : p.label;
  }

  // ── Condition ─────────────────────────────────────────────────────────────────

  toggleCondition(): void {
    if (this.conditionRunning()) {
      this.stopCondTimer();
    } else {
      this.conditionRunning.set(true);
      this.condIntervalId = setInterval(() => this.tickCond(), 1000);
    }
  }

  private tickCond(): void {
    const left = this.conditionLeft() - 1;
    if (left <= 0) {
      const idx = this.conditionIdx();
      if (idx < PHASES.length - 1) {
        this.conditionIdx.set(idx + 1);
        this.conditionLeft.set(PHASES[idx + 1].dur);
        this.audio.phaseChange();
      } else {
        this.stopCondTimer();
        this.conditionDone.set(true);
        this.audio.workoutComplete();
      }
    } else {
      this.conditionLeft.set(left);
    }
  }

  skipCondition(): void {
    const wasRunning = this.conditionRunning();
    this.stopCondTimer();
    const idx = this.conditionIdx();
    if (idx < PHASES.length - 1) {
      this.conditionIdx.set(idx + 1);
      this.conditionLeft.set(PHASES[idx + 1].dur);
      this.audio.phaseChange();
      if (wasRunning) {
        this.conditionRunning.set(true);
        this.condIntervalId = setInterval(() => this.tickCond(), 1000);
      }
    } else {
      this.conditionDone.set(true);
      this.audio.workoutComplete();
    }
  }

  resetCondition(): void {
    this.stopCondTimer();
    this.conditionIdx.set(0);
    this.conditionLeft.set(PHASES[0].dur);
    this.conditionDone.set(false);
  }

  stopCondTimer(): void {
    if (this.condIntervalId !== null) {
      clearInterval(this.condIntervalId);
      this.condIntervalId = null;
    }
    this.conditionRunning.set(false);
  }

  // ── Strength ──────────────────────────────────────────────────────────────────

  toggleSet(exerciseIdx: number, setIdx: number): void {
    const exs = this.exercises();
    const ex = exs[exerciseIdx];
    const wasDone = ex.sets[setIdx];
    const updated: Exercise[] = exs.map((e, i) => {
      if (i !== exerciseIdx) return e;
      const sets = [...e.sets];
      sets[setIdx] = !sets[setIdx];
      return { ...e, sets };
    });
    this.exercises.set(updated);

    if (!wasDone) {
      this.stopRestTimer();
      const mins = ex.restMins ?? 2;
      const secs = mins * 60;
      this.restTimer.set({ visible: true, mins, left: secs, total: secs, running: false, exerciseIdx });
    }
  }

  setRestDuration(mins: 2 | 3): void {
    const r = this.restTimer();
    if (r.running) return;
    const secs = mins * 60;
    this.restTimer.set({ ...r, mins, left: secs, total: secs });
    if (r.exerciseIdx >= 0) {
      this.exercises.update(exs =>
        exs.map((e, i) => (i === r.exerciseIdx ? { ...e, restMins: mins } : e))
      );
    }
  }

  toggleRest(): void {
    const r = this.restTimer();
    if (r.running) {
      this.stopRestTimer();
    } else {
      this.restTimer.set({ ...r, running: true });
      this.restIntervalId = setInterval(() => this.tickRest(), 1000);
    }
  }

  private tickRest(): void {
    const r = this.restTimer();
    const left = r.left - 1;
    if (left <= 0) {
      this.stopRestTimer();
      this.restTimer.set({ ...this.restTimer(), visible: false });
      this.audio.restDone();
    } else {
      this.restTimer.set({ ...r, left });
    }
  }

  closeRest(): void {
    this.stopRestTimer();
    this.restTimer.set({ ...this.restTimer(), visible: false });
  }

  stopRestTimer(): void {
    if (this.restIntervalId !== null) {
      clearInterval(this.restIntervalId);
      this.restIntervalId = null;
    }
    this.restTimer.update(r => ({ ...r, running: false }));
  }

  resetStrength(): void {
    this.stopRestTimer();
    this.exercises.update(exs => exs.map(e => ({ ...e, sets: [false, false, false, false] })));
    this.restTimer.set(defaultRestTimer());
  }

  // ── Persistence ───────────────────────────────────────────────────────────────

  private loadFromStorage(): void {
    const d = this.storage.load();
    if (d.c) {
      const idx = Number(d.c.idx);
      if (idx >= 0 && idx < PHASES.length) {
        this.conditionIdx.set(idx);
        this.conditionLeft.set(Math.max(0, d.c.left ?? PHASES[idx].dur));
        this.conditionDone.set(Boolean(d.c.done));
      }
    }
    if (d.s?.exercises) {
      this.exercises.update(exs =>
        exs.map((ex, i) => {
          const saved = d.s!.exercises![i];
          if (!saved) return ex;
          return {
            name: typeof saved.name === 'string' ? saved.name : ex.name,
            sets: Array.isArray(saved.sets) ? saved.sets.map(Boolean) : ex.sets,
            restMins: saved.restMins === 3 ? 3 : 2,
          };
        })
      );
    }
  }
}
