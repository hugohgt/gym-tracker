import React, { useState, useMemo } from 'react';
import { Workout, WorkoutType } from '../types';
import { ChevronDown, ChevronUp, Trash2, Calendar, Clock, Dumbbell, Heart, Sparkles, Timer, Tag, AlertTriangle, X, Trophy, Filter } from 'lucide-react';

interface HistoryViewProps {
  workouts: Workout[];
  onDelete: (id: string) => void;
  onEdit: (workout: Workout) => void;
  dateFilter?: string | null;
  onClearFilter?: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ workouts, onDelete, onEdit, dateFilter, onClearFilter }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [workoutToDelete, setWorkoutToDelete] = useState<Workout | null>(null);

  const filteredWorkouts = useMemo(() => {
    if (!dateFilter) return workouts;
    const filterDateStr = new Date(dateFilter).toDateString();
    return workouts.filter(w => new Date(w.date).toDateString() === filterDateStr);
  }, [workouts, dateFilter]);

  /**
   * Safe helper to get exercise count from workout, checking legacy and payload structures.
   */
  const getExerciseCount = (workout: any) => {
    if (!workout) return 0;
    const safePayload = workout.payload ?? {};
    const exercises = safePayload.exercises ?? workout.exercises ?? workout.items ?? workout.movements ?? workout.entries ?? workout.workoutExercises ?? [];
    return Array.isArray(exercises) ? exercises.length : 0;
  };

  if (workouts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-20 opacity-50">
        <div className="w-20 h-20 rounded-3xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center mb-6 shadow-xl">
          <Calendar size={32} className="text-slate-600" />
        </div>
        <p className="text-lg font-black text-slate-100 uppercase tracking-widest">Logbook is empty</p>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-2">Log a session to see your history here.</p>
      </div>
    );
  }

  const getTypeIcon = (type: WorkoutType) => {
    switch (type) {
      case 'strength': return <Dumbbell size={14} className="text-emerald-400" />;
      case 'cardio': return <Heart size={14} className="text-cyan-400" />;
      case 'mobility': return <Sparkles size={14} className="text-indigo-400" />;
      default: return <Dumbbell size={14} />;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const handleConfirmDelete = () => {
    if (workoutToDelete) {
      if (expandedId === workoutToDelete.id) {
        setExpandedId(null);
      }
      onDelete(workoutToDelete.id);
      setWorkoutToDelete(null);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      <div className="flex justify-between items-center mb-6 px-2">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-tighter">Logbook</h2>
          {dateFilter && (
            <div className="flex items-center gap-2 mt-1">
              <Filter size={10} className="text-emerald-400" />
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                Showing {formatDate(dateFilter)}
              </span>
              <button 
                onClick={onClearFilter}
                className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest ml-1 underline"
              >
                Show all
              </button>
            </div>
          )}
        </div>
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
          {filteredWorkouts.length} Sessions
        </span>
      </div>

      {filteredWorkouts.length === 0 && dateFilter && (
        <div className="py-20 text-center opacity-30 uppercase font-black text-xs tracking-widest">
          No sessions found for this date.
        </div>
      )}

      {filteredWorkouts.map((workout) => {
        // Fix: Cast to any to safely access potentially present legacy 'payload' property
        const workoutAny = workout as any;
        const safePayload = workoutAny.payload ?? {};
        const exercises = safePayload.exercises ?? workout.exercises ?? [];
        
        return (
          <div key={workout.id} className="bg-slate-800/50 border border-slate-700 rounded-[2rem] overflow-hidden shadow-sm transition-all">
            <div 
              className="p-5 flex items-center justify-between cursor-pointer active:bg-slate-800/80 transition-colors" 
              onClick={() => setExpandedId(expandedId === workout.id ? null : workout.id)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    workout.type === 'strength' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 
                    workout.type === 'cardio' ? 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' : 
                    'text-indigo-400 bg-indigo-400/10 border-indigo-400/20'
                  }`}>{workout.type}</span>
                  {workout.quality && workout.quality !== 'normal' && (
                    <span className="text-[8px] font-black uppercase text-slate-500 bg-slate-900/50 px-2 py-0.5 rounded-full border border-slate-700/50">
                      {workout.quality}
                    </span>
                  )}
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{formatDate(workout.date)}</span>
                </div>
                <h3 className="text-sm font-black text-slate-100 uppercase tracking-tight">{workout.title}</h3>
                <div className="flex items-center gap-3 mt-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <div className="flex items-center gap-1">{getTypeIcon(workout.type)}{getExerciseCount(workout)} Exercises</div>
                </div>
              </div>
              {expandedId === workout.id ? <ChevronUp className="text-slate-500" /> : <ChevronDown className="text-slate-500" />}
            </div>

            {expandedId === workout.id && (
              <div className="p-5 border-t border-slate-700 bg-slate-900/30 space-y-6 animate-in slide-in-from-top-2 duration-300">
                {exercises.length > 0 ? exercises.map((ex: any, idx: number) => (
                  <div key={idx} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-100 flex items-center gap-2 uppercase tracking-tight">
                        <span className={`w-1 h-3 rounded-full ${workout.type === 'strength' ? 'bg-emerald-500' : workout.type === 'cardio' ? 'bg-cyan-500' : 'bg-indigo-500'}`}></span>
                        {ex.name}
                        {ex.isPR && <Trophy size={12} className="text-yellow-400 fill-current ml-1" />}
                      </h4>
                      {ex.category && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[8px] font-black uppercase tracking-widest">
                          <Tag size={8} /> {ex.category}
                        </span>
                      )}
                    </div>
                    
                    {ex.tags && ex.tags.length > 0 && (
                      <div className="flex gap-1 pl-3">
                        {ex.tags.map((tag: string) => (
                          <span key={tag} className="text-[7px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded-md font-bold uppercase">{tag}</span>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pl-3">
                      {ex.sets.map((s: any, sIdx: number) => (
                        <div key={sIdx} className="bg-slate-800/80 p-2.5 rounded-2xl text-center border border-slate-700/50 flex flex-col justify-center min-h-[55px] shadow-sm">
                          {workout.type === 'strength' && (
                            <>
                              {(!s.metricType || s.metricType === 'reps') ? (
                                <>
                                  <div className="text-xs font-black text-slate-100 leading-tight">{s.weight}kg</div>
                                  <div className="text-[9px] font-bold text-slate-500 uppercase">x {s.metricValue || s.reps || 0} reps</div>
                                </>
                              ) : (
                                <>
                                  <div className="text-xs font-black text-cyan-400 leading-tight">{s.metricValue || s.time || 0} {s.metricType}</div>
                                  <div className="text-[9px] font-bold text-slate-500 uppercase">Timed Set</div>
                                </>
                              )}
                            </>
                          )}
                          {workout.type === 'cardio' && (
                            <>
                              <div className="text-xs font-black text-cyan-400 leading-tight">{s.distance} km</div>
                              <div className="text-[9px] font-bold text-slate-500 uppercase">{s.time}m • {s.pace}/km</div>
                            </>
                          )}
                          {workout.type === 'mobility' && (
                            <>
                              <div className="text-xs font-black text-indigo-400 leading-tight">{s.metricValue || s.reps || 0} {s.metricType || 'reps'}</div>
                              <div className="text-[9px] font-bold text-slate-500 uppercase">{s.holdTime || s.time || 0}s hold</div>
                            </>
                          )}
                          {s.rpe && (
                            <div className={`text-[7px] font-black uppercase mt-1 ${s.rpe >= 9 ? 'text-rose-400' : s.rpe >= 7 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              RPE {s.rpe}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )) : (
                  <div className="py-8 text-center bg-slate-900/50 rounded-2xl border border-dashed border-slate-800">
                     <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No detailed exercise data found for this entry.</p>
                  </div>
                )}
                <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(workout);
                    }}
                    className="text-[10px] font-black text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 uppercase tracking-widest transition-colors py-2 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
                  >
                    Edit Entry
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setWorkoutToDelete(workout);
                    }} 
                    className="text-[10px] font-black text-slate-600 hover:text-red-400 flex items-center gap-1.5 uppercase tracking-widest transition-colors py-2 px-3 rounded-xl hover:bg-red-500/5"
                  >
                    <Trash2 size={12} /> Delete Entry
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Delete Confirmation Modal */}
      {workoutToDelete && (
        <div className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-xs p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-6">
                <AlertTriangle size={32} />
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Delete entry?</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">This action cannot be undone.</p>
              
              <div className="w-full bg-slate-950/50 rounded-2xl p-4 border border-slate-800/50 mb-8 text-left">
                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Workout Details</p>
                <p className="text-sm font-black text-white uppercase truncate">{workoutToDelete.title}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{formatDate(workoutToDelete.date)}</p>
              </div>

              <div className="w-full space-y-3">
                <button 
                  onClick={handleConfirmDelete}
                  className="w-full py-4 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-red-500/20"
                >
                  Delete
                </button>
                <button 
                  onClick={() => setWorkoutToDelete(null)}
                  className="w-full py-4 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryView;