export type PhaseType = 'warmup' | 'interval' | 'pause' | 'cooldown';

export interface Phase {
  label: string;
  dur: number;
  type: PhaseType;
  round?: number;
}

export interface Exercise {
  name: string;
  sets: boolean[];
  restMins: 2 | 3;
}

export interface RestTimerState {
  visible: boolean;
  mins: 2 | 3;
  left: number;
  total: number;
  running: boolean;
  exerciseIdx: number;
}

export interface StoredState {
  c?: { idx: number; left: number; done: boolean };
  s?: {
    exercises?: Array<{ name: string; sets: boolean[]; restMins: number }>;
    restMins?: number;
  };
  keepAwake?: boolean;
}

export const PHASES: Phase[] = [
  { label: 'Warm Up',      dur: 6 * 60, type: 'warmup'   },
  { label: 'Interval',     dur: 4 * 60, type: 'interval', round: 1 },
  { label: 'Active Pause', dur: 3 * 60, type: 'pause',    round: 1 },
  { label: 'Interval',     dur: 4 * 60, type: 'interval', round: 2 },
  { label: 'Active Pause', dur: 3 * 60, type: 'pause',    round: 2 },
  { label: 'Interval',     dur: 4 * 60, type: 'interval', round: 3 },
  { label: 'Active Pause', dur: 3 * 60, type: 'pause',    round: 3 },
  { label: 'Interval',     dur: 4 * 60, type: 'interval', round: 4 },
  { label: 'Cool Down',    dur: 3 * 60, type: 'cooldown'  },
];

export function defaultExercises(): Exercise[] {
  return Array.from({ length: 4 }, (_, i) => ({
    name: `Exercise ${i + 1}`,
    sets: [false, false, false, false],
    restMins: 2 as const,
  }));
}

export function defaultRestTimer(): RestTimerState {
  return { visible: false, mins: 2, left: 120, total: 120, running: false, exerciseIdx: -1 };
}
