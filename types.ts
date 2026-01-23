
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

export interface UserProfile {
  id: string;
  name: string;
  color: string;
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
  category: string; // Changed from MuscleGroup to string for flexibility
  tags?: string[];  // Added tags for additional categorization
  sets: Set[];
}

export interface Workout {
  id: string;
  userId: string; // Added userId for multi-user support
  date: string;
  title: string;
  type: WorkoutType;
  exercises: Exercise[];
  notes?: string;
  duration?: number; // in minutes
}

export type ViewType = 'dashboard' | 'history' | 'log' | 'ai' | 'stats' | 'timer' | 'profiles';

export interface AIAdvice {
  content: string;
  suggestions: string[];
}
