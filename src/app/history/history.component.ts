import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatRippleModule } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ConditionWorkout,
  EXERCISE_TYPES,
  WorkoutRecord,
  average,
  emptyConditionWorkout,
  emptyStrengthWorkout,
  fmtDate,
  fmtNum,
  fmtWeights,
  normalizeWorkout,
  todayIso,
} from '../models/history.models';
import { WorkoutDbService } from '../services/workout-db.service';
import { WorkoutStateService } from '../services/workout-state.service';
import { WorkoutDialogService } from './workout-dialog.service';

@Component({
  selector: 'app-history',
  imports: [MatToolbarModule, MatButtonModule, MatCardModule, MatIconModule, MatMenuModule, MatRippleModule],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss',
})
export class HistoryComponent implements OnInit {
  readonly db = inject(WorkoutDbService);
  private dialogs = inject(WorkoutDialogService);
  private state = inject(WorkoutStateService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  readonly fmtDate = fmtDate;

  ngOnInit(): void {
    this.db.load().catch(() => this.toast('Could not open the workout database'));
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  edit(w: WorkoutRecord): void {
    this.dialogs.open(w);
  }

  addCondition(): void {
    this.dialogs.open(emptyConditionWorkout(), true);
  }

  addStrength(): void {
    this.dialogs.open(emptyStrengthWorkout(this.state.exercises().map(e => e.name)), true);
  }

  // ── Summaries ─────────────────────────────────────────────────────────────────

  exerciseLabel(w: ConditionWorkout): string {
    return EXERCISE_TYPES.find(t => t.value === w.exerciseType)?.label ?? w.exerciseType;
  }

  segmentSummary(w: ConditionWorkout, part: 'intervals' | 'pauses'): string {
    const segs = w[part];
    const speed = fmtNum(average(segs.map(s => s.speed)));
    const incline = fmtNum(average(segs.map(s => s.incline)));
    const prefix = w.mode === 'perInterval' ? 'avg ' : '';
    return `${prefix}${speed} km/h · ${incline} %`;
  }

  duration(w: ConditionWorkout): string {
    const m = Math.floor(w.durationSec / 60);
    const s = w.durationSec % 60;
    return s ? `${m} min ${s} s` : `${m} min`;
  }

  readonly fmtWeights = fmtWeights;

  // ── Export / import ───────────────────────────────────────────────────────────

  exportJson(): void {
    const data = {
      app: 'gym-tracker',
      version: 1,
      exportedAt: new Date().toISOString(),
      workouts: this.db.workouts(),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `gym-tracker-history-${todayIso()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async importJson(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    let raw: unknown;
    try {
      raw = JSON.parse(await file.text());
    } catch {
      this.toast('That file is not valid JSON');
      return;
    }
    // Accept both the export format ({ workouts: [...] }) and a plain array.
    const list = Array.isArray(raw)
      ? raw
      : (raw as { workouts?: unknown } | null)?.workouts;
    if (!Array.isArray(list)) {
      this.toast('No workouts found in that file');
      return;
    }
    const workouts = list.map(normalizeWorkout).filter((w): w is WorkoutRecord => w !== null);
    const skipped = list.length - workouts.length;
    if (workouts.length) await this.db.saveMany(workouts);
    this.toast(
      `Imported ${workouts.length} workout${workouts.length === 1 ? '' : 's'}` +
        (skipped ? ` · skipped ${skipped} invalid` : ''),
    );
  }

  private toast(msg: string): void {
    this.snackBar.open(msg, 'OK', { duration: 4000 });
  }
}
