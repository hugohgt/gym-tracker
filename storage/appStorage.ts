
import { Workout, UserProfile, MUSCLE_GROUPS, Exercise, WorkoutTemplate, ExercisePR, WorkoutType } from '../types';

export interface AppState {
  version: number;
  backupType?: 'app' | 'profile'; // Identification for branching import logic
  updatedAt: string;
  profiles: UserProfile[];
  activeUserId: string | null;
  customCategories: string[];
  workouts: Workout[];
  templates: WorkoutTemplate[];
}

export interface BackupSnapshot {
  date: string;
  workoutCount: number;
  breakdown: Record<WorkoutType, number>;
  data: AppState;
}

const STORAGE_KEY = 'gymTracker.appState';
const BACKUP_KEY = 'gymTracker.backupState';
const LAST_BACKUP_TIME_KEY = 'gymTracker.lastBackupAt';
const LATEST_BACKUP_DATA_KEY = 'gymTracker.latestBackup';
const CURRENT_VERSION = 2;

/**
 * Normalizes exercise names for consistent PR tracking
 */
export const normalizeExerciseName = (name: string): string => {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
};

/**
 * Normalizes a single workout object to ensure consistent data structure.
 */
export const normalizeWorkout = (w: any): Workout => {
  const legacyExercises = w.exercises || w.items || w.movements || w.entries || w.workoutExercises || [];
  const normalizedExercises: Exercise[] = Array.isArray(legacyExercises) ? legacyExercises : [];

  return {
    id: w.id || Math.random().toString(36).substr(2, 9),
    userId: w.userId || '',
    date: w.date || new Date().toISOString(),
    title: w.title || 'Untitled Workout',
    type: (w.type?.toLowerCase() as any) || 'strength',
    quality: w.quality || 'normal',
    exercises: normalizedExercises.map(ex => ({
      ...ex,
      id: ex.id || Math.random().toString(36).substr(2, 9),
      name: ex.name || 'Untitled Exercise',
      category: ex.category || 'General',
      isPR: !!ex.isPR,
      sets: Array.isArray(ex.sets) ? ex.sets.map(s => ({
        ...s,
        id: s.id || Math.random().toString(36).substr(2, 9),
        completed: !!s.completed
      })) : []
    })),
    notes: w.notes,
    duration: w.duration
  };
};

export const normalizeTemplate = (t: any): WorkoutTemplate => {
  return {
    id: t.id || Math.random().toString(36).substr(2, 9),
    userId: t.userId || '',
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
  let version = migratedState.version || 0;

  if (version === CURRENT_VERSION) {
    if (Array.isArray(migratedState.workouts)) {
      migratedState.workouts = migratedState.workouts.map(normalizeWorkout);
    } else {
      migratedState.workouts = [];
    }
    
    if (Array.isArray(migratedState.templates)) {
      migratedState.templates = migratedState.templates.map(normalizeTemplate);
    } else {
      migratedState.templates = [];
    }

    if (Array.isArray(migratedState.profiles)) {
      migratedState.profiles = migratedState.profiles.map((p: any) => ({
        ...p,
        prs: p.prs || {}
      }));
    } else {
      migratedState.profiles = [];
    }
    return migratedState as AppState;
  }

  // Fallback for very old versions or missing structures
  if (!migratedState.profiles) {
    return createDefaultState();
  }

  migratedState.version = CURRENT_VERSION;
  migratedState.updatedAt = new Date().toISOString();
  migratedState.backupType = 'app';
  return migratedState as AppState;
};

export const loadState = (): { state: AppState, recovered: boolean } => {
  let recovered = false;
  
  const tryParse = (json: string | null): AppState | null => {
    if (!json) return null;
    try {
      const parsed = JSON.parse(json);
      if (typeof parsed !== 'object' || parsed === null) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  };

  const raw = localStorage.getItem(STORAGE_KEY);
  let parsed = tryParse(raw);

  if (!parsed) {
    const backupRaw = localStorage.getItem(BACKUP_KEY);
    parsed = tryParse(backupRaw);
    if (parsed) recovered = true;
  }

  if (!parsed) return { state: createDefaultState(), recovered: false };

  const migrated = migrateState(parsed);
  return { state: migrated, recovered };
};

export const saveState = (state: AppState): void => {
  try {
    const currentStateRaw = localStorage.getItem(STORAGE_KEY);
    if (currentStateRaw) {
      localStorage.setItem(BACKUP_KEY, currentStateRaw);
    }

    const payload: AppState = {
      ...state,
      backupType: 'app',
      updatedAt: new Date().toISOString(),
      version: CURRENT_VERSION,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error('Failed to save app state:', error);
  }
};

/**
 * Backup Logic
 */
export const checkIsBackupDue = (): boolean => {
  const lastBackupStr = localStorage.getItem(LAST_BACKUP_TIME_KEY);
  if (!lastBackupStr) return true;
  
  const lastBackup = new Date(lastBackupStr).getTime();
  const now = Date.now();
  const weekInMs = 7 * 24 * 60 * 60 * 1000;
  
  return (now - lastBackup) > weekInMs;
};

export const createBackupSnapshot = (state: AppState): BackupSnapshot => {
  const breakdown: Record<WorkoutType, number> = { strength: 0, cardio: 0, mobility: 0 };
  state.workouts.forEach(w => {
    if (breakdown[w.type] !== undefined) breakdown[w.type]++;
  });

  const snapshot: BackupSnapshot = {
    date: new Date().toISOString(),
    workoutCount: state.workouts.length,
    breakdown,
    data: {
      ...state,
      backupType: 'app', // Explicitly marking as app-wide backup
      updatedAt: new Date().toISOString()
    }
  };

  localStorage.setItem(LATEST_BACKUP_DATA_KEY, JSON.stringify(snapshot));
  localStorage.setItem(LAST_BACKUP_TIME_KEY, snapshot.date);
  
  return snapshot;
};

export const getLatestBackup = (): BackupSnapshot | null => {
  const raw = localStorage.getItem(LATEST_BACKUP_DATA_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/**
 * Global Export/Download Utility
 */
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
