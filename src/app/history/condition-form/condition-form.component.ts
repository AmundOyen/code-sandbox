import { Component, inject, signal } from '@angular/core';
import { FieldTree, FormField, FormRoot, applyEach, form, min, required, schema } from '@angular/forms/signals';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  ConditionWorkout,
  EXERCISE_TYPES,
  ExerciseType,
  TreadmillSegment,
  ValueMode,
  WorkoutFormData,
  WorkoutFormResult,
  average,
  fmtNum,
} from '../../models/history.models';
import { WorkoutDbService } from '../../services/workout-db.service';
import { openConfirm } from '../../shared/confirm-dialog/confirm-dialog.component';

interface ConditionFormModel {
  date: string;
  exerciseType: ExerciseType;
  mode: ValueMode;
  intervals: TreadmillSegment[];
  pauses: TreadmillSegment[];
  durationMin: number | null;
  note: string;
}

type SegmentKey = 'intervals' | 'pauses';

/**
 * Copies a segment field by field. Signal Forms tags array items with a hidden symbol key to
 * track their identity, so spreading (`{ ...s }`) would copy that key and make rows share a field.
 */
function copySegment(s: TreadmillSegment): TreadmillSegment {
  return { speed: s.speed, incline: s.incline };
}

const segmentSchema = schema<TreadmillSegment>(s => {
  min(s.speed, 0);
});

@Component({
  selector: 'app-condition-form',
  imports: [
    FormRoot,
    FormField,
    MatDialogModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './condition-form.component.html',
  styleUrl: '../workout-form.scss',
})
export class ConditionFormComponent {
  private db = inject(WorkoutDbService);
  private dialog = inject(MatDialog);
  private dialogRef = inject<MatDialogRef<ConditionFormComponent, WorkoutFormResult<ConditionWorkout>>>(MatDialogRef);
  readonly data = inject<WorkoutFormData<ConditionWorkout>>(MAT_DIALOG_DATA);

  readonly exerciseTypes = EXERCISE_TYPES;
  readonly sections: { key: SegmentKey; title: string; label: string }[] = [
    { key: 'intervals', title: 'Intervals', label: 'Interval' },
    { key: 'pauses', title: 'Active pauses', label: 'Pause' },
  ];

  readonly model = signal<ConditionFormModel>({
    date: this.data.workout.date,
    exerciseType: this.data.workout.exerciseType,
    mode: this.data.workout.mode,
    intervals: this.data.workout.intervals.map(copySegment),
    pauses: this.data.workout.pauses.map(copySegment),
    durationMin: Math.round((this.data.workout.durationSec / 60) * 100) / 100,
    note: this.data.workout.note,
  });

  readonly form = form(
    this.model,
    f => {
      required(f.date);
      required(f.durationMin);
      min(f.durationMin, 0);
      applyEach(f.intervals, segmentSchema);
      applyEach(f.pauses, segmentSchema);
    },
    { submission: { action: () => this.save() } },
  );

  perInterval(): boolean {
    return this.model().mode === 'perInterval';
  }

  /** Rows to show: every row in per-interval mode, only the first in whole-workout mode. */
  rows(key: SegmentKey): FieldTree<TreadmillSegment>[] {
    const all = this.model()[key].map((_, i) => this.form[key][i]);
    return this.perInterval() ? all : all.slice(0, 1);
  }

  avg(key: SegmentKey, prop: keyof TreadmillSegment): string {
    return fmtNum(average(this.model()[key].map(s => s[prop])));
  }

  onModeChange(mode: ValueMode): void {
    if (mode !== 'perInterval') return;
    // Start every row from the single "whole workout" value instead of blanks.
    const fill = (segs: TreadmillSegment[]) =>
      segs.map((s, i) => (i > 0 && s.speed === null && s.incline === null ? copySegment(segs[0]) : s));
    this.model.update(m => ({ ...m, intervals: fill(m.intervals), pauses: fill(m.pauses) }));
  }

  async remove(): Promise<void> {
    const ok = await openConfirm(this.dialog, {
      title: 'Delete workout?',
      message: 'This interval workout will be removed from your history.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    await this.db.remove(this.data.workout.id);
    this.dialogRef.close('deleted');
  }

  private async save(): Promise<void> {
    const m = this.model();
    const segs = (list: TreadmillSegment[]) =>
      m.mode === 'whole' ? list.map(() => copySegment(list[0])) : list.map(copySegment);
    const workout: ConditionWorkout = {
      ...this.data.workout,
      date: m.date,
      exerciseType: m.exerciseType,
      mode: m.mode,
      intervals: segs(m.intervals),
      pauses: segs(m.pauses),
      durationSec: Math.round((m.durationMin ?? 0) * 60),
      note: m.note.trim(),
    };
    await this.db.save(workout);
    this.dialogRef.close(workout);
  }
}
