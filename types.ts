
export const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Arms',
  'Legs',
  'Glutes',
  'Core',
  'Calves',
  'Lower back'
] as const;

export type MuscleGroup = typeof MUSCLE_GROUPS[number];

export type WorkoutUnit = 'reps' | 'sec' | 'min' | 'meters' | 'km';

export type WorkoutType = 'strength' | 'cardio' | 'mobility';

export type WorkoutQuality = 'normal' | 'light' | 'incomplete';

export interface ExercisePR {
  bestE1RM: number;
  bestWeight: number;
  bestVolume: number;
  lastPRDate: string; // ISO date
}

export interface UserProfile {
  id: string;
  name: string;
  color: string;
  lastUsedAt?: string; // ISO date string for tracking last activity
  prs?: Record<string, ExercisePR>; // Normalized exercise name -> PR data
}

export interface Set {
  id: string;
  weight?: number;      // Strength
  reps?: number;        // Strength, Mobility
  distance?: number;    // Cardio
  time?: number;        // Cardio, Mobility (Duration/Hold)
  pace?: string;        // Cardio (e.g. "5:30")
  holdTime?: number;    // Mobility
  unit?: WorkoutUnit;
  rpe?: number;         // Rate of Perceived Exertion (1-10)
  completed: boolean;
  metricType?: 'reps' | 'sec' | 'min'; // New: type of the primary metric
  metricValue?: number;               // New: value for the selected metric
}

export interface Exercise {
  id: string;
  name: string;
  category: string; 
  tags?: string[];  
  sets: Set[];
  isPR?: boolean;    // Indicates if this exercise achieved a PR in this specific workout
}

export interface Workout {
  id: string;
  userId: string; 
  date: string;
  title: string;
  type: WorkoutType;
  quality?: WorkoutQuality;
  exercises: Exercise[];
  notes?: string;
  duration?: number; // in minutes
}

export interface WorkoutTemplate {
  id: string;
  userId: string;
  title: string;
  type: WorkoutType;
  exercises: Exercise[];
}

export type ViewType = 'dashboard' | 'history' | 'log' | 'ai' | 'stats' | 'timer' | 'profiles';

export interface AIAdvice {
  content: string;
  suggestions: string[];
}
