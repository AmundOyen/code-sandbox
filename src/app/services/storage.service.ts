import { Injectable } from '@angular/core';
import { StoredState } from '../models/workout.models';

const KEY = '4x4-gym-tracker-v1';

@Injectable({ providedIn: 'root' })
export class StorageService {
  load(): StoredState {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as StoredState) : {};
    } catch {
      return {};
    }
  }

  save(state: StoredState): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // storage unavailable
    }
  }
}
