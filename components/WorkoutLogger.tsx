
import React, { useState, useRef, useMemo } from 'react';
import { Workout, Exercise, Set as WorkoutSet, WorkoutType, MUSCLE_GROUPS, WorkoutTemplate, WorkoutQuality } from '../types';
import { X, Plus, Trash2, CheckCircle, PlusCircle, Dumbbell, Calendar, Sparkles, Search, History as HistoryIcon, Heart, ArrowLeft, Tag, Copy, ChevronRight, Layers, Save, Star, MoreHorizontal, RotateCcw, Edit2, AlertCircle, Circle, CircleDot, CircleDashed, ChevronDown, Loader2 } from 'lucide-react';

interface WorkoutLoggerProps {
  onSave: (workout: Omit<Workout, 'userId' | 'user_id' | 'profile_id'>) => void;
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
  onDeleteTemplate,
  onUpdateTemplate,
  onCancel, 
  previousWorkouts, 
  templates,
  availableCategories,
  onAddCategory,
  onToast,
  isSaving = false
}) => {
  const [workoutType, setWorkoutType] = useState<WorkoutType | null>(null);
  const [quality, setQuality] = useState<WorkoutQuality>('normal');
  const [isSelectingRepeat, setIsSelectingRepeat] = useState(false);
  const [title, setTitle] = useState('');
  const [workoutDate, setWorkoutDate] = useState(new Date().toISOString().split('T')[0]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [editingCategoryFor, setEditingCategoryFor] = useState<string | null>(null);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  
  const [isQualityOpen, setIsQualityOpen] = useState(false);
  const [activeAutocompleteExId, setActiveAutocompleteExId] = useState<string | null>(null);
  const [isEditingTemplateMode, setIsEditingTemplateMode] = useState(false);
  const [targetTemplateId, setTargetTemplateId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [editingTemplateNameOnly, setEditingTemplateNameOnly] = useState<WorkoutTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<WorkoutTemplate | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');

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
    const query = searchTerm.trim().toLowerCase();
    if (query.length < 2) return []; 
    return historyItems.filter(item => 
      item.name.toLowerCase().includes(query) || 
      item.category.toLowerCase().includes(query) ||
      item.tags.some(tag => tag.toLowerCase().includes(query))
    ).slice(0, 8);
  }, [searchTerm, historyItems]);

  const selectType = (type: WorkoutType) => {
    setWorkoutType(type);
    setQuality('normal');
    setIsSelectingRepeat(false);
    setIsEditingTemplateMode(false);
    const defaultTitle = type === 'strength' ? 'Strength Session' : type === 'cardio' ? 'Cardio Session' : 'Mobility Session';
    setTitle(defaultTitle);
  };

  const handleRepeatSelection = (pastWorkout: Workout | WorkoutTemplate, isTemplate: boolean = false) => {
    const clonedExercises: Exercise[] = pastWorkout.exercises.map(ex => ({
      ...ex,
      id: Date.now().toString() + Math.random(),
      sets: ex.sets.map(s => ({
        ...s,
        id: Math.random().toString(),
        completed: false
      }))
    }));

    setWorkoutType(pastWorkout.type);
    if (!isTemplate && (pastWorkout as Workout).quality) {
      setQuality((pastWorkout as Workout).quality || 'normal');
    } else {
      setQuality('normal');
    }
    setTitle(pastWorkout.title);
    setExercises(clonedExercises);
    setWorkoutDate(new Date().toISOString().split('T')[0]);
    setIsSelectingRepeat(false);
    setIsTemplatePickerOpen(false);
    setIsEditingTemplateMode(false);
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

  const handleApplyAutocomplete = (exId: string, suggestion: { name: string; category: string; tags: string[] }) => {
    setExercises(prev => prev.map(ex => ex.id === exId ? { 
      ...ex, 
      name: suggestion.name, 
      category: suggestion.category || ex.category,
      tags: suggestion.tags.length > 0 ? suggestion.tags : ex.tags
    } : ex));
    setActiveAutocompleteExId(null);
  };

  const updateExerciseCategory = (exId: string, category: string) => {
    setExercises(prev => prev.map(ex => ex.id === exId ? { ...ex, category } : ex));
    setEditingCategoryFor(null);
  };

  const updateExerciseMetricType = (exId: string, type: 'reps' | 'sec' | 'min') => {
    setExercises(exercises.map(ex => ex.id === exId ? {
      ...ex,
      sets: ex.sets.map(s => ({
        ...s,
        metricType: type,
        reps: type === 'reps' ? s.metricValue : undefined,
        time: type !== 'reps' ? s.metricValue : undefined
      }))
    } : ex));
  };

  const addSet = (exId: string) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id === exId) {
        const sets = [...ex.sets];
        if (sets.length > 0) {
          const lastIdx = sets.length - 1;
          const lastSet = sets[lastIdx];
          if ((lastSet.weight || 0) > 0 || (lastSet.metricValue || 0) > 0) {
            sets[lastIdx] = { ...lastSet, completed: true };
          }
        }
        const lastSetTemplate = sets[sets.length - 1];
        return {
          ...ex,
          sets: [...sets, { 
            ...lastSetTemplate, 
            id: Math.random().toString(), 
            completed: false,
            metricType: lastSetTemplate?.metricType || 'reps'
          }]
        };
      }
      return ex;
    }));
  };

  const removeSet = (exId: string, setId: string) => {
    setExercises(prev => prev.map(ex => ex.id === exId ? { ...ex, sets: ex.sets.filter(s => s.id !== setId) } : ex));
  };

  const updateSet = (exId: string, setId: string, field: keyof WorkoutSet, value: any) => {
    setExercises(exercises.map(ex => ex.id === exId ? {
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
          return updatedSet;
        }
        return s;
      })
    } : ex));
  };

  const handleSave = () => {
    if (exercises.length === 0 || isSaving) return;
    if (!workoutType) return;

    if (isEditingTemplateMode && targetTemplateId && onUpdateTemplate) {
      onUpdateTemplate(targetTemplateId, {
        title,
        exercises: exercises.map(ex => ({ ...ex, sets: ex.sets.map(s => ({ ...s, completed: false })) }))
      });
      setIsEditingTemplateMode(false);
      return;
    }

    onSave({
      id: Date.now().toString(),
      date: new Date(workoutDate).toISOString(),
      title,
      type: workoutType,
      quality,
      exercises: exercises.filter(ex => ex.name.trim() !== '')
    });
  };

  const getQualityIcon = (q: WorkoutQuality) => {
    switch(q) {
      case 'light': return <CircleDot size={18} className="text-slate-400" />;
      case 'incomplete': return <Circle size={18} className="text-slate-400" />;
      default: return <Circle size={18} className="text-slate-400 fill-slate-400/20" />;
    }
  };

  if (isSelectingRepeat) {
    return (
      <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col p-6 overflow-hidden">
        <header className="flex justify-between items-center mb-6 max-w-md mx-auto w-full">
          <button onClick={() => setIsSelectingRepeat(false)} className="p-2 -ml-2 text-slate-500 hover:text-white"><ArrowLeft size={24} /></button>
          <h1 className="text-xl font-black text-white uppercase tracking-tighter">Repeat Workout</h1>
          <div className="w-10"></div>
        </header>
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 max-w-md mx-auto w-full pb-10">
          {previousWorkouts.length === 0 ? (
            <div className="text-center py-20 opacity-30 uppercase font-black text-xs tracking-widest">No previous workouts</div>
          ) : (
            previousWorkouts.map(pw => (
              <button key={pw.id} onClick={() => handleRepeatSelection(pw, false)} className="w-full bg-slate-800/40 border border-slate-700/60 p-5 rounded-3xl flex flex-col gap-3 text-left active:scale-[0.98] transition-transform group">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase truncate max-w-[200px]">{pw.title}</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-widest">{new Date(pw.date).toLocaleDateString()}</p>
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
          <TypeCard onClick={() => selectType('strength')} icon={<Dumbbell size={32} className="text-emerald-400" />} title="Strength" sub="WEIGHTS & REPS" color="hover:border-emerald-500/50" />
          <TypeCard onClick={() => selectType('cardio')} icon={<Heart size={32} className="text-cyan-400" />} title="Cardio" sub="DISTANCE & TIME" color="hover:border-cyan-500/50" />
          <TypeCard onClick={() => setIsSelectingRepeat(true)} icon={<Copy size={32} className="text-indigo-400" />} title="Repeat Workout" sub="USE HISTORY" color="hover:border-indigo-500/50" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col overflow-hidden font-sans">
      <div className="p-6 bg-slate-900 border-b border-slate-800/50 shrink-0">
        <div className="max-w-md mx-auto w-full flex justify-between items-center gap-2">
          <button onClick={() => setWorkoutType(null)} disabled={isSaving} className="p-2 -ml-2 text-slate-500 hover:text-white shrink-0"><ArrowLeft size={24} /></button>
          <div className="flex-1 flex flex-col items-center min-w-0">
            <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={isSaving} className="bg-transparent text-lg font-black text-center focus:outline-none uppercase w-full truncate text-slate-100" />
            <div className="flex items-center gap-2 mt-1 shrink-0">
              <Calendar size={10} className="text-emerald-500" />
              <input type="date" value={workoutDate} onChange={(e) => setWorkoutDate(e.target.value)} disabled={isSaving} className="bg-transparent text-[10px] font-black text-slate-500 uppercase tracking-widest" />
            </div>
          </div>
          <button 
            onClick={handleSave} 
            disabled={isSaving || exercises.length === 0}
            className={`${isEditingTemplateMode ? 'bg-indigo-500' : 'bg-emerald-500'} text-slate-900 h-9 px-4 rounded-xl font-black text-[10px] tracking-widest shadow-lg active:scale-95 transition-transform flex items-center gap-2 disabled:opacity-50 disabled:grayscale`}
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : (isEditingTemplateMode ? 'SAVE' : 'SAVE')}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="max-w-md mx-auto w-full p-4 space-y-6 pb-40">
          <div className="relative px-1">
            <div className={`flex items-center gap-3 bg-slate-800/40 border ${isSearchFocused ? 'border-emerald-500/50' : 'border-slate-700/60'} rounded-2xl px-4 py-3 shadow-lg transition-colors`}>
              <Search className={`w-5 h-5 ${isSearchFocused ? 'text-emerald-400' : 'text-slate-500'}`} />
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onFocus={() => setIsSearchFocused(true)} disabled={isSaving} placeholder={`ADD EXERCISE...`} className="bg-transparent text-slate-100 font-bold focus:outline-none flex-1 uppercase text-sm" />
            </div>
            {isSearchFocused && filteredSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-[30]">
                {filteredSuggestions.map((item, i) => (
                  <button key={i} onClick={() => addExercise(item)} className="w-full text-left px-4 py-3 hover:bg-slate-700 text-sm font-black text-slate-200 uppercase flex items-center justify-between border-b border-slate-700/50 last:border-0">
                    <span>{item.name}</span>
                    <Plus size={14} className="text-emerald-500" />
                  </button>
                ))}
              </div>
            )}
            {isSearchFocused && <div className="fixed inset-0 z-10" onClick={() => setIsSearchFocused(false)}></div>}
          </div>

          {exercises.map((ex, exIdx) => (
            <div key={ex.id} className="bg-slate-800/40 rounded-[2rem] border border-slate-700/60 overflow-hidden shadow-lg">
              <div className="p-5 border-b border-slate-700/50 bg-slate-800/20">
                <div className="flex items-center justify-between gap-4">
                  <input placeholder="EXERCISE NAME" value={ex.name} onChange={(e) => updateExerciseName(ex.id, e.target.value)} disabled={isSaving} className="bg-transparent font-black focus:outline-none flex-1 uppercase tracking-tight text-emerald-400" />
                  <button onClick={() => removeExercise(ex.id)} disabled={isSaving} className="text-slate-700 hover:text-red-400"><Trash2 size={18} /></button>
                </div>
              </div>
              <div className="p-5 space-y-3">
                {ex.sets.map((set, sIdx) => (
                  <div key={set.id} className={`grid grid-cols-12 items-center gap-2 px-2 py-2 rounded-2xl transition-all ${set.completed ? 'bg-emerald-500/10 opacity-70' : 'hover:bg-slate-700/20'}`}>
                    <div className="col-span-1 font-black text-slate-600 text-[10px]">{sIdx + 1}</div>
                    <LogInput value={set.weight} onChange={(v: any) => updateSet(ex.id, set.id, 'weight', v)} disabled={set.completed || isSaving} col="col-span-3" />
                    <LogInput value={set.metricValue || set.reps} onChange={(v: any) => updateSet(ex.id, set.id, 'metricValue', v)} disabled={set.completed || isSaving} col="col-span-3" />
                    <div className="col-span-5 flex justify-end gap-1">
                      <button onClick={() => removeSet(ex.id, set.id)} disabled={isSaving} className="p-2 text-slate-700 hover:text-red-400"><Trash2 size={16} /></button>
                      <button onClick={() => updateSet(ex.id, set.id, 'completed', !set.completed)} disabled={isSaving} className={`p-2 rounded-xl ${set.completed ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-700'}`}><CheckCircle size={20} /></button>
                    </div>
                  </div>
                ))}
                <button onClick={() => addSet(ex.id)} disabled={isSaving} className="w-full mt-2 py-3 bg-slate-900/30 border border-dashed border-slate-700 rounded-2xl text-[10px] font-black uppercase text-slate-500 flex items-center justify-center gap-2 transition-all"><Plus size={14} /> New Set</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const TypeCard = ({ onClick, icon, title, sub, color }: any) => (
  <button onClick={onClick} className={`group w-full bg-slate-800/40 border-2 border-slate-700/60 p-8 rounded-[2.5rem] flex flex-col items-center gap-4 transition-all active:scale-[0.98] ${color}`}>
    <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center shadow-lg">{icon}</div>
    <div className="text-center">
      <h3 className="text-lg font-black text-white uppercase tracking-tight">{title}</h3>
      <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-widest">{sub}</p>
    </div>
  </button>
);

const LogInput = ({ value, onChange, disabled, col }: any) => (
  <div className={`${col} flex justify-center`}>
    <input 
      type="number" 
      value={value === 0 ? '' : value || ''} 
      onChange={(e) => onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))} 
      disabled={disabled} 
      className="w-full max-w-[70px] bg-slate-900/50 border border-slate-700 text-center rounded-xl py-2 font-black text-sm text-slate-200 focus:outline-none focus:border-emerald-500/30" 
      placeholder="0" 
    />
  </div>
);

export default WorkoutLogger;
