import { Component, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  ConditionWorkout,
  EXERCISE_TYPES,
  TreadmillSegment,
  ValueMode,
  WorkoutFormData,
  WorkoutFormResult,
  average,
  fmtNum,
  toNum,
} from '../../models/history.models';
import { WorkoutDbService } from '../../services/workout-db.service';

type SegmentGroup = FormGroup<{
  speed: FormControl<number | null>;
  incline: FormControl<number | null>;
}>;

@Component({
  selector: 'app-condition-form',
  imports: [
    ReactiveFormsModule,
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
  private fb = inject(NonNullableFormBuilder);
  private db = inject(WorkoutDbService);
  private dialogRef = inject<MatDialogRef<ConditionFormComponent, WorkoutFormResult<ConditionWorkout>>>(MatDialogRef);
  readonly data = inject<WorkoutFormData<ConditionWorkout>>(MAT_DIALOG_DATA);

  readonly exerciseTypes = EXERCISE_TYPES;
  readonly fmtNum = fmtNum;
  readonly saving = signal(false);

  readonly form = this.fb.group({
    date: [this.data.workout.date, Validators.required],
    exerciseType: [this.data.workout.exerciseType],
    mode: [this.data.workout.mode as ValueMode],
    intervals: this.fb.array(this.data.workout.intervals.map(s => this.segment(s))),
    pauses: this.fb.array(this.data.workout.pauses.map(s => this.segment(s))),
    durationMin: [
      Math.round((this.data.workout.durationSec / 60) * 100) / 100,
      [Validators.required, Validators.min(0)],
    ],
    note: [this.data.workout.note],
  });

  get perInterval(): boolean { return this.form.controls.mode.value === 'perInterval'; }

  /** Rows to show: every row in per-interval mode, only the first in whole-workout mode. */
  rows(arr: FormArray<SegmentGroup>): SegmentGroup[] {
    return this.perInterval ? arr.controls : arr.controls.slice(0, 1);
  }

  avg(arr: FormArray<SegmentGroup>, key: keyof TreadmillSegment): string {
    return fmtNum(average(arr.controls.map(g => toNum(g.controls[key].value))));
  }

  onModeChange(mode: ValueMode): void {
    // Start every row from the single "whole workout" value instead of blanks.
    if (mode === 'perInterval') {
      for (const arr of [this.form.controls.intervals, this.form.controls.pauses]) {
        const first = arr.at(0).getRawValue();
        arr.controls.slice(1).forEach(g => {
          if (g.controls.speed.value === null && g.controls.incline.value === null) g.setValue(first);
        });
      }
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const segs = (list: { speed: unknown; incline: unknown }[]): TreadmillSegment[] => {
      const parsed = list.map(s => ({ speed: toNum(s.speed), incline: toNum(s.incline) }));
      return v.mode === 'whole' ? parsed.map(() => ({ ...parsed[0] })) : parsed;
    };
    const workout: ConditionWorkout = {
      ...this.data.workout,
      date: v.date,
      exerciseType: v.exerciseType,
      mode: v.mode,
      intervals: segs(v.intervals),
      pauses: segs(v.pauses),
      durationSec: Math.round(Number(v.durationMin) * 60),
      note: v.note.trim(),
    };
    this.saving.set(true);
    try {
      await this.db.save(workout);
      this.dialogRef.close(workout);
    } finally {
      this.saving.set(false);
    }
  }

  async remove(): Promise<void> {
    if (!confirm('Delete this workout?')) return;
    await this.db.remove(this.data.workout.id);
    this.dialogRef.close('deleted');
  }

  private segment(s: TreadmillSegment): SegmentGroup {
    return this.fb.group({
      speed: this.fb.control<number | null>(s.speed, Validators.min(0)),
      incline: this.fb.control<number | null>(s.incline),
    });
  }
}
