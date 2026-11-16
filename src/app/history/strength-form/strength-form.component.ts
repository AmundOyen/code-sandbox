import { Component, inject, signal } from '@angular/core';
import { FieldTree, FormField, FormRoot, applyEach, form, min, required } from '@angular/forms/signals';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
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
} from '../../models/history.models';
import { WorkoutDbService } from '../../services/workout-db.service';
import { openConfirm } from '../../shared/confirm-dialog/confirm-dialog.component';

interface StrengthFormModel {
  date: string;
  exercises: StrengthExerciseRecord[];
}

@Component({
  selector: 'app-strength-form',
  imports: [
    FormRoot,
    FormField,
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
  private db = inject(WorkoutDbService);
  private dialog = inject(MatDialog);
  private dialogRef = inject<MatDialogRef<StrengthFormComponent, WorkoutFormResult<StrengthWorkout>>>(MatDialogRef);
  readonly data = inject<WorkoutFormData<StrengthWorkout>>(MAT_DIALOG_DATA);

  readonly model = signal<StrengthFormModel>({
    date: this.data.workout.date,
    exercises: this.data.workout.exercises.map(e => ({ ...e, weights: [...e.weights] })),
  });

  readonly form = form(
    this.model,
    f => {
      required(f.date);
      applyEach(f.exercises, e => {
        applyEach(e.weights, w => min(w, 0));
      });
    },
    { submission: { action: () => this.save() } },
  );

  exercises(): FieldTree<StrengthExerciseRecord>[] {
    return this.model().exercises.map((_, i) => this.form.exercises[i]);
  }

  /** Weight fields to show: one per set, or only the first when one weight covers all sets. */
  weightRows(i: number): FieldTree<number | null>[] {
    const e = this.model().exercises[i];
    const all = e.weights.map((_, si) => this.form.exercises[i].weights[si]);
    return e.weightMode === 'perSet' ? all : all.slice(0, 1);
  }

  onWeightModeChange(i: number, mode: WeightMode): void {
    if (mode !== 'perSet') return;
    // Start every set from the single "all sets" weight instead of blanks.
    this.model.update(m => ({
      ...m,
      exercises: m.exercises.map((e, ei) =>
        ei === i ? { ...e, weights: e.weights.map(w => w ?? e.weights[0]) } : e,
      ),
    }));
  }

  async remove(): Promise<void> {
    const ok = await openConfirm(this.dialog, {
      title: 'Delete workout?',
      message: 'This strength workout will be removed from your history.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    await this.db.remove(this.data.workout.id);
    this.dialogRef.close('deleted');
  }

  private async save(): Promise<void> {
    const m = this.model();
    const workout: StrengthWorkout = {
      ...this.data.workout,
      date: m.date,
      exercises: m.exercises.map(e => ({
        name: e.name.trim(),
        weightMode: e.weightMode,
        weights: e.weightMode === 'all' ? e.weights.map(() => e.weights[0]) : [...e.weights],
        note: e.note.trim(),
      })),
    };
    await this.db.save(workout);
    this.dialogRef.close(workout);
  }
}
