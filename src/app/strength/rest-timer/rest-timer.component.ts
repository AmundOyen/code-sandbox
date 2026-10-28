import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { WorkoutStateService } from '../../services/workout-state.service';

@Component({
  selector: 'app-rest-timer',
  imports: [CommonModule, MatButtonModule, MatProgressBarModule],
  templateUrl: './rest-timer.component.html',
  styleUrl: './rest-timer.component.scss',
})
export class RestTimerComponent {
  readonly state = inject(WorkoutStateService);

  get r() { return this.state.restTimer(); }
  get progress(): number {
    const r = this.r;
    return r.total > 0 ? ((r.total - r.left) / r.total) * 100 : 0;
  }
  get btnLabel(): string {
    const r = this.r;
    if (r.running) return 'Pause';
    return r.left < r.total ? 'Resume' : 'Start';
  }

  fmt(s: number): string { return this.state.fmt(s); }

  setDuration(mins: 2 | 3): void { this.state.setRestDuration(mins); }
  toggle(): void { this.state.toggleRest(); }
  close(): void { this.state.closeRest(); }
}
