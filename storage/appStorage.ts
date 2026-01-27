
import { Workout, UserProfile, MUSCLE_GROUPS, Exercise, WorkoutTemplate, ExercisePR, WorkoutType } from '../types';

export interface AppState {
  version: number;
  backupType?: 'app' | 'profile';
  updatedAt: string;
  profiles: UserProfile[];
  activeUserId: string | null;
  customCategories: string[];
  workouts: Workout[];
  templates: WorkoutTemplate[];
}

const STORAGE_KEY = 'gymTracker.appState';
const BACKUP_KEY = 'gymTracker.backupState';
const CURRENT_VERSION = 3;

export const normalizeExerciseName = (name: string): string => {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
};

export const normalizeWorkout = (w: any): Workout => {
  const legacyExercises = w.exercises || w.items || w.movements || [];
  
  return {
    id: w.id || Math.random().toString(36).substr(2, 9),
    user_id: w.user_id || w.userId || '',
    profile_id: w.profile_id || w.profileId || '',
    date: w.date || new Date().toISOString(),
    title: w.title || 'Untitled Workout',
    type: (w.type?.toLowerCase() as any) || 'strength',
    quality: w.quality || 'normal',
    exercises: (Array.isArray(legacyExercises) ? legacyExercises : []).map(ex => ({
      ...ex,
      id: ex.id || Math.random().toString(36).substr(2, 9),
      name: ex.name || 'Untitled Exercise',
      category: ex.category || 'General',
      isPR: !!ex.isPR,
      sets: Array.isArray(ex.sets) ? ex.sets.map((s: any) => ({
        ...s,
        id: s.id || Math.random().toString(36).substr(2, 9),
        completed: !!s.completed
      })) : []
    })),
    notes: w.notes || '',
    duration: w.duration || 0
  };
};

export const normalizeTemplate = (t: any): WorkoutTemplate => {
  return {
    id: t.id || Math.random().toString(36).substr(2, 9),
    user_id: t.user_id || t.userId || '',
    title: t.title || 'Untitled Template',
    type: (t.type?.toLowerCase() as any) || 'strength',
    exercises: (t.exercises || []).map((ex: any) => ({
      ...ex,
      id: ex.id || Math.random().toString(36).substr(2, 9),
      sets: (ex.sets || []).map((s: any) => ({
        ...s,
        id: s.id || Math.random().toString(36).substr(2, 9),
        completed: false
      }))
    }))
  };
};

export const createDefaultState = (): AppState => ({
  version: CURRENT_VERSION,
  updatedAt: new Date().toISOString(),
  profiles: [],
  activeUserId: null,
  customCategories: [...MUSCLE_GROUPS],
  workouts: [],
  templates: [],
  backupType: 'app'
});

export const migrateState = (state: any): AppState => {
  let migratedState = { ...state };
  migratedState.version = CURRENT_VERSION;
  migratedState.updatedAt = new Date().toISOString();
  
  if (Array.isArray(migratedState.workouts)) {
    migratedState.workouts = migratedState.workouts.map(normalizeWorkout);
  }
  
  return migratedState as AppState;
};

export const loadState = (): { state: AppState, recovered: boolean } => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { state: createDefaultState(), recovered: false };
  try {
    const parsed = JSON.parse(raw);
    return { state: migrateState(parsed), recovered: false };
  } catch {
    return { state: createDefaultState(), recovered: false };
  }
};

export const saveState = (state: AppState): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const downloadAppStateAsJSON = (state: any, fileName: string) => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
