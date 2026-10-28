import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'doneCount', standalone: true })
export class DoneCountPipe implements PipeTransform {
  transform(sets: boolean[]): number {
    return sets.filter(Boolean).length;
  }
}
