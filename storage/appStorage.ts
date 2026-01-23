
import { Workout, UserProfile, MUSCLE_GROUPS } from '../types';

export interface AppState {
  version: number;
  updatedAt: string;
  profiles: UserProfile[];
  activeUserId: string | null;
  customCategories: string[];
  workouts: Workout[];
}

const STORAGE_KEY = 'gymTracker.appState';
const BACKUP_KEY = 'gymTracker.backupState';
const CURRENT_VERSION = 2;

export const createDefaultState = (): AppState => ({
  version: CURRENT_VERSION,
  updatedAt: new Date().toISOString(),
  profiles: [],
  activeUserId: null,
  customCategories: [...MUSCLE_GROUPS],
  workouts: [],
});

/**
 * Migration helper to pull data from legacy separate keys
 */
export const migrateFromLegacy = (): AppState | null => {
  try {
    const savedProfiles = localStorage.getItem('ironlog_profiles');
    const savedActiveUserId = localStorage.getItem('ironlog_active_user');
    const savedCategories = localStorage.getItem('ironlog_categories');
    
    if (!savedProfiles && !savedActiveUserId) return null;

    const profiles = savedProfiles ? JSON.parse(savedProfiles) : [];
    const activeUserId = savedActiveUserId || (profiles.length > 0 ? profiles[0].id : null);
    const customCategories = savedCategories ? JSON.parse(savedCategories) : [...MUSCLE_GROUPS];
    
    const workouts: Workout[] = [];
    profiles.forEach((p: UserProfile) => {
      const ws = localStorage.getItem(`ironlog_workouts_${p.id}`);
      if (ws) {
        const parsedWs = JSON.parse(ws) as Workout[];
        workouts.push(...parsedWs.map(w => ({ ...w, userId: p.id })));
      }
    });

    return {
      version: 1, // Legacy is considered version 1 once consolidated
      updatedAt: new Date().toISOString(),
      profiles,
      activeUserId,
      customCategories,
      workouts,
    };
  } catch (e) {
    console.error('Legacy migration failed', e);
    return null;
  }
};

/**
 * Applies sequential migrations to the state object
 */
export const migrateState = (state: any): AppState => {
  let migratedState = { ...state };
  let version = migratedState.version || 0;

  if (version === CURRENT_VERSION) return migratedState as AppState;

  console.info(`Migrating app state from v${version} to v${CURRENT_VERSION}...`);

  try {
    // v0 -> v1: Wrap legacy keys if the state passed was essentially empty or missing version
    if (version < 1) {
      const legacy = migrateFromLegacy();
      if (legacy) {
        migratedState = { ...legacy };
      } else if (!migratedState.profiles) {
        migratedState = createDefaultState();
        migratedState.version = 1;
      }
      version = 1;
    }

    // v1 -> v2: Placeholder migration
    if (version < 2) {
      if (!migratedState.customCategories || migratedState.customCategories.length === 0) {
        migratedState.customCategories = [...MUSCLE_GROUPS];
      }
      migratedState.version = 2;
      version = 2;
    }

    migratedState.updatedAt = new Date().toISOString();
    return migratedState as AppState;

  } catch (error) {
    console.error('Migration failed critically. Resetting to default state to prevent crash.', error);
    return createDefaultState();
  }
};

/**
 * Loads state with automatic backup recovery
 */
export const loadState = (): { state: AppState, recovered: boolean } => {
  let recovered = false;
  
  const tryParse = (json: string | null): AppState | null => {
    if (!json) return null;
    try {
      const parsed = JSON.parse(json);
      // Minimal structural validation
      if (typeof parsed !== 'object' || parsed === null) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  };

  const raw = localStorage.getItem(STORAGE_KEY);
  let parsed = tryParse(raw);

  // If primary load fails, try recovery from backup
  if (!parsed) {
    const backupRaw = localStorage.getItem(BACKUP_KEY);
    parsed = tryParse(backupRaw);
    if (parsed) {
      recovered = true;
      console.warn('Primary state corrupted. Successfully recovered from backupState.');
    }
  }

  // If primary and backup fail, try legacy migration or default
  if (!parsed) {
    const legacy = migrateFromLegacy();
    if (legacy) {
      return { state: migrateState(legacy), recovered: false };
    }
    return { state: createDefaultState(), recovered: false };
  }

  const migrated = migrateState(parsed);
  return { state: migrated, recovered };
};

/**
 * Saves state after creating a backup of the existing state
 */
export const saveState = (state: AppState): void => {
  try {
    // Rotate current state to backup before saving new state
    const currentStateRaw = localStorage.getItem(STORAGE_KEY);
    if (currentStateRaw) {
      localStorage.setItem(BACKUP_KEY, currentStateRaw);
    }

    const payload: AppState = {
      ...state,
      updatedAt: new Date().toISOString(),
      version: CURRENT_VERSION,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error('Failed to save app state:', error);
  }
};
