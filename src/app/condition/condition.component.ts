import { Component, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { WorkoutStateService } from '../services/workout-state.service';
import { WakeLockService } from '../services/wake-lock.service';
import { PHASES } from '../models/workout.models';
import { PhaseLabelPipe } from '../models/phase-label.pipe';

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

  readonly phases = PHASES;

  get phase() { return PHASES[this.state.conditionIdx()]; }
  get phaseProgress(): number {
    const p = this.phase;
    return ((p.dur - this.state.conditionLeft()) / p.dur) * 100;
  }
  get phaseName(): string { return this.state.phaseName(this.state.conditionIdx()); }
  get btnLabel(): string {
    if (this.state.conditionRunning()) return 'Pause';
    return this.state.conditionLeft() < this.phase.dur ? 'Resume' : 'Start';
  }

  phaseDisplayName(idx: number): string { return this.state.phaseName(idx); }

  goBack(): void {
    this.state.stopCondTimer();
    this.router.navigate(['/']);
  }

  ngOnDestroy(): void {
    this.state.stopCondTimer();
  }

  onWakeToggle(checked: boolean): void {
    this.wakeLock.set(checked);
  }
}
