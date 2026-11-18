import { PHASES } from './workout.models';

export const INTERVAL_COUNT = PHASES.filter(p => p.type === 'interval').length;
export const PAUSE_COUNT = PHASES.filter(p => p.type === 'pause').length;
export const SET_COUNT = 4;
export const BASE_CONDITION_SECS = PHASES.reduce((sum, p) => sum + p.dur, 0);

export type ExerciseType = 'treadmill';
/** 'whole' = one value for the whole workout, 'perInterval' = one value per interval/pause. */
export type ValueMode = 'whole' | 'perInterval';
/** 'all' = one weight for every set, 'perSet' = one weight per set. */
export type WeightMode = 'all' | 'perSet';

export const EXERCISE_TYPES: { value: ExerciseType; label: string }[] = [
  { value: 'treadmill', label: 'Treadmill' },
];

export interface TreadmillSegment {
  /** km/h */
  speed: number | null;
  /** % */
  incline: number | null;
}

export interface ConditionWorkout {
  id: string;
  kind: 'condition';
  /** Local date, YYYY-MM-DD */
  date: string;
  exerciseType: ExerciseType;
  mode: ValueMode;
  /** One entry per interval. In 'whole' mode every entry holds the same value. */
  intervals: TreadmillSegment[];
  /** One entry per active pause. In 'whole' mode every entry holds the same value. */
  pauses: TreadmillSegment[];
  durationSec: number;
  note: string;
}

export interface StrengthExerciseRecord {
  name: string;
  weightMode: WeightMode;
  /** kg, one entry per set. In 'all' mode every entry holds the same value. */
  weights: (number | null)[];
  note: string;
}

export interface StrengthWorkout {
  id: string;
  kind: 'strength';
  /** Local date, YYYY-MM-DD */
  date: string;
  exercises: StrengthExerciseRecord[];
}

export type WorkoutRecord = ConditionWorkout | StrengthWorkout;

/** Data passed to a workout dialog. */
export interface WorkoutFormData<T> {
  workout: T;
  isNew: boolean;
}

/** What a workout dialog closes with: the saved workout, 'deleted', or undefined when cancelled. */
export type WorkoutFormResult<T> = T | 'deleted' | undefined;

// ── Helpers ────────────────────────────────────────────────────────────────────

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function newId(): string {
  return crypto.randomUUID();
}

/** Mean of the values that are set, or null when none are. */
export function average(values: (number | null)[]): number | null {
  const set = values.filter((v): v is number => v !== null);
  return set.length ? set.reduce((sum, v) => sum + v, 0) / set.length : null;
}

export function fmtNum(v: number | null): string {
  return v === null ? '–' : String(Math.round(v * 10) / 10);
}

/** "60 kg" for one weight across all sets, "60 / 60 / 62.5 / 65 kg" per set, "–" when none set. */
export function fmtWeights(e: StrengthExerciseRecord): string {
  const list = e.weightMode === 'all' ? e.weights.slice(0, 1) : e.weights;
  return list.every(w => w === null) ? '–' : `${list.map(fmtNum).join(' / ')} kg`;
}

export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ── Previous workouts ──────────────────────────────────────────────────────────
// `history` is expected newest first, as WorkoutDbService.workouts() provides it.

/** The most recent saved interval workout. */
export function latestCondition(history: WorkoutRecord[]): ConditionWorkout | null {
  return history.find((w): w is ConditionWorkout => w.kind === 'condition') ?? null;
}

/** Key used to match strength exercises by name: case-insensitive, ignoring surrounding spaces. */
export function exerciseKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * The most recent saved entry per exercise name that has at least one weight set,
 * keyed by exerciseKey().
 */
export function latestExercises(
  history: WorkoutRecord[],
): Map<string, { date: string; exercise: StrengthExerciseRecord }> {
  const map = new Map<string, { date: string; exercise: StrengthExerciseRecord }>();
  for (const w of history) {
    if (w.kind !== 'strength') continue;
    for (const exercise of w.exercises) {
      const key = exerciseKey(exercise.name);
      if (!key || map.has(key) || exercise.weights.every(x => x === null)) continue;
      map.set(key, { date: w.date, exercise });
    }
  }
  return map;
}

/** A new interval workout for today, with speed/incline copied from the latest saved one. */
export function newConditionWorkout(history: WorkoutRecord[]): ConditionWorkout {
  const prev = latestCondition(history);
  return {
    id: newId(),
    kind: 'condition',
    date: todayIso(),
    exerciseType: prev?.exerciseType ?? 'treadmill',
    mode: prev?.mode ?? 'whole',
    intervals: copySegments(prev?.intervals, INTERVAL_COUNT),
    pauses: copySegments(prev?.pauses, PAUSE_COUNT),
    durationSec: BASE_CONDITION_SECS,
    note: '',
  };
}

/** A new strength workout for today, with each exercise's weights copied from its latest saved entry. */
export function newStrengthWorkout(names: string[], history: WorkoutRecord[]): StrengthWorkout {
  const latest = latestExercises(history);
  return {
    id: newId(),
    kind: 'strength',
    date: todayIso(),
    exercises: names.map(name => {
      const prev = latest.get(exerciseKey(name))?.exercise;
      return {
        name,
        weightMode: prev?.weightMode ?? 'all',
        weights: Array.from({ length: SET_COUNT }, (_, i) => prev?.weights[i] ?? null),
        note: '',
      };
    }),
  };
}

/**
 * Turns untrusted input (e.g. an imported JSON file) into a valid record,
 * or returns null when it isn't a workout this app understands.
 */
export function normalizeWorkout(raw: unknown): WorkoutRecord | null {
  if (!isObj(raw) || typeof raw['id'] !== 'string' || !raw['id'] || !isIsoDate(raw['date'])) {
    return null;
  }
  const base = { id: raw['id'], date: raw['date'] as string };

  if (raw['kind'] === 'condition') {
    return {
      ...base,
      kind: 'condition',
      exerciseType: 'treadmill',
      mode: raw['mode'] === 'perInterval' ? 'perInterval' : 'whole',
      intervals: segments(raw['intervals'], INTERVAL_COUNT),
      pauses: segments(raw['pauses'], PAUSE_COUNT),
      durationSec: Math.max(0, num(raw['durationSec']) ?? BASE_CONDITION_SECS),
      note: str(raw['note']),
    };
  }

  if (raw['kind'] === 'strength' && Array.isArray(raw['exercises'])) {
    return {
      ...base,
      kind: 'strength',
      exercises: raw['exercises'].filter(isObj).map(e => ({
        name: str(e['name']),
        weightMode: e['weightMode'] === 'perSet' ? 'perSet' : 'all',
        weights: Array.from({ length: SET_COUNT }, (_, i) =>
          Array.isArray(e['weights']) ? num(e['weights'][i]) : null
        ),
        note: str(e['note']),
      })),
    };
  }

  return null;
}

function emptySegment(): TreadmillSegment {
  return { speed: null, incline: null };
}

/** Copies segments field by field into fresh objects (see copySegment in the interval form). */
function copySegments(list: TreadmillSegment[] | undefined, count: number): TreadmillSegment[] {
  return Array.from({ length: count }, (_, i) => {
    const s = list?.[i];
    return s ? { speed: s.speed, incline: s.incline } : emptySegment();
  });
}

function segments(raw: unknown, count: number): TreadmillSegment[] {
  return Array.from({ length: count }, (_, i) => {
    const s = Array.isArray(raw) ? raw[i] : undefined;
    return isObj(s) ? { speed: num(s['speed']), incline: num(s['incline']) } : emptySegment();
  });
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isIsoDate(v: unknown): boolean {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
