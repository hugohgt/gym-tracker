
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
  user_id: string;
  name: string;
  color: string;
  last_used_at?: string; 
  prs?: Record<string, ExercisePR>;
}

export interface Set {
  id: string;
  weight?: number;      
  reps?: number;        
  distance?: number;    
  time?: number;        
  pace?: string;        
  holdTime?: number;    
  unit?: WorkoutUnit;
  rpe?: number;         
  completed: boolean;
  metricType?: 'reps' | 'sec' | 'min'; 
  metricValue?: number;               
}

export interface Exercise {
  id: string;
  name: string;
  category: string; 
  tags?: string[];  
  sets: Set[];
  isPR?: boolean;
  // UI helper fields for logger
  isNaming?: boolean;
  createdAt?: number;
}

export interface Workout {
  id: string;
  user_id: string; 
  profile_id?: string;
  date: string;
  title: string;
  type: WorkoutType;
  quality?: WorkoutQuality;
  exercises: Exercise[];
  notes?: string;
  duration?: number; 
  userId?: string; // Support for legacy mapping
}

export interface WorkoutTemplate {
  id: string;
  user_id: string;
  title: string;
  type: WorkoutType;
  exercises: Exercise[];
  profile_id?: string;
}

export type ViewType = 'dashboard' | 'history' | 'log' | 'ai' | 'stats' | 'timer' | 'profiles';

export interface AIAdvice {
  content: string;
  suggestions: string[];
}
