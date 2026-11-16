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
  readonly extendOptions = [15, 30, 60];
  private readonly baseTotal = PHASES.reduce((sum, p) => sum + p.dur, 0);

  get totalDurationLabel(): string {
    const secs = this.baseTotal + this.state.conditionExtraTotal();
    return secs % 60 ? this.durLabel(secs) : `${secs / 60} minutes`;
  }

  phaseDurLabel(idx: number): string {
    return this.durLabel(PHASES[idx].dur + this.state.conditionExtras()[idx]);
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

  onWakeToggle(checked: boolean): void {
    this.wakeLock.set(checked);
  }
}
