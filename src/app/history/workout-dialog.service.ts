import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import {
  ConditionWorkout,
  StrengthWorkout,
  WorkoutFormData,
  WorkoutFormResult,
  WorkoutRecord,
} from '../models/history.models';
import { ConditionFormComponent } from './condition-form/condition-form.component';
import { StrengthFormComponent } from './strength-form/strength-form.component';

/** Opens the save/edit dialog for a workout. Saving and deleting happen inside the dialog. */
@Injectable({ providedIn: 'root' })
export class WorkoutDialogService {
  private dialog = inject(MatDialog);

  open(workout: ConditionWorkout, isNew?: boolean): Promise<WorkoutFormResult<ConditionWorkout>>;
  open(workout: StrengthWorkout, isNew?: boolean): Promise<WorkoutFormResult<StrengthWorkout>>;
  open(workout: WorkoutRecord, isNew?: boolean): Promise<WorkoutFormResult<WorkoutRecord>>;
  open(workout: WorkoutRecord, isNew = false): Promise<WorkoutFormResult<WorkoutRecord>> {
    const component = workout.kind === 'condition' ? ConditionFormComponent : StrengthFormComponent;
    const ref = this.dialog.open<unknown, WorkoutFormData<WorkoutRecord>, WorkoutFormResult<WorkoutRecord>>(
      component,
      {
        data: { workout, isNew },
        width: '560px',
        maxWidth: '96vw',
        autoFocus: 'dialog',
      },
    );
    return firstValueFrom(ref.afterClosed());
  }
}
