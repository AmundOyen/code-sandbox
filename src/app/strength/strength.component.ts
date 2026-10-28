import { Component, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { WorkoutStateService } from '../services/workout-state.service';
import { WakeLockService } from '../services/wake-lock.service';
import { RestTimerComponent } from './rest-timer/rest-timer.component';
import { DoneCountPipe } from '../models/done-count.pipe';

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

  onWakeToggle(checked: boolean): void {
    this.wakeLock.set(checked);
  }

  trackByIndex(index: number): number { return index; }
}
