import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WorkoutStateService } from '../services/workout-state.service';
import { WakeLockService } from '../services/wake-lock.service';
import { PHASES } from '../models/workout.models';
import { PhaseLabelPipe } from '../models/phase-label.pipe';
import { ConditionWorkout, emptyConditionWorkout, fmtDate, fmtNum } from '../models/history.models';
import { WorkoutDbService } from '../services/workout-db.service';
import { WorkoutDialogService } from '../history/workout-dialog.service';

@Component({
  selector: 'app-condition',
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatProgressBarModule,
    MatListModule,
    MatIconModule,
    PhaseLabelPipe,
  ],
  templateUrl: './condition.component.html',
  styleUrl: './condition.component.scss',
})
export class ConditionComponent implements OnDestroy {
  readonly state = inject(WorkoutStateService);
  readonly wakeLock = inject(WakeLockService);
  private router = inject(Router);
  private dialogs = inject(WorkoutDialogService);
  private snackBar = inject(MatSnackBar);
  private db = inject(WorkoutDbService);

  /** The record saved from this done screen, so a second tap edits it instead of duplicating. */
  readonly savedWorkout = signal<ConditionWorkout | null>(null);

  readonly phases = PHASES;

  /** Most recent saved interval workout, to help set up the treadmill. */
  readonly lastWorkout = computed(
    () => this.db.workouts().find((w): w is ConditionWorkout => w.kind === 'condition') ?? null,
  );
  readonly lastDate = computed(() => {
    const w = this.lastWorkout();
    return w ? fmtDate(w.date) : '';
  });
  /** Last time's speed/incline for the current phase and the next one (null for warm-up/cool-down). */
  readonly lastStats = computed(() => {
    const idx = this.state.conditionIdx();
    return [
      { label: 'Now', idx },
      { label: 'Next', idx: idx + 1 },
    ].flatMap(({ label, idx }) => {
      const stats = this.lastStatsFor(idx);
      return stats ? [{ label, ...stats }] : [];
    });
  });

  constructor() {
    this.db.load().catch(() => {
      // No history available; the screen works without it.
    });
  }
  readonly extendOptions = [15, 30, 60];
  private readonly baseTotal = PHASES.reduce((sum, p) => sum + p.dur, 0);

  get totalDurationLabel(): string {
    const secs = this.baseTotal + this.state.conditionExtraTotal();
    return secs % 60 ? this.durLabel(secs) : `${secs / 60} minutes`;
  }

  phaseDurLabel(idx: number): string {
    return this.durLabel(PHASES[idx].dur + this.state.conditionExtras()[idx]);
  }

  private lastStatsFor(idx: number): { name: string; value: string } | null {
    const w = this.lastWorkout();
    const p = PHASES[idx];
    if (!w || !p?.round || (p.type !== 'interval' && p.type !== 'pause')) return null;
    const seg = (p.type === 'interval' ? w.intervals : w.pauses)[p.round - 1];
    if (!seg || (seg.speed === null && seg.incline === null)) return null;
    return {
      name: this.state.phaseName(idx),
      value: `${fmtNum(seg.speed)} km/h · ${fmtNum(seg.incline)} %`,
    };
  }

  private durLabel(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return s ? `${m} min ${s} s` : `${m} min`;
  }

  get phase() { return PHASES[this.state.conditionIdx()]; }
  get phaseTotal(): number { return this.phase.dur + this.state.conditionExtra(); }
  get phaseProgress(): number {
    const total = this.phaseTotal;
    return ((total - this.state.conditionLeft()) / total) * 100;
  }
  get phaseName(): string { return this.state.phaseName(this.state.conditionIdx()); }
  get btnLabel(): string {
    if (this.state.conditionRunning()) return 'Pause';
    return this.state.conditionLeft() < this.phaseTotal ? 'Resume' : 'Start';
  }

  phaseDisplayName(idx: number): string { return this.state.phaseName(idx); }

  goBack(): void {
    this.state.stopCondTimer();
    this.router.navigate(['/']);
  }

  ngOnDestroy(): void {
    this.state.stopCondTimer();
  }

  async saveWorkout(): Promise<void> {
    const existing = this.savedWorkout();
    const workout = existing ?? {
      ...emptyConditionWorkout(),
      durationSec: this.baseTotal + this.state.conditionExtraTotal(),
    };
    const result = await this.dialogs.open(workout, !existing);
    if (result === 'deleted') {
      this.savedWorkout.set(null);
    } else if (result) {
      this.savedWorkout.set(result);
      this.snackBar
        .open('Workout saved', 'History', { duration: 4000 })
        .onAction()
        .subscribe(() => this.router.navigate(['/history']));
    }
  }

  startAgain(): void {
    this.savedWorkout.set(null);
    this.state.resetCondition();
  }

  onWakeToggle(checked: boolean): void {
    this.wakeLock.set(checked);
  }
}
