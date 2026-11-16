import { Injectable, signal } from '@angular/core';
import { WorkoutRecord } from '../models/history.models';

const DB_NAME = 'gym-tracker';
const DB_VERSION = 1;
const STORE = 'workouts';

/** Workout history stored in IndexedDB. */
@Injectable({ providedIn: 'root' })
export class WorkoutDbService {
  /** All saved workouts, newest date first. Call load() to populate. */
  readonly workouts = signal<WorkoutRecord[]>([]);

  private db: Promise<IDBDatabase> | null = null;

  async load(): Promise<void> {
    const all = await this.run<WorkoutRecord[]>('readonly', store => store.getAll());
    this.workouts.set(all.sort((a, b) => b.date.localeCompare(a.date)));
  }

  async save(workout: WorkoutRecord): Promise<void> {
    await this.saveMany([workout]);
  }

  /** Adds or overwrites (by id) every workout in a single transaction. */
  async saveMany(workouts: WorkoutRecord[]): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      workouts.forEach(w => store.put(w));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    await this.load();
  }

  async remove(id: string): Promise<void> {
    await this.run('readwrite', store => store.delete(id));
    await this.load();
  }

  private async run<T>(
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const db = await this.open();
    return new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private open(): Promise<IDBDatabase> {
    this.db ??= new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) {
          req.result.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        this.db = null;
        reject(req.error);
      };
    });
    return this.db;
  }
}
