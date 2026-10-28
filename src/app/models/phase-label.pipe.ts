import { Pipe, PipeTransform } from '@angular/core';
import { PhaseType } from './workout.models';

const MAP: Record<PhaseType, string> = {
  warmup: 'Warm Up',
  interval: 'Interval',
  pause: 'Rest',
  cooldown: 'Cool Down',
};

@Pipe({ name: 'phaseLabel', standalone: true })
export class PhaseLabelPipe implements PipeTransform {
  transform(value: PhaseType): string {
    return MAP[value] ?? value;
  }
}
