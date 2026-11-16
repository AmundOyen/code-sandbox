import { Component, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  StrengthExerciseRecord,
  StrengthWorkout,
  WeightMode,
  WorkoutFormData,
  WorkoutFormResult,
  toNum,
} from '../../models/history.models';
import { WorkoutDbService } from '../../services/workout-db.service';

type ExerciseGroup = FormGroup<{
  name: FormControl<string>;
  weightMode: FormControl<WeightMode>;
  weights: FormArray<FormControl<number | null>>;
  note: FormControl<string>;
}>;

@Component({
  selector: 'app-strength-form',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './strength-form.component.html',
  styleUrl: '../workout-form.scss',
})
export class StrengthFormComponent {
  private fb = inject(NonNullableFormBuilder);
  private db = inject(WorkoutDbService);
  private dialogRef = inject<MatDialogRef<StrengthFormComponent, WorkoutFormResult<StrengthWorkout>>>(MatDialogRef);
  readonly data = inject<WorkoutFormData<StrengthWorkout>>(MAT_DIALOG_DATA);

  readonly saving = signal(false);

  readonly form = this.fb.group({
    date: [this.data.workout.date, Validators.required],
    exercises: this.fb.array(this.data.workout.exercises.map(e => this.exercise(e))),
  });

  /** Weight fields to show: one per set, or only the first when one weight covers all sets. */
  weightRows(g: ExerciseGroup): FormControl<number | null>[] {
    const all = g.controls.weights.controls;
    return g.controls.weightMode.value === 'perSet' ? all : all.slice(0, 1);
  }

  onWeightModeChange(g: ExerciseGroup, mode: WeightMode): void {
    // Start every set from the single "all sets" weight instead of blanks.
    if (mode === 'perSet') {
      const [first, ...rest] = g.controls.weights.controls;
      rest.forEach(c => { if (c.value === null) c.setValue(first.value); });
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const workout: StrengthWorkout = {
      ...this.data.workout,
      date: v.date,
      exercises: v.exercises.map(e => {
        const weights = e.weights.map(toNum);
        return {
          name: e.name.trim(),
          weightMode: e.weightMode,
          weights: e.weightMode === 'all' ? weights.map(() => weights[0]) : weights,
          note: e.note.trim(),
        };
      }),
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

  private exercise(e: StrengthExerciseRecord): ExerciseGroup {
    return this.fb.group({
      name: this.fb.control(e.name),
      weightMode: this.fb.control<WeightMode>(e.weightMode),
      weights: this.fb.array(e.weights.map(w => this.fb.control<number | null>(w, Validators.min(0)))),
      note: this.fb.control(e.note),
    });
  }
}
