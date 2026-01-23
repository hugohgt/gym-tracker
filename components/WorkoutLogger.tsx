
import React, { useState, useRef, useMemo } from 'react';
import { Workout, Exercise, Set as WorkoutSet, WorkoutType, MUSCLE_GROUPS } from '../types';
import { X, Plus, Trash2, CheckCircle, PlusCircle, Dumbbell, Calendar, Sparkles, Search, History as HistoryIcon, Heart, ArrowLeft, Tag, Copy, ChevronRight } from 'lucide-react';

interface WorkoutLoggerProps {
  // Fix: onSave should accept a workout without userId as it is managed by the parent App component
  onSave: (workout: Omit<Workout, 'userId'>) => void;
  onCancel: () => void;
  previousWorkouts: Workout[];
  availableCategories: string[];
  onAddCategory: (cat: string) => void;
}

const WorkoutLogger: React.FC<WorkoutLoggerProps> = ({ 
  onSave, 
  onCancel, 
  previousWorkouts, 
  availableCategories,
  onAddCategory 
}) => {
  const [workoutType, setWorkoutType] = useState<WorkoutType | null>(null);
  const [isSelectingRepeat, setIsSelectingRepeat] = useState(false);
  const [title, setTitle] = useState('');
  const [workoutDate, setWorkoutDate] = useState(new Date().toISOString().split('T')[0]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [editingCategoryFor, setEditingCategoryFor] = useState<string | null>(null);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Enhanced search history that includes names, categories, and tags
  const historyItems = useMemo(() => {
    const items = new Map<string, { name: string; category: string; tags: string[] }>();
    previousWorkouts.forEach(w => w.exercises.forEach(ex => {
      items.set(ex.name.toLowerCase(), { 
        name: ex.name, 
        category: ex.category || 'General', 
        tags: ex.tags || [] 
      });
    }));
    return Array.from(items.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [previousWorkouts]);

  const filteredSuggestions = useMemo(() => {
    if (!searchTerm.trim()) return historyItems.slice(0, 5);
    const lowerSearch = searchTerm.toLowerCase();
    return historyItems.filter(item => 
      item.name.toLowerCase().includes(lowerSearch) || 
      item.category.toLowerCase().includes(lowerSearch) ||
      item.tags.some(tag => tag.toLowerCase().includes(lowerSearch))
    ).slice(0, 8);
  }, [searchTerm, historyItems]);

  const selectType = (type: WorkoutType) => {
    setWorkoutType(type);
    setIsSelectingRepeat(false);
    const defaultTitle = type === 'strength' ? 'Strength Session' : type === 'cardio' ? 'Cardio Session' : 'Mobility Session';
    setTitle(defaultTitle);
  };

  const handleRepeatSelection = (pastWorkout: Workout) => {
    // Clone logic: create new IDs for everything
    const clonedExercises: Exercise[] = pastWorkout.exercises.map(ex => ({
      ...ex,
      id: Date.now().toString() + Math.random(),
      sets: ex.sets.map(s => ({
        ...s,
        id: Math.random().toString(),
        completed: false // Reset completion status for the new workout
      }))
    }));

    setWorkoutType(pastWorkout.type);
    setTitle(pastWorkout.title);
    setExercises(clonedExercises);
    setWorkoutDate(new Date().toISOString().split('T')[0]); // Set to today
    setIsSelectingRepeat(false);
  };

  const addExercise = (historyItem?: { name: string; category: string; tags: string[] }) => {
    const defaultUnit = workoutType === 'cardio' ? 'km' : 'reps';
    const newEx: Exercise = {
      id: Date.now().toString() + Math.random(),
      name: historyItem?.name || '',
      category: historyItem?.category || 'General',
      tags: historyItem?.tags || [],
      sets: [{ 
        id: Math.random().toString(), 
        weight: workoutType === 'strength' ? 0 : undefined,
        reps: workoutType !== 'cardio' ? 0 : undefined,
        distance: workoutType === 'cardio' ? 0 : undefined,
        time: workoutType === 'cardio' || workoutType === 'mobility' ? 0 : undefined,
        pace: workoutType === 'cardio' ? '' : undefined,
        holdTime: workoutType === 'mobility' ? 0 : undefined,
        rpe: 8, 
        completed: false, 
        unit: defaultUnit,
        metricType: 'reps',
        metricValue: 0
      }]
    };
    setExercises([...exercises, newEx]);
    setSearchTerm('');
    setIsSearchFocused(false);
  };

  const removeExercise = (id: string) => {
    setExercises(exercises.filter(ex => ex.id !== id));
  };

  const updateExerciseName = (id: string, name: string) => {
    setExercises(prev => prev.map(ex => ex.id === id ? { ...ex, name } : ex));
  };

  const updateExerciseCategory = (exId: string, category: string) => {
    setExercises(prev => prev.map(ex => ex.id === exId ? { ...ex, category } : ex));
    setEditingCategoryFor(null);
  };

  const updateExerciseMetricType = (exId: string, type: 'reps' | 'sec' | 'min') => {
    setExercises(exercises.map(ex => {
      if (ex.id === exId) {
        return {
          ...ex,
          sets: ex.sets.map(s => ({
            ...s,
            metricType: type,
            reps: type === 'reps' ? s.metricValue : undefined,
            time: type !== 'reps' ? s.metricValue : undefined
          }))
        };
      }
      return ex;
    }));
  };

  const addSet = (exId: string) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id === exId) {
        const lastSet = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [...ex.sets, { 
            ...lastSet, 
            id: Math.random().toString(), 
            completed: false,
            metricType: lastSet?.metricType || 'reps'
          }]
        };
      }
      return ex;
    }));
  };

  const removeSet = (exId: string, setId: string) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id === exId) {
        return {
          ...ex,
          sets: ex.sets.filter(s => s.id !== setId)
        };
      }
      return ex;
    }));
  };

  const updateSet = (exId: string, setId: string, field: keyof WorkoutSet, value: any) => {
    setExercises(exercises.map(ex => {
      if (ex.id === exId) {
        return {
          ...ex,
          sets: ex.sets.map(s => {
            if (s.id === setId) {
              const updatedSet = { ...s, [field]: value };
              if (field === 'metricValue') {
                if (s.metricType === 'reps') updatedSet.reps = value;
                else updatedSet.time = value;
              } else if (field === 'reps' && (s.metricType === 'reps' || !s.metricType)) {
                updatedSet.metricValue = value;
              } else if (field === 'time' && (s.metricType === 'sec' || s.metricType === 'min')) {
                updatedSet.metricValue = value;
              }
              if (workoutType === 'cardio' && (field === 'distance' || field === 'time')) {
                const dist = field === 'distance' ? parseFloat(value) : s.distance;
                const time = field === 'time' ? parseFloat(value) : s.time;
                if (dist && time && dist > 0) {
                  const paceVal = time / dist; 
                  const min = Math.floor(paceVal);
                  const sec = Math.round((paceVal - min) * 60);
                  updatedSet.pace = `${min}:${sec.toString().padStart(2, '0')}`;
                }
              }
              return updatedSet;
            }
            return s;
          })
        };
      }
      return ex;
    }));
  };

  const handleSave = () => {
    if (exercises.length === 0) return alert("Add at least one exercise");
    if (!workoutType) return;
    // Fix: Pass an object that matches Omit<Workout, 'userId'>
    onSave({
      id: Date.now().toString(),
      date: new Date(workoutDate).toISOString(),
      title,
      type: workoutType,
      exercises: exercises.filter(ex => ex.name.trim() !== '')
    });
  };

  const handleAddNewCategory = (exId: string) => {
    if (!newCategoryInput.trim()) return;
    onAddCategory(newCategoryInput.trim());
    updateExerciseCategory(exId, newCategoryInput.trim());
    setNewCategoryInput('');
  };

  if (isSelectingRepeat) {
    return (
      <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col p-6 overflow-hidden">
        <header className="flex justify-between items-center mb-8 max-w-md mx-auto w-full">
          <button onClick={() => setIsSelectingRepeat(false)} className="p-2 -ml-2 text-slate-500 hover:text-white"><ArrowLeft size={24} /></button>
          <h1 className="text-xl font-black text-white uppercase tracking-tighter">Repeat Past Workout</h1>
          <div className="w-10"></div>
        </header>
        
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 max-w-md mx-auto w-full pb-10">
          {previousWorkouts.length === 0 ? (
            <div className="text-center py-20 opacity-30 uppercase font-black text-xs tracking-widest">No previous workouts found</div>
          ) : (
            previousWorkouts.map(pw => (
              <button 
                key={pw.id} 
                onClick={() => handleRepeatSelection(pw)}
                className="w-full bg-slate-800/40 border border-slate-700/60 p-5 rounded-3xl flex flex-col gap-3 text-left active:scale-[0.98] transition-transform hover:border-emerald-500/30 group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase truncate max-w-[200px]">{pw.title}</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-widest">
                      {new Date(pw.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    pw.type === 'strength' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 
                    pw.type === 'cardio' ? 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' : 
                    'text-indigo-400 bg-indigo-400/10 border-indigo-400/20'
                  }`}>{pw.type}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex flex-wrap gap-1">
                    {pw.exercises.slice(0, 2).map((e, idx) => (
                      <span key={idx} className="text-[8px] bg-slate-900 px-2 py-1 rounded-md text-slate-400 font-bold uppercase">{e.name}</span>
                    ))}
                    {pw.exercises.length > 2 && <span className="text-[8px] text-slate-600 font-bold uppercase">+{pw.exercises.length - 2} More</span>}
                  </div>
                  <ChevronRight size={16} className="text-slate-700 group-hover:text-emerald-500 transition-colors" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  if (!workoutType) {
    return (
      <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col p-6 overflow-hidden">
        <header className="flex justify-between items-center mb-10 max-w-md mx-auto w-full">
          <button onClick={onCancel} className="p-2 -ml-2 text-slate-500 hover:text-white"><X size={24} /></button>
          <h1 className="text-xl font-black text-white uppercase tracking-tighter">Choose Session</h1>
          <div className="w-10"></div>
        </header>
        <div className="flex-1 flex flex-col justify-center gap-6 pb-20 max-w-md mx-auto w-full">
          <TypeCard onClick={() => selectType('strength')} icon={<Dumbbell size={32} className="text-emerald-400" />} title="Strength" sub="WEIGHTS & REPS" color="hover:border-emerald-500/50 hover:bg-emerald-500/5" />
          <TypeCard onClick={() => selectType('cardio')} icon={<Heart size={32} className="text-cyan-400" />} title="Cardio" sub="DISTANCE & TIME" color="hover:border-cyan-500/50 hover:bg-cyan-500/5" />
          <TypeCard onClick={() => setIsSelectingRepeat(true)} icon={<Copy size={32} className="text-indigo-400" />} title="Repeat Workout" sub="RE-LOG A PAST SESSION" color="hover:border-indigo-500/50 hover:bg-indigo-500/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col overflow-hidden font-sans">
      <div className="p-6 bg-slate-900 border-b border-slate-800/50 shrink-0">
        <div className="max-w-md mx-auto w-full flex justify-between items-center">
          <button onClick={() => { setWorkoutType(null); setExercises([]); }} className="p-2 -ml-2 text-slate-500 hover:text-white"><ArrowLeft size={24} /></button>
          <div className="flex-1 flex flex-col items-center">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-transparent text-lg font-black text-center focus:outline-none uppercase text-slate-100 w-full" />
            <div className="flex items-center gap-2 mt-1">
              <Calendar size={10} className="text-emerald-500" />
              <input type="date" value={workoutDate} onChange={(e) => setWorkoutDate(e.target.value)} className="bg-transparent text-[10px] font-black text-slate-500 uppercase tracking-widest" />
            </div>
          </div>
          <button onClick={handleSave} className="bg-emerald-500 text-slate-900 h-10 px-6 rounded-2xl font-black text-xs tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform">SAVE</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="max-w-md mx-auto w-full p-4 space-y-6 pb-40">
          <div className="relative px-1">
            <div className={`flex items-center gap-3 bg-slate-800/40 border ${isSearchFocused ? 'border-emerald-500/50' : 'border-slate-700/60'} rounded-2xl px-4 py-3 shadow-lg transition-colors`}>
              <Search className={`w-5 h-5 ${isSearchFocused ? 'text-emerald-400' : 'text-slate-500'}`} />
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onFocus={() => setIsSearchFocused(true)} placeholder={`NAME, CATEGORY OR TAG...`} className="bg-transparent text-slate-100 font-bold focus:outline-none flex-1 uppercase text-sm" />
            </div>
            {isSearchFocused && (searchTerm || filteredSuggestions.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-[30]">
                <div className="p-2 space-y-1">
                  {filteredSuggestions.map((item, i) => (
                    <button key={i} onClick={() => addExercise(item)} className="w-full text-left px-4 py-3 hover:bg-slate-700 rounded-xl text-sm font-black text-slate-200 uppercase flex items-center justify-between">
                      <div className="flex flex-col">
                        <span>{item.name}</span>
                        <span className="text-[8px] text-slate-500 font-black tracking-widest">{item.category}</span>
                      </div>
                      <Plus size={14} className="text-emerald-500" />
                    </button>
                  ))}
                  {searchTerm && <button onClick={() => addExercise({name: searchTerm, category: 'General', tags: []})} className="w-full text-left px-4 py-3 bg-emerald-500/10 text-emerald-400 rounded-xl text-sm font-black uppercase">Add "{searchTerm}"</button>}
                </div>
              </div>
            )}
            {isSearchFocused && <div className="fixed inset-0 z-10" onClick={() => setIsSearchFocused(false)}></div>}
          </div>

          {exercises.map((ex, exIdx) => (
            <div key={ex.id} className="bg-slate-800/40 rounded-[2rem] border border-slate-700/60 overflow-hidden shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="p-5 border-b border-slate-700/50 bg-slate-800/20">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center font-black text-xs text-slate-500">{exIdx + 1}</div>
                      <input placeholder="EXERCISE NAME" value={ex.name} onChange={(e) => updateExerciseName(ex.id, e.target.value)} className="bg-transparent text-emerald-400 font-black focus:outline-none flex-1 uppercase tracking-tight" />
                    </div>
                    <button onClick={() => removeExercise(ex.id)} className="text-slate-700 hover:text-red-400 transition-colors"><Trash2 size={18} /></button>
                  </div>
                  
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    <button 
                      onClick={() => setEditingCategoryFor(editingCategoryFor === ex.id ? null : ex.id)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all ${
                        editingCategoryFor === ex.id ? 'bg-indigo-500 text-white border-indigo-400' : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:border-indigo-500/50'
                      }`}
                    >
                      <Tag size={10} />
                      {ex.category || 'CATEGORY'}
                    </button>
                    {ex.tags?.map((tag, tIdx) => (
                      <span key={tIdx} className="px-2 py-1 rounded-full bg-slate-700/50 text-slate-500 text-[8px] font-black uppercase">{tag}</span>
                    ))}
                  </div>

                  {editingCategoryFor === ex.id && (
                    <div className="mt-2 bg-slate-900 border border-slate-700 rounded-2xl p-4 animate-in slide-in-from-top-2">
                      <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar pb-2">
                        {availableCategories.map(cat => (
                          <button 
                            key={cat} 
                            onClick={() => updateExerciseCategory(ex.id, cat)}
                            className={`shrink-0 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase transition-all ${
                              ex.category === cat ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input 
                          value={newCategoryInput}
                          onChange={(e) => setNewCategoryInput(e.target.value)}
                          placeholder="ADD NEW..."
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-[10px] font-black uppercase text-white focus:outline-none focus:border-indigo-500"
                        />
                        <button 
                          onClick={() => handleAddNewCategory(ex.id)}
                          className="px-4 py-2 bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase"
                        >
                          ADD
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-5 space-y-3">
                {(workoutType === 'strength' || workoutType === 'mobility') && (
                  <div className="flex bg-slate-900/50 p-1 rounded-xl mb-4 border border-slate-700/50 max-w-[200px] mx-auto">
                    {['reps', 'sec', 'min'].map((type) => {
                      const currentType = ex.sets[0]?.metricType || 'reps';
                      return (
                        <button
                          key={type}
                          onClick={() => updateExerciseMetricType(ex.id, type as any)}
                          className={`flex-1 py-1.5 text-[9px] font-black rounded-lg transition-all uppercase tracking-wider ${
                            currentType === type ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-400'
                          }`}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="grid grid-cols-12 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-2 items-center text-center">
                  <div className="col-span-1">#</div>
                  {workoutType === 'strength' && (
                    <>
                      {(ex.sets[0]?.metricType === 'reps' || !ex.sets[0]?.metricType) ? (
                        <><div className="col-span-3">KG</div><div className="col-span-3">REPS</div></>
                      ) : (
                        <div className="col-span-6">{ex.sets[0]?.metricType?.toUpperCase() || 'TIME'}</div>
                      )}
                      <div className="col-span-2">RPE</div>
                    </>
                  )}
                  {workoutType === 'cardio' && <><div className="col-span-3">KM</div><div className="col-span-3">TIME</div><div className="col-span-2">PACE</div></>}
                  {workoutType === 'mobility' && (
                    <>
                      <div className="col-span-3">{(ex.sets[0]?.metricType || 'reps').toUpperCase()}</div>
                      <div className="col-span-3">HOLD(S)</div>
                      <div className="col-span-2">RPE</div>
                    </>
                  )}
                  <div className="col-span-3 text-right">Actions</div>
                </div>

                {ex.sets.map((set, sIdx) => (
                  <div key={set.id} className={`grid grid-cols-12 items-center gap-2 px-2 py-2 rounded-2xl transition-all ${set.completed ? 'bg-emerald-500/10 opacity-70' : 'hover:bg-slate-700/20'}`}>
                    <div className="col-span-1 font-black text-slate-600 text-[10px]">{sIdx + 1}</div>
                    
                    {workoutType === 'strength' && (
                      <>
                        {(set.metricType === 'reps' || !set.metricType) ? (
                          <>
                            <LogInput value={set.weight} onChange={(v) => updateSet(ex.id, set.id, 'weight', v)} disabled={set.completed} col="col-span-3" placeholder="0" />
                            <LogInput value={set.metricValue || set.reps} onChange={(v) => updateSet(ex.id, set.id, 'metricValue', v)} disabled={set.completed} col="col-span-3" placeholder="0" />
                          </>
                        ) : (
                          <LogInput value={set.metricValue || set.time} onChange={(v) => updateSet(ex.id, set.id, 'metricValue', v)} disabled={set.completed} col="col-span-6" color="text-cyan-400" placeholder={set.metricType === 'sec' ? "sec" : "min"} />
                        )}
                        <RPEInput value={set.rpe} onChange={(v) => updateSet(ex.id, set.id, 'rpe', v)} disabled={set.completed} col="col-span-2" />
                      </>
                    )}

                    {workoutType === 'cardio' && (
                      <>
                        <LogInput value={set.distance} onChange={(v) => updateSet(ex.id, set.id, 'distance', v)} disabled={set.completed} col="col-span-3" placeholder="0.0" />
                        <LogInput value={set.time} onChange={(v) => updateSet(ex.id, set.id, 'time', v)} disabled={set.completed} col="col-span-3" placeholder="min" />
                        <div className="col-span-2 flex justify-center">
                          <input value={set.pace || ''} onChange={(e) => updateSet(ex.id, set.id, 'pace', e.target.value)} disabled={set.completed} className="w-full bg-slate-900/50 border border-slate-700 text-center rounded-xl py-2 font-black text-[11px] text-cyan-400/80 focus:outline-none transition-colors focus:border-cyan-500/30" placeholder="0:00" />
                        </div>
                      </>
                    )}

                    {workoutType === 'mobility' && (
                      <>
                        <LogInput value={set.metricValue || set.reps} onChange={(v) => updateSet(ex.id, set.id, 'metricValue', v)} disabled={set.completed} col="col-span-3" placeholder="0" />
                        <LogInput value={set.holdTime} onChange={(v) => updateSet(ex.id, set.id, 'holdTime', v)} disabled={set.completed} col="col-span-3" placeholder="sec" />
                        <RPEInput value={set.rpe} onChange={(v) => updateSet(ex.id, set.id, 'rpe', v)} disabled={set.completed} col="col-span-2" />
                      </>
                    )}

                    <div className="col-span-3 flex justify-end items-center gap-1">
                      <button 
                        onClick={() => removeSet(ex.id, set.id)} 
                        className="p-2 text-slate-700 hover:text-red-400 transition-colors"
                        title="Remove Set"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button 
                        onClick={() => updateSet(ex.id, set.id, 'completed', !set.completed)} 
                        className={`p-2 rounded-xl transition-all ${set.completed ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-700 hover:text-emerald-400'}`}
                      >
                        <CheckCircle size={20} />
                      </button>
                    </div>
                  </div>
                ))}
                <button onClick={() => addSet(ex.id)} className="w-full mt-4 py-3 bg-slate-900/30 border border-dashed border-slate-700 rounded-2xl text-[10px] font-black uppercase text-slate-500 flex items-center justify-center gap-2 hover:bg-slate-700/20 hover:border-slate-600 transition-all"><Plus size={14} /> New Record</button>
              </div>
            </div>
          ))}
          
          {exercises.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 opacity-20 text-center">
              {workoutType === 'strength' ? <Dumbbell size={64} /> : <Heart size={64} />}
              <p className="mt-4 text-xs font-black uppercase tracking-widest">Search history to add exercises</p>
            </div>
          )}

          <button 
            onClick={() => addExercise()}
            className="w-full py-8 bg-slate-800/20 border-2 border-dashed border-slate-700/50 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 text-slate-500 hover:text-emerald-400 hover:border-emerald-400/50 transition-all group"
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center group-hover:border-emerald-500/30 transition-colors">
              <PlusCircle size={24} />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.2em]">Add Exercise</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const TypeCard = ({ onClick, icon, title, sub, color }: any) => (
  <button onClick={onClick} className={`group w-full bg-slate-800/40 border-2 border-slate-700/60 p-8 rounded-[2.5rem] flex flex-col items-center gap-4 transition-all active:scale-[0.98] ${color}`}>
    <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">{icon}</div>
    <div className="text-center">
      <h3 className="text-lg font-black text-white uppercase tracking-tight">{title}</h3>
      <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-widest">{sub}</p>
    </div>
  </button>
);

const LogInput = ({ value, onChange, disabled, col, color = "text-slate-200", placeholder = "0" }: any) => (
  <div className={`${col} flex justify-center`}>
    <input 
      type="number" 
      value={value === 0 ? '' : value || ''} 
      onChange={(e) => onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))} 
      disabled={disabled} 
      className={`w-full max-w-[70px] bg-slate-900/50 border border-slate-700 text-center rounded-xl py-2 font-black text-sm focus:outline-none transition-all ${color} focus:border-emerald-500/30 ${disabled ? 'border-transparent opacity-50' : ''}`} 
      placeholder={placeholder} 
    />
  </div>
);

const RPEInput = ({ value, onChange, disabled, col }: any) => {
  const intensity = useMemo(() => {
    if (!value || value <= 0) return { color: 'text-indigo-400', border: 'border-slate-700', glow: '' };
    if (value <= 6) return { color: 'text-emerald-400', border: 'border-emerald-500/30', glow: 'shadow-[0_0_8px_rgba(16,185,129,0.1)]' };
    if (value <= 8) return { color: 'text-amber-400', border: 'border-amber-500/30', glow: 'shadow-[0_0_8px_rgba(245,158,11,0.1)]' };
    return { color: 'text-rose-400', border: 'border-rose-500/30', glow: 'shadow-[0_0_8px_rgba(244,63,94,0.1)]' };
  }, [value]);

  return (
    <div className={`${col} flex justify-center`}>
      <input 
        type="number" 
        value={value === 0 ? '' : value || ''} 
        onChange={(e) => {
          let val = e.target.value === '' ? 0 : parseFloat(e.target.value);
          if (val > 10) val = 10;
          onChange(val);
        }} 
        disabled={disabled} 
        className={`w-full max-w-[70px] bg-slate-900/50 border ${intensity.border} text-center rounded-xl py-2 font-black text-sm focus:outline-none transition-all ${intensity.color} ${intensity.glow} focus:border-indigo-500/50 ${disabled ? 'border-transparent opacity-50' : ''}`} 
        placeholder="8" 
      />
    </div>
  );
};

export default WorkoutLogger;
