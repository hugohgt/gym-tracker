
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Workout, Exercise, Set as WorkoutSet, WorkoutType, WorkoutTemplate, WorkoutQuality } from '../types';
import { X, Plus, Trash2, CheckCircle, Dumbbell, Calendar, Search, Heart, ArrowLeft, ChevronRight, ChevronLeft, Loader2, Star, Info, Clock, Copy } from 'lucide-react';

interface WorkoutLoggerProps {
  onSave: (workout: any) => void;
  onSaveTemplate: (template: Omit<WorkoutTemplate, 'user_id'>) => void;
  onDeleteTemplate?: (id: string) => void;
  onUpdateTemplate?: (id: string, updates: Partial<WorkoutTemplate>) => void;
  onCancel: () => void;
  previousWorkouts: Workout[];
  templates: WorkoutTemplate[];
  availableCategories: string[];
  onAddCategory: (cat: string) => void;
  onToast?: (t: { message: string, type: 'success' | 'error' } | null) => void;
  isSaving?: boolean;
}

const WorkoutLogger: React.FC<WorkoutLoggerProps> = ({ 
  onSave, 
  onSaveTemplate,
  onCancel, 
  previousWorkouts, 
  isSaving = false,
  onToast
}) => {
  const [workoutType, setWorkoutType] = useState<WorkoutType | null>(null);
  const [quality, setQuality] = useState<WorkoutQuality>('normal');
  const [isSelectingRepeat, setIsSelectingRepeat] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [title, setTitle] = useState('');
  const [workoutDate, setWorkoutDate] = useState(new Date().toISOString().split('T')[0]);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  const [strengthExercises, setStrengthExercises] = useState<Exercise[]>([]);
  const [cardioExercises, setCardioExercises] = useState<Exercise[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const activeExercises = workoutType === 'strength' ? strengthExercises : cardioExercises;
  
  const setActiveExercises = (update: (prev: Exercise[]) => Exercise[]) => {
    if (workoutType === 'strength') {
      setStrengthExercises(update);
    } else if (workoutType === 'cardio') {
      setCardioExercises(update);
    }
  };

  // Prevent background scroll when date picker is open
  useEffect(() => {
    if (isDatePickerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isDatePickerOpen]);

  const historyItems = useMemo(() => {
    const items = new Map<string, { name: string; category: string; tags: string[] }>();
    (previousWorkouts || []).forEach(w => {
      const source = (w as any).payload?.exercises ?? w.exercises ?? [];
      if (Array.isArray(source)) {
        source.forEach((ex: any) => {
          if (ex?.name) {
            items.set(ex.name.toLowerCase(), { 
              name: ex.name, 
              category: ex.category || 'General', 
              tags: ex.tags || [] 
            });
          }
        });
      }
    });
    return Array.from(items.values()).sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  }, [previousWorkouts]);

  const filteredSuggestions = (term: string) => {
    if (!term.trim()) return historyItems.slice(0, 5);
    const lowerTerm = term.toLowerCase();
    return historyItems.filter(item => 
      item.name.toLowerCase().includes(lowerTerm) || 
      item.category.toLowerCase().includes(lowerTerm)
    ).slice(0, 5);
  };

  const calculatePace = (dist?: number, time?: number) => {
    if (!dist || !time || dist <= 0) return '-:--';
    const paceSeconds = (time * 60) / dist;
    const m = Math.floor(paceSeconds / 60);
    const s = Math.round(paceSeconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const selectType = (type: WorkoutType) => {
    setWorkoutType(type);
    setQuality('normal');
    setIsSelectingRepeat(false);
    setTitle(type === 'strength' ? 'STRENGTH SESSION' : type === 'cardio' ? 'CARDIO SESSION' : 'MOBILITY SESSION');
  };

  const createDefaultSet = (): WorkoutSet => {
    const base = { id: crypto.randomUUID(), completed: false };
    if (workoutType === 'cardio') return { ...base, distance: 0, time: 0, pace: '0:00' };
    return { ...base, weight: 0, metricValue: 0, metricType: 'reps', rpe: 7 };
  };

  const addNewEmptyExercise = () => {
    const newEx: Exercise = {
      id: crypto.randomUUID(),
      name: '',
      category: 'General',
      sets: [createDefaultSet()],
      isNaming: true,
      createdAt: Date.now()
    };
    setActiveExercises(prev => [newEx, ...prev]);
  };

  const addExerciseFromHistory = (historyItem?: { name: string; category: string; tags: string[] }) => {
    const exName = historyItem?.name || searchTerm.trim();
    if (!exName) return;

    const newEx: Exercise = {
      id: crypto.randomUUID(),
      name: exName,
      category: historyItem?.category || 'General',
      sets: [createDefaultSet()],
      createdAt: Date.now()
    };
    
    setActiveExercises(prev => [newEx, ...prev]);
    setSearchTerm('');
    setIsSearchFocused(false);
  };

  const confirmExerciseName = (id: string, name: string, category: string = 'General') => {
    setActiveExercises(prev => prev.map(ex => ex.id === id ? {
      ...ex,
      name: name.trim(),
      category: category,
      isNaming: false
    } as Exercise : ex));
  };

  const updateSet = (exId: string, setId: string, field: keyof WorkoutSet, value: any) => {
    setActiveExercises(prev => prev.map(ex => {
      if (ex.id !== exId) return ex;
      return {
        ...ex,
        sets: ex.sets.map(s => {
          if (s.id !== setId) return s;
          const updated = { ...s, [field]: value };
          if (workoutType === 'cardio' && (field === 'distance' || field === 'time')) {
            updated.pace = calculatePace(updated.distance, updated.time);
          }
          return updated;
        })
      };
    }));
  };

  const addSet = (exId: string) => {
    setActiveExercises(prev => prev.map(ex => {
      if (ex.id !== exId) return ex;
      const last = ex.sets[ex.sets.length - 1];
      return { 
        ...ex, 
        sets: [...ex.sets, { 
          ...last, 
          id: crypto.randomUUID(), 
          completed: false,
          rpe: 7
        }] 
      };
    }));
  };

  const handleSave = () => {
    const finalExercises = activeExercises
      .filter(ex => ex.name.trim() !== '')
      .map(ex => ({ ...ex, isNaming: false }))
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    if (finalExercises.length === 0 || isSaving) return;

    onSave({
      id: crypto.randomUUID(),
      date: new Date(workoutDate).toISOString(),
      title,
      type: workoutType!,
      quality,
      exercises: finalExercises,
      payload: { exercises: finalExercises, type: workoutType, quality }
    });
  };

  const handleSaveAsTemplate = () => {
    const validExercises = activeExercises.filter(ex => ex.name.trim() !== '');
    if (validExercises.length === 0) {
      onToast?.({ message: "Add at least one exercise", type: 'error' });
      return;
    }
    onSaveTemplate({
      id: crypto.randomUUID(),
      title: title || 'New Template',
      type: workoutType!,
      exercises: validExercises.map(ex => ({ ...ex, isNaming: false }))
    });
    onToast?.({ message: "Template saved", type: 'success' });
  };

  const getDisplayNumber = (ex: Exercise) => {
    const chronological = [...activeExercises].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    return chronological.findIndex(e => e.id === ex.id) + 1;
  };

  const getRPEStyle = (rpe?: number) => {
    if (!rpe && rpe !== 0) return 'text-slate-500 border-slate-700';
    if (rpe >= 9) return 'text-rose-400 border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.1)]';
    if (rpe >= 7) return 'text-amber-400 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.1)]';
    return 'text-emerald-400 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.1)]';
  };

  const formatDateString = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  if (isSelectingRepeat) {
    return (
      <div className="fixed inset-0 bg-slate-900 z-[110] flex flex-col p-6 overflow-hidden">
        <header className="flex justify-between items-center mb-10 max-w-md mx-auto w-full relative">
          <button onClick={() => setIsSelectingRepeat(false)} className="p-2 -ml-2 text-slate-500 hover:text-white z-10"><ArrowLeft size={24} /></button>
          <h1 className="absolute inset-0 flex items-center justify-center text-xl font-black text-white uppercase tracking-tighter">REPEAT SESSION</h1>
        </header>
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 max-w-md mx-auto w-full pb-10">
          {previousWorkouts.length === 0 ? (
            <div className="text-center py-20 opacity-30 uppercase font-black text-xs tracking-widest">No history</div>
          ) : (
            previousWorkouts.map(pw => (
              <button key={pw.id} onClick={() => {
                const source = (pw as any).payload?.exercises ?? pw.exercises ?? [];
                const cloned = source.map((ex: Exercise, idx: number) => ({ 
                  ...ex, 
                  id: crypto.randomUUID(), 
                  createdAt: Date.now() + idx, 
                  sets: ex.sets.map((s: any) => ({ ...s, id: crypto.randomUUID(), completed: false })) 
                }));
                
                if (pw.type === 'strength') setStrengthExercises(cloned);
                else if (pw.type === 'cardio') setCardioExercises(cloned);
                
                setWorkoutType(pw.type);
                setTitle(pw.title);
                setIsSelectingRepeat(false);
              }} className="w-full bg-slate-800/40 border border-slate-700/40 p-6 rounded-[2rem] flex justify-between items-center active:scale-95 transition-all text-left">
                <div>
                  <p className="text-sm font-black text-white uppercase">{pw.title}</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase mt-1 tracking-widest">{formatDateString(pw.date)}</p>
                </div>
                <ChevronRight size={20} className="text-slate-700" />
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  if (!workoutType) {
    return (
      <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col p-8 overflow-hidden">
        <header className="flex items-center justify-between mb-12 max-w-md mx-auto w-full relative">
          <button onClick={onCancel} className="p-2 -ml-2 text-slate-500 hover:text-white transition-colors z-10"><X size={28} /></button>
          <h1 className="absolute inset-0 flex items-center justify-center text-xl font-black text-white uppercase tracking-tighter">CHOOSE SESSION</h1>
        </header>
        <div className="flex-1 flex flex-col justify-center gap-6 max-w-md mx-auto w-full">
          <TypeCard onClick={() => selectType('strength')} icon={<Dumbbell size={32} className="text-emerald-400" />} title="STRENGTH" sub="WEIGHTS & REPS" borderColor="border-emerald-500/20" />
          <TypeCard onClick={() => selectType('cardio')} icon={<Heart size={32} className="text-cyan-400" />} title="CARDIO" sub="DISTANCE & TIME" borderColor="border-cyan-500/20" />
          <TypeCard onClick={() => setIsSelectingRepeat(true)} icon={<Copy size={32} className="text-indigo-400" />} title="REPEAT SESSION" sub="USE HISTORY" borderColor="border-indigo-500/20" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col overflow-hidden font-sans">
      <div className="p-6 bg-slate-900 shrink-0 relative">
        <div className="max-w-md mx-auto w-full flex justify-between items-center h-12">
          <button onClick={() => setWorkoutType(null)} className="p-2 -ml-2 text-slate-500 hover:text-white z-10">
            <ArrowLeft size={28} />
          </button>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <h1 className="text-[15px] font-black text-white uppercase tracking-tight leading-none">{title}</h1>
            <div className="flex items-center gap-1.5 mt-1 text-slate-500 pointer-events-auto">
              <button 
                onClick={() => setIsDatePickerOpen(true)} 
                className="flex items-center gap-1 hover:text-emerald-400 transition-colors active:scale-95"
              >
                <Calendar size={12} className="text-emerald-400" />
                <span className="text-[9px] font-black tracking-widest">{formatDateString(workoutDate)}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 z-10">
            <button 
              onClick={handleSaveAsTemplate}
              className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-yellow-500 active:scale-95 transition-all shadow-sm"
            >
              <Star size={16} fill="currentColor" />
            </button>
            <button 
              onClick={handleSave} 
              disabled={isSaving || activeExercises.filter(ex => ex.name.trim() !== '').length === 0} 
              className="bg-emerald-500 text-slate-900 h-8 px-5 rounded-xl font-black text-[9px] tracking-widest shadow-lg active:scale-95 disabled:opacity-30 transition-all"
            >
              {isSaving ? <Loader2 size={12} className="animate-spin" /> : 'SAVE'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="max-w-md mx-auto w-full p-4 space-y-6 pb-40">
          <div className="relative z-[50]">
            <div className={`flex items-center gap-3 bg-slate-800/20 border ${isSearchFocused ? 'border-emerald-500/50' : 'border-slate-800'} rounded-2xl px-5 py-3.5 shadow-lg transition-colors`}>
              <Search className={`w-5 h-5 ${isSearchFocused ? 'text-emerald-400' : 'text-slate-500'}`} />
              <input 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                onFocus={() => setIsSearchFocused(true)} 
                onKeyDown={(e) => { if(e.key === 'Enter') addExerciseFromHistory(); }}
                placeholder="NAME, CATEGORY OR TAG..." 
                className="bg-transparent text-slate-300 font-bold focus:outline-none flex-1 uppercase text-sm placeholder:text-slate-600" 
              />
            </div>
            
            {isSearchFocused && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                {filteredSuggestions(searchTerm).map((item, i) => (
                  <button key={i} onClick={() => addExerciseFromHistory(item)} className="w-full text-left px-5 py-4 hover:bg-slate-700 text-sm font-black text-slate-200 uppercase flex items-center justify-between border-b border-slate-700 last:border-0">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-slate-500" />
                      <div>
                        <p>{item.name}</p>
                        <p className="text-[8px] text-slate-500 tracking-widest">{item.category}</p>
                      </div>
                    </div>
                    <Plus size={16} className="text-emerald-500" />
                  </button>
                ))}
              </div>
            )}
            {isSearchFocused && <div className="fixed inset-0 z-[-1]" onClick={() => setIsSearchFocused(false)}></div>}
          </div>

          {activeExercises.map((ex) => (
            <div key={ex.id} className="bg-slate-800/30 rounded-[2rem] border border-slate-700/50 overflow-hidden shadow-lg transition-all">
              <div className="p-6 border-b border-slate-700/30 flex justify-between items-center bg-slate-800/10">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 rounded-full border border-slate-700 flex items-center justify-center text-[10px] font-black text-slate-500">{getDisplayNumber(ex)}</div>
                  {ex.isNaming ? (
                    <NamingInput 
                      value={ex.name}
                      onUpdate={(name) => setActiveExercises(prev => prev.map(e => e.id === ex.id ? {...e, name} : e))}
                      onConfirm={(name, cat) => confirmExerciseName(ex.id, name, cat)} 
                      onCancel={() => setActiveExercises(prev => prev.filter(e => e.id !== ex.id))}
                      historyItems={historyItems}
                    />
                  ) : (
                    <p className="font-black uppercase tracking-tight text-emerald-400 text-base">{ex.name}</p>
                  )}
                </div>
                <button onClick={() => setActiveExercises(prev => prev.filter(e => e.id !== ex.id))} className="text-slate-700 hover:text-rose-500 transition-colors p-1"><Trash2 size={20} /></button>
              </div>
              
              <div className="p-6 space-y-6">
                {workoutType === 'strength' && (
                   <div className="flex justify-center">
                    <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-700/50">
                      {(['reps', 'sec', 'min'] as const).map((m) => (
                        <button 
                          key={m}
                          onClick={() => {
                            setStrengthExercises(prev => prev.map(e => e.id === ex.id ? {
                              ...e, sets: e.sets.map(s => ({ ...s, metricType: m }))
                            } : e));
                          }}
                          className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${ex.sets[0]?.metricType === m ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-600'}`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-12 gap-2 text-[8px] font-black text-slate-600 uppercase tracking-widest text-center">
                  <div className="col-span-1">#</div>
                  {workoutType === 'strength' ? (
                    <>
                      <div className="col-span-3">KG</div>
                      <div className="col-span-3">{(ex.sets[0]?.metricType || 'REPS').toUpperCase()}</div>
                      <div className="col-span-2">RPE</div>
                    </>
                  ) : (
                    <>
                      <div className="col-span-3">KM</div>
                      <div className="col-span-3">MIN</div>
                      <div className="col-span-2">PACE</div>
                    </>
                  )}
                  <div className="col-span-3">ACTIONS</div>
                </div>

                <div className="space-y-3">
                  {ex.sets.map((set, sIdx) => (
                    <div key={set.id} className="grid grid-cols-12 items-center gap-2 transition-opacity">
                      <div className="col-span-1 font-black text-slate-600 text-[10px] text-center">{sIdx + 1}</div>
                      
                      {workoutType === 'strength' ? (
                        <>
                          <div className="col-span-3">
                            <input type="number" value={set.weight || ''} placeholder="0" onChange={(e) => updateSet(ex.id, set.id, 'weight', parseFloat(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 text-center text-xs font-black text-white focus:border-emerald-500/50 focus:outline-none" />
                          </div>
                          <div className="col-span-3">
                            <input type="number" value={set.metricValue || ''} placeholder="0" onChange={(e) => updateSet(ex.id, set.id, 'metricValue', parseFloat(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 text-center text-xs font-black text-white focus:border-emerald-500/50 focus:outline-none" />
                          </div>
                          <div className="col-span-2">
                             <input 
                              type="number" 
                              value={set.rpe || ''} 
                              placeholder="7" 
                              max="10" 
                              onChange={(e) => updateSet(ex.id, set.id, 'rpe', Math.min(10, parseFloat(e.target.value)))} 
                              className={`w-full bg-slate-900 border rounded-xl py-2.5 text-center text-[11px] font-black transition-all focus:outline-none focus:ring-1 focus:ring-current ${getRPEStyle(set.rpe)}`} 
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="col-span-3">
                            <input type="number" value={set.distance || ''} placeholder="0" onChange={(e) => updateSet(ex.id, set.id, 'distance', parseFloat(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 text-center text-xs font-black text-white focus:border-cyan-500/50 focus:outline-none" />
                          </div>
                          <div className="col-span-3">
                            <input type="number" value={set.time || ''} placeholder="0" onChange={(e) => updateSet(ex.id, set.id, 'time', parseFloat(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 text-center text-xs font-black text-white focus:border-cyan-500/50 focus:outline-none" />
                          </div>
                          <div className="col-span-2 text-center">
                            <div className="text-[10px] font-black text-cyan-400 leading-none">{set.pace || '-:--'}</div>
                          </div>
                        </>
                      )}

                      <div className="col-span-3 flex justify-end">
                        <button onClick={() => setActiveExercises(prev => prev.map(e => e.id === ex.id ? { ...e, sets: e.sets.filter(s => s.id !== set.id) } : e))} className="p-2 text-slate-500 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={() => addSet(ex.id)} className="w-full py-4 bg-slate-900/40 border border-dashed border-slate-700/50 rounded-2xl text-[10px] font-black uppercase text-slate-500 flex items-center justify-center gap-2 active:scale-95 transition-all"><Plus size={16} /> NEW SET</button>
              </div>
            </div>
          ))}

          <div className="pt-4 flex flex-col items-center gap-6">
            <button 
              onClick={addNewEmptyExercise}
              className="w-full max-w-sm bg-slate-800/20 border-2 border-dashed border-slate-700/40 rounded-[2.5rem] py-10 flex flex-col items-center justify-center gap-4 transition-all active:scale-[0.98] hover:bg-slate-800/30 group"
            >
              <div className="w-14 h-14 rounded-full border-2 border-slate-700 flex items-center justify-center text-slate-500 group-hover:text-emerald-400 group-hover:border-emerald-500/50 transition-colors">
                <Plus size={28} />
              </div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">ADD EXERCISE</span>
            </button>
          </div>
        </div>
      </div>

      {isDatePickerOpen && (
        <DatePickerModal 
          selectedDate={workoutDate}
          onSelect={(date) => { setWorkoutDate(date); setIsDatePickerOpen(false); }}
          onClose={() => setIsDatePickerOpen(false)}
        />
      )}
    </div>
  );
};

const DatePickerModal: React.FC<{
  selectedDate: string;
  onSelect: (date: string) => void;
  onClose: () => void;
}> = ({ selectedDate, onSelect, onClose }) => {
  const [viewDate, setViewDate] = useState(new Date(selectedDate));
  
  const daysInMonth = useMemo(() => {
    const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const end = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    const days = [];
    for (let i = 0; i < start.getDay(); i++) days.push(null);
    for (let i = 1; i <= end.getDate(); i++) days.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), i));
    return days;
  }, [viewDate]);

  const monthName = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-xs p-6 shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col">
        <header className="flex justify-between items-center mb-6 px-2">
          <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-2 text-slate-500 hover:text-emerald-400"><ChevronLeft size={20}/></button>
          <span className="text-xs font-black text-white uppercase tracking-widest">{monthName}</span>
          <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-2 text-slate-500 hover:text-emerald-400"><ChevronRight size={20}/></button>
        </header>

        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
            <div key={d} className="text-[9px] font-black text-slate-600 uppercase">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {daysInMonth.map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} />;
            const isSelected = date.toISOString().split('T')[0] === selectedDate;
            return (
              <button 
                key={idx}
                onClick={() => onSelect(date.toISOString().split('T')[0])}
                className={`aspect-square flex items-center justify-center text-[10px] font-black rounded-xl transition-all ${
                  isSelected ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>

        <button 
          onClick={onClose}
          className="mt-6 w-full py-3 bg-slate-800 border border-slate-700 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest active:scale-95 transition-all"
        >
          Cancel
        </button>
      </div>
      <div className="absolute inset-0 z-[-1]" onClick={onClose}></div>
    </div>
  );
};

const NamingInput: React.FC<{ 
  value: string;
  onUpdate: (name: string) => void;
  onConfirm: (name: string, cat?: string) => void; 
  onCancel: () => void;
  historyItems: { name: string; category: string }[];
}> = ({ value, onUpdate, onConfirm, onCancel, historyItems }) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const suggestions = useMemo(() => {
    if (!value.trim()) return historyItems.slice(0, 3);
    return historyItems.filter(h => h.name.toLowerCase().includes(value.toLowerCase())).slice(0, 3);
  }, [value, historyItems]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onConfirm(value);
    if (e.key === 'Escape') onCancel();
  };

  const handleBlur = () => {
    setTimeout(() => setIsFocused(false), 200);
  };

  return (
    <div className="flex-1 relative">
      <input 
        ref={inputRef}
        value={value}
        onChange={(e) => onUpdate(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="EXERCISE NAME..."
        className="w-full bg-slate-900/40 border border-slate-700/50 rounded-xl px-4 py-2 font-black text-white uppercase text-base placeholder:text-slate-700 focus:outline-none focus:ring-0 focus:border-emerald-500/30 transition-all"
      />
      {isFocused && (value || suggestions.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-3 z-[60] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1">
          {suggestions.map((item, i) => (
            <button 
              key={i} 
              onMouseDown={(e) => { e.preventDefault(); onConfirm(item.name, item.category); }}
              className="w-full text-left px-4 py-3 hover:bg-slate-800 flex justify-between items-center group transition-colors border-b border-slate-800 last:border-0"
            >
              <div>
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-tight">{item.name}</p>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{item.category}</p>
              </div>
              <Clock size={14} className="text-slate-700 group-hover:text-emerald-500" />
            </button>
          ))}
          {value.trim() && !suggestions.some(s => s.name.toLowerCase() === value.toLowerCase()) && (
            <button 
              onMouseDown={(e) => { e.preventDefault(); onConfirm(value); }}
              className="w-full text-left px-4 py-4 bg-emerald-500/5 hover:bg-emerald-500/10 text-[9px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2"
            >
              <Plus size={14} /> CREATE "{value}"
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const TypeCard = ({ onClick, icon, title, sub, borderColor }: any) => (
  <button onClick={onClick} className={`w-full bg-slate-800/40 border border-slate-700/60 p-10 rounded-[2.5rem] flex flex-col items-center gap-6 transition-all active:scale-0.97 hover:bg-slate-800/60 text-center shadow-lg group`}>
    <div className={`w-16 h-16 rounded-2xl bg-slate-900 border ${borderColor || 'border-slate-700/50'} flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform`}>{icon}</div>
    <div className="flex flex-col items-center">
      <h3 className="text-xl font-black text-white uppercase tracking-tight leading-none mb-2">{title}</h3>
      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">{sub}</p>
    </div>
  </button>
);

export default WorkoutLogger;
