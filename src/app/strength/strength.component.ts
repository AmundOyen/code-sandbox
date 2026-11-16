import { Component, OnDestroy, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WorkoutStateService } from '../services/workout-state.service';
import { WakeLockService } from '../services/wake-lock.service';
import { RestTimerComponent } from './rest-timer/rest-timer.component';
import { DoneCountPipe } from '../models/done-count.pipe';
import { StrengthWorkout, emptyStrengthWorkout } from '../models/history.models';
import { WorkoutDialogService } from '../history/workout-dialog.service';

@Component({
  selector: 'app-strength',
  imports: [
    CommonModule,
    FormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatCardModule,
    MatSlideToggleModule,
    MatIconModule,
    RestTimerComponent,
    DoneCountPipe,
  ],
  templateUrl: './strength.component.html',
  styleUrl: './strength.component.scss',
})
export class StrengthComponent implements OnDestroy {
  readonly state = inject(WorkoutStateService);
  readonly wakeLock = inject(WakeLockService);
  private router = inject(Router);
  private dialogs = inject(WorkoutDialogService);
  private snackBar = inject(MatSnackBar);

  /** The record saved from this screen, so a second tap edits it instead of duplicating. */
  readonly savedWorkout = signal<StrengthWorkout | null>(null);

  get exercises() { return this.state.exercises(); }
  get restTimer() { return this.state.restTimer(); }
  get allDone(): boolean { return this.exercises.every(ex => ex.sets.every(Boolean)); }

  goBack(): void {
    this.state.stopRestTimer();
    this.router.navigate(['/']);
  }

  ngOnDestroy(): void {
    this.state.stopRestTimer();
  }

  updateName(idx: number, name: string): void {
    this.state.exercises.update(exs =>
      exs.map((e, i) => (i === idx ? { ...e, name } : e))
    );
  }

  async saveWorkout(): Promise<void> {
    const existing = this.savedWorkout();
    const workout = existing ?? emptyStrengthWorkout(this.exercises.map(e => e.name));
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

  resetAll(): void {
    this.savedWorkout.set(null);
    this.state.resetStrength();
  }

  onWakeToggle(checked: boolean): void {
    this.wakeLock.set(checked);
  }

  trackByIndex(index: number): number { return index; }
}
