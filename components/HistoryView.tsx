
import React, { useState } from 'react';
import { Workout, WorkoutType } from '../types';
import { ChevronDown, ChevronUp, Trash2, Calendar, Clock, Dumbbell, Heart, Sparkles, Timer, Tag } from 'lucide-react';

interface HistoryViewProps {
  workouts: Workout[];
  onDelete: (id: string) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ workouts, onDelete }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (workouts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-20 opacity-50">
        <Calendar size={48} className="mb-4 text-slate-600" />
        <p className="text-lg font-bold">Logbook is empty</p>
        <p className="text-sm">Log a session to see history</p>
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

  return (
    <div className="space-y-4 pb-12">
      <h2 className="text-xl font-bold mb-6">Logbook</h2>
      {workouts.map((workout) => (
        <div key={workout.id} className="bg-slate-800/50 border border-slate-700 rounded-3xl overflow-hidden shadow-sm transition-all">
          <div 
            className="p-5 flex items-center justify-between cursor-pointer active:bg-slate-800/80" 
            onClick={() => setExpandedId(expandedId === workout.id ? null : workout.id)}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                  workout.type === 'strength' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 
                  workout.type === 'cardio' ? 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' : 
                  'text-indigo-400 bg-indigo-400/10 border-indigo-400/20'
                }`}>{workout.type}</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase">{new Date(workout.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <h3 className="text-sm font-black text-slate-100 uppercase tracking-tight">{workout.title}</h3>
              <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-slate-400">
                <div className="flex items-center gap-1">{getTypeIcon(workout.type)}{workout.exercises.length} Exercises</div>
              </div>
            </div>
            {expandedId === workout.id ? <ChevronUp className="text-slate-500" /> : <ChevronDown className="text-slate-500" />}
          </div>

          {expandedId === workout.id && (
            <div className="p-5 border-t border-slate-700 bg-slate-900/30 space-y-5 animate-in slide-in-from-top-2 duration-300">
              {workout.exercises.map((ex, idx) => (
                <div key={idx} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-100 flex items-center gap-2 uppercase tracking-tight">
                      <span className={`w-1 h-3 rounded-full ${workout.type === 'strength' ? 'bg-emerald-500' : workout.type === 'cardio' ? 'bg-cyan-500' : 'bg-indigo-500'}`}></span>
                      {ex.name}
                    </h4>
                    {ex.category && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[8px] font-black uppercase tracking-tighter">
                        <Tag size={8} /> {ex.category}
                      </span>
                    )}
                  </div>
                  
                  {ex.tags && ex.tags.length > 0 && (
                    <div className="flex gap-1 pl-3">
                      {ex.tags.map(tag => (
                        <span key={tag} className="text-[7px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded-md font-bold uppercase">{tag}</span>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pl-3">
                    {ex.sets.map((s, sIdx) => (
                      <div key={sIdx} className="bg-slate-800/80 p-2.5 rounded-xl text-center border border-slate-700/50 flex flex-col justify-center min-h-[50px]">
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
              ))}
              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Permanently delete this entry?")) onDelete(workout.id);
                  }} 
                  className="text-[10px] font-black text-red-400 hover:text-red-300 flex items-center gap-1.5 uppercase tracking-widest transition-colors"
                >
                  <Trash2 size={12} /> Delete Entry
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default HistoryView;
