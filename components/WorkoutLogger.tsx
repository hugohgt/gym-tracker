
import React, { useState, useRef, useMemo } from 'react';
import { Workout, Exercise, Set as WorkoutSet, WorkoutType, MUSCLE_GROUPS, WorkoutTemplate, WorkoutQuality } from '../types';
import { X, Plus, Trash2, CheckCircle, PlusCircle, Dumbbell, Calendar, Sparkles, Search, History as HistoryIcon, Heart, ArrowLeft, Tag, Copy, ChevronRight, Layers, Save, Star, MoreHorizontal, RotateCcw, Edit2, AlertCircle, Circle, CircleDot, CircleDashed, ChevronDown } from 'lucide-react';

interface WorkoutLoggerProps {
  // Use Omit to specify that user_id and profile_id are handled by the parent
  onSave: (workout: Omit<Workout, 'userId' | 'user_id' | 'profile_id'>) => void;
  // Use Omit to specify that user_id is handled by the parent
  onSaveTemplate: (template: Omit<WorkoutTemplate, 'user_id'>) => void;
  onDeleteTemplate?: (id: string) => void;
  onUpdateTemplate?: (id: string, updates: Partial<WorkoutTemplate>) => void;
  onCancel: () => void;
  previousWorkouts: Workout[];
  templates: WorkoutTemplate[];
  availableCategories: string[];
  onAddCategory: (cat: string) => void;
  onToast?: (t: { message: string, type: 'success' | 'error' } | null) => void;
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
  onToast
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
  
  // Popover state
  const [isQualityOpen, setIsQualityOpen] = useState(false);

  // Autocomplete state for internal inputs
  const [activeAutocompleteExId, setActiveAutocompleteExId] = useState<string | null>(null);

  // Template Mode State
  const [isEditingTemplateMode, setIsEditingTemplateMode] = useState(false);
  const [targetTemplateId, setTargetTemplateId] = useState<string | null>(null);

  // Modal States
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);

  // Template Management States
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

  const getInternalSuggestions = (nameQuery: string) => {
    const query = nameQuery.trim().toLowerCase();
    if (query.length < 2) return [];
    return historyItems.filter(item => 
      item.name.toLowerCase().includes(query)
    ).slice(0, 5);
  };

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
    
    if (onToast) {
      onToast({ 
        message: isTemplate ? "Template loaded" : "Workout data loaded", 
        type: 'success' 
      });
    }
  };

  const startEditFullTemplate = (template: WorkoutTemplate) => {
    const clonedExercises: Exercise[] = template.exercises.map(ex => ({
      ...ex,
      id: Math.random().toString(36).substr(2, 9),
      sets: ex.sets.map(s => ({
        ...s,
        id: Math.random().toString(36).substr(2, 9),
        completed: false
      }))
    }));

    setWorkoutType(template.type);
    setTitle(template.title);
    setExercises(clonedExercises);
    setTargetTemplateId(template.id);
    setIsEditingTemplateMode(true);
    
    setIsSelectingRepeat(false);
    setIsTemplatePickerOpen(false);
    setEditingTemplateNameOnly(null);
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
    setExercises(prev => prev.map(ex => {
      if (ex.id === id) {
        return { ...ex, name };
      }
      return ex;
    }));
  };

  const handleApplyAutocomplete = (exId: string, suggestion: { name: string; category: string; tags: string[] }) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id === exId) {
        return { 
          ...ex, 
          name: suggestion.name, 
          category: suggestion.category || ex.category,
          tags: suggestion.tags.length > 0 ? suggestion.tags : ex.tags
        };
      }
      return ex;
    }));
    setActiveAutocompleteExId(null);
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
        const sets = [...ex.sets];
        if (sets.length > 0) {
          const lastIdx = sets.length - 1;
          const lastSet = sets[lastIdx];
          const isMeaningful = (lastSet.weight || 0) > 0 || (lastSet.metricValue || 0) > 0 || (lastSet.reps || 0) > 0 || (lastSet.time || 0) > 0 || (lastSet.distance || 0) > 0 || (lastSet.holdTime || 0) > 0 || (lastSet.rpe || 0) > 0;
          if (isMeaningful) {
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
                  const key_sec = Math.round((paceVal - min) * 60);
                  updatedSet.pace = `${min}:${key_sec.toString().padStart(2, '0')}`;
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

    if (isEditingTemplateMode && targetTemplateId && onUpdateTemplate) {
      onUpdateTemplate(targetTemplateId, {
        title: title,
        exercises: exercises.map(ex => ({
          ...ex,
          sets: ex.sets.map(s => ({ ...s, completed: false }))
        }))
      });
      setIsEditingTemplateMode(false);
      setTargetTemplateId(null);
      setWorkoutType(null);
      setExercises([]);
      return;
    }

    // Call onSave without user_id and profile_id as they are handled by the parent
    onSave({
      id: Date.now().toString(),
      date: new Date(workoutDate).toISOString(),
      title,
      type: workoutType,
      quality,
      exercises: exercises.filter(ex => ex.name.trim() !== '')
    });
  };

  const openTemplateModal = () => {
    if (exercises.length === 0) return alert("Add exercises before saving a template");
    setTemplateName(title);
    setIsTemplateModalOpen(true);
    setIsMenuOpen(false);
  };

  const handleSaveAsTemplate = () => {
    if (!templateName.trim()) return alert("Enter a template name");
    if (!workoutType) return;

    // Call onSaveTemplate without user_id as it is handled by the parent
    onSaveTemplate({
      id: Date.now().toString(),
      title: templateName,
      type: workoutType,
      exercises: exercises.map(ex => ({
        ...ex,
        id: Math.random().toString(36).substr(2, 9),
        sets: ex.sets.map(s => ({
          ...s,
          id: Math.random().toString(36).substr(2, 9),
          completed: false 
        }))
      }))
    });
    setIsTemplateModalOpen(false);
  };

  const handleAddNewCategory = (exId: string) => {
    if (!newCategoryInput.trim()) return;
    onAddCategory(newCategoryInput.trim());
    updateExerciseCategory(exId, newCategoryInput.trim());
    setNewCategoryInput('');
  };

  const handleRenameTemplate = () => {
    if (editingTemplateNameOnly && onUpdateTemplate && newTemplateName.trim()) {
      onUpdateTemplate(editingTemplateNameOnly.id, { title: newTemplateName });
      setEditingTemplateNameOnly(null);
      setNewTemplateName('');
    }
  };

  const handleConfirmDeleteTemplate = () => {
    if (deletingTemplate && onDeleteTemplate) {
      onDeleteTemplate(deletingTemplate.id);
      setDeletingTemplate(null);
    }
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

        <div className="max-w-md mx-auto w-full mb-4 px-1 flex justify-between items-center">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Past Sessions</span>
          <button 
            onClick={() => setIsTemplatePickerOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-indigo-500/5"
          >
            <Star size={12} className="fill-current" />
            Use Template
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 max-w-md mx-auto w-full pb-10">
          {previousWorkouts.length === 0 ? (
            <div className="text-center py-20 opacity-30 uppercase font-black text-xs tracking-widest">No previous workouts found</div>
          ) : (
            previousWorkouts.map(pw => (
              <button 
                key={pw.id} 
                onClick={() => handleRepeatSelection(pw, false)}
                className="w-full bg-slate-800/40 border border-slate-700/60 p-5 rounded-3xl flex flex-col gap-3 text-left active:scale-[0.98] transition-transform hover:border-emerald-500/30 group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase truncate max-w-[200px]">{pw.title}</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-widest">
                      {new Date(pw.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      pw.type === 'strength' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 
                      pw.type === 'cardio' ? 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' : 
                      'text-indigo-400 bg-indigo-400/10 border-indigo-400/20'
                    }`}>{pw.type}</span>
                    {pw.quality && pw.quality !== 'normal' && (
                      <span className="text-[7px] font-black uppercase text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700/50">{pw.quality}</span>
                    )}
                  </div>
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

        {isTemplatePickerOpen && (
          <div className="fixed inset-0 z-[120] bg-slate-950/95 backdrop-blur-md flex flex-col p-6 animate-in fade-in duration-200">
            <header className="flex justify-between items-center mb-10 max-w-md mx-auto w-full">
              <div className="w-10"></div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter">Choose Template</h2>
              <button onClick={() => setIsTemplatePickerOpen(false)} className="p-2 -mr-2 text-slate-500 hover:text-white"><X size={24} /></button>
            </header>

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 max-w-md mx-auto w-full pb-10">
              {templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                   <div className="w-16 h-16 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-600 mb-6">
                     <Layers size={32} />
                   </div>
                   <p className="text-sm font-black text-slate-100 uppercase tracking-widest">No templates yet</p>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-2 max-w-[200px]">Save a session as a template from the workout logger to see it here.</p>
                </div>
              ) : (
                templates.map(t => (
                  <button 
                    key={t.id} 
                    onClick={() => handleRepeatSelection(t, true)}
                    className="w-full bg-slate-800/60 border border-slate-700/80 p-6 rounded-[2rem] flex flex-col gap-3 text-left active:scale-[0.98] transition-all hover:border-indigo-500/40 relative group/card"
                  >
                    <div className="flex justify-between items-start pr-12">
                      <div>
                        <h3 className="text-base font-black text-white uppercase truncate">{t.title}</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-widest">
                          {t.exercises.length} Exercises • Template
                        </p>
                      </div>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        t.type === 'strength' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 
                        t.type === 'cardio' ? 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' : 
                        'text-indigo-400 bg-indigo-400/10 border-indigo-400/20'
                      }`}>{t.type}</span>
                    </div>

                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 opacity-70 group-hover/card:opacity-100 md:opacity-0 md:group-hover/card:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); startEditFullTemplate(t); }}
                        className="p-2 rounded-xl bg-slate-900/60 border border-slate-700/50 text-slate-400 hover:text-white hover:border-indigo-500/40 transition-all active:scale-95"
                        title="Edit Template Exercises"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setDeletingTemplate(t); }}
                        className="p-2 rounded-xl bg-slate-900/60 border border-slate-700/50 text-slate-400 hover:text-red-400 hover:border-red-500/40 transition-all active:scale-95"
                        title="Delete Template"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
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
          <TypeCard onClick={() => setIsSelectingRepeat(true)} icon={<Copy size={32} className="text-indigo-400" />} title="Repeat Workout" sub="USE HISTORY OR TEMPLATE" color="hover:border-indigo-500/50 hover:bg-indigo-500/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col overflow-hidden font-sans">
      <div className="p-6 bg-slate-900 border-b border-slate-800/50 shrink-0">
        <div className="max-w-md mx-auto w-full flex justify-between items-center gap-2">
          <button onClick={() => { setWorkoutType(null); setExercises([]); setIsEditingTemplateMode(false); }} className="p-2 -ml-2 text-slate-500 hover:text-white shrink-0"><ArrowLeft size={24} /></button>
          
          <div className="flex-1 flex flex-col items-center min-w-0">
            <input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder={isEditingTemplateMode ? "TEMPLATE NAME" : "WORKOUT TITLE"}
              className={`bg-transparent text-lg font-black text-center focus:outline-none uppercase w-full truncate ${isEditingTemplateMode ? 'text-indigo-400' : 'text-slate-100'}`} 
            />
            {!isEditingTemplateMode && (
              <div className="flex items-center gap-2 mt-1 shrink-0">
                <Calendar size={10} className="text-emerald-500" />
                <input type="date" value={workoutDate} onChange={(e) => setWorkoutDate(e.target.value)} className="bg-transparent text-[10px] font-black text-slate-500 uppercase tracking-widest" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!isEditingTemplateMode && (
              <div className="relative">
                <button 
                  onClick={() => setIsQualityOpen(!isQualityOpen)}
                  className={`w-9 h-9 rounded-xl border border-slate-700/60 bg-slate-800/20 flex items-center justify-center transition-all active:scale-95 ${isQualityOpen ? 'bg-slate-700 border-slate-600' : ''}`}
                  title="Session Quality"
                >
                  {getQualityIcon(quality)}
                </button>
                {isQualityOpen && (
                  <>
                    <div className="fixed inset-0 z-[125]" onClick={() => setIsQualityOpen(false)}></div>
                    <div className="absolute top-full right-0 mt-2 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-[130] w-32 py-1.5 animate-in slide-in-from-top-1 duration-200">
                      {(['normal', 'light', 'incomplete'] as WorkoutQuality[]).map((q) => (
                        <button
                          key={q}
                          onClick={() => { setQuality(q); setIsQualityOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 flex items-center gap-3 text-[10px] font-black uppercase tracking-wider transition-colors ${quality === q ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700/50'}`}
                        >
                          {getQualityIcon(q)}
                          {q}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            
            {!isEditingTemplateMode && (
              <button 
                onClick={() => setIsMenuOpen(true)}
                className="w-9 h-9 rounded-xl border border-slate-700/60 bg-slate-800/20 text-indigo-400 hover:text-indigo-300 flex items-center justify-center transition-all active:scale-95"
              >
                <Star size={18} className="fill-current" />
              </button>
            )}
            
            <button 
              onClick={handleSave} 
              className={`${isEditingTemplateMode ? 'bg-indigo-500' : 'bg-emerald-500'} text-slate-900 h-9 px-3 rounded-xl font-black text-[10px] tracking-widest shadow-lg active:scale-95 transition-transform`}
            >
              {isEditingTemplateMode ? 'SAVE' : 'SAVE'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="max-w-md mx-auto w-full p-4 space-y-6 pb-40">
          <div className="relative px-1">
            <div className={`flex items-center gap-3 bg-slate-800/40 border ${isSearchFocused ? 'border-emerald-500/50' : 'border-slate-700/60'} rounded-2xl px-4 py-3 shadow-lg transition-colors`}>
              <Search className={`w-5 h-5 ${isSearchFocused ? (isEditingTemplateMode ? 'text-indigo-400' : 'text-emerald-400') : 'text-slate-500'}`} />
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onFocus={() => setIsSearchFocused(true)} placeholder={`NAME, CATEGORY OR TAG...`} className="bg-transparent text-slate-100 font-bold focus:outline-none flex-1 uppercase text-sm" />
            </div>
            {isSearchFocused && filteredSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-[30] animate-in slide-in-from-top-2 duration-200">
                <div className="p-2 space-y-1">
                  {filteredSuggestions.map((item, i) => (
                    <button key={i} onClick={() => addExercise(item)} className="w-full text-left px-4 py-3 hover:bg-slate-700 rounded-xl text-sm font-black text-slate-200 uppercase flex items-center justify-between group">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <HistoryIcon size={10} className="text-slate-500" />
                          <span>{item.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                           <span className="text-[8px] text-emerald-500 font-black tracking-widest">USED BEFORE</span>
                           <span className="text-[8px] text-slate-600 font-black tracking-widest">• {item.category}</span>
                        </div>
                      </div>
                      <Plus size={14} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                    </button>
                  ))}
                  {searchTerm.length >= 2 && <button onClick={() => addExercise({name: searchTerm, category: 'General', tags: []})} className="w-full text-left px-4 py-3 bg-emerald-500/10 text-emerald-400 rounded-xl text-sm font-black uppercase flex items-center justify-between">Add "{searchTerm}" <Plus size={14} /></button>}
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
                    <div className="flex-1 flex items-center gap-3 relative">
                      <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center font-black text-xs text-slate-500">{exIdx + 1}</div>
                      <input 
                        placeholder="EXERCISE NAME" 
                        value={ex.name} 
                        onChange={(e) => updateExerciseName(ex.id, e.target.value)} 
                        onFocus={() => setActiveAutocompleteExId(ex.id)}
                        onBlur={() => setTimeout(() => setActiveAutocompleteExId(null), 200)}
                        className={`bg-transparent font-black focus:outline-none flex-1 uppercase tracking-tight ${isEditingTemplateMode ? 'text-indigo-400' : 'text-emerald-400'}`} 
                      />
                      {activeAutocompleteExId === ex.id && getInternalSuggestions(ex.name).length > 0 && (
                        <div className="absolute top-full left-11 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-[40] animate-in slide-in-from-top-1 duration-200">
                          {getInternalSuggestions(ex.name).map((suggestion, sIdx) => (
                            <button 
                              key={sIdx} 
                              onClick={() => handleApplyAutocomplete(ex.id, suggestion)}
                              className="w-full text-left px-4 py-3 hover:bg-slate-800 border-b border-slate-800 last:border-0 flex flex-col"
                            >
                              <div className="flex items-center gap-2">
                                <HistoryIcon size={10} className="text-slate-600" />
                                <span className="text-xs font-black text-slate-200 uppercase">{suggestion.name}</span>
                              </div>
                              <span className="text-[8px] font-black text-slate-500 uppercase mt-0.5 ml-4 tracking-widest">{suggestion.category}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => removeExercise(ex.id)} className="text-slate-700 hover:text-red-400 transition-colors"><Trash2 size={18} /></button>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    <button onClick={() => setEditingCategoryFor(editingCategoryFor === ex.id ? null : ex.id)} className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all ${editingCategoryFor === ex.id ? 'bg-indigo-500 text-white border-indigo-400' : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:border-indigo-500/50'}`}>
                      <Tag size={10} />
                      {ex.category || 'CATEGORY'}
                    </button>
                    {ex.tags?.map((tag, tIdx) => (
                      <span key={tag} className="px-2 py-1 rounded-full bg-slate-700/50 text-slate-500 text-[8px] font-black uppercase">{tag}</span>
                    ))}
                  </div>
                  {editingCategoryFor === ex.id && (
                    <div className="mt-2 bg-slate-900 border border-slate-700 rounded-2xl p-4 animate-in slide-in-from-top-2">
                      <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar pb-2">
                        {availableCategories.map(cat => (
                          <button key={cat} onClick={() => updateExerciseCategory(ex.id, cat)} className={`shrink-0 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase transition-all ${ex.category === cat ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                            {cat}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input value={newCategoryInput} onChange={(e) => setNewCategoryInput(e.target.value)} placeholder="ADD NEW..." className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-[10px] font-black uppercase text-white focus:outline-none focus:border-indigo-500" />
                        <button onClick={() => handleAddNewCategory(ex.id)} className="px-4 py-2 bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase">ADD</button>
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
                        <button key={type} onClick={() => updateExerciseMetricType(ex.id, type as any)} className={`flex-1 py-1.5 text-[9px] font-black rounded-lg transition-all uppercase tracking-wider ${currentType === type ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-400'}`}>
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
                            <LogInput value={set.weight} onChange={(v: any) => updateSet(ex.id, set.id, 'weight', v)} disabled={set.completed} col="col-span-3" placeholder="0" />
                            <LogInput value={set.metricValue || set.reps} onChange={(v: any) => updateSet(ex.id, set.id, 'metricValue', v)} disabled={set.completed} col="col-span-3" placeholder="0" />
                          </>
                        ) : (
                          <LogInput value={set.metricValue || set.time} onChange={(v: any) => updateSet(ex.id, set.id, 'metricValue', v)} disabled={set.completed} col="col-span-6" color="text-cyan-400" placeholder={set.metricType === 'sec' ? "sec" : "min"} />
                        )}
                        <RPEInput value={set.rpe} onChange={(v: any) => updateSet(ex.id, set.id, 'rpe', v)} disabled={set.completed} col="col-span-2" />
                      </>
                    )}
                    {workoutType === 'cardio' && (
                      <>
                        <LogInput value={set.distance} onChange={(v: any) => updateSet(ex.id, set.id, 'distance', v)} disabled={set.completed} col="col-span-3" placeholder="0.0" />
                        <LogInput value={set.time} onChange={(v: any) => updateSet(ex.id, set.id, 'time', v)} disabled={set.completed} col="col-span-3" placeholder="min" />
                        <div className="col-span-2 flex justify-center">
                          <input value={set.pace || ''} onChange={(e) => updateSet(ex.id, set.id, 'pace', e.target.value)} disabled={set.completed} className="w-full bg-slate-900/50 border border-slate-700 text-center rounded-xl py-2 font-black text-[11px] text-cyan-400/80 focus:outline-none transition-colors focus:border-cyan-500/30" placeholder="0:00" />
                        </div>
                      </>
                    )}
                    {workoutType === 'mobility' && (
                      <>
                        <LogInput value={set.metricValue || set.reps} onChange={(v: any) => updateSet(ex.id, set.id, 'metricValue', v)} disabled={set.completed} col="col-span-3" placeholder="0" />
                        <LogInput value={set.holdTime} onChange={(v: any) => updateSet(ex.id, set.id, 'holdTime', v)} disabled={set.completed} col="col-span-3" placeholder="sec" />
                        <RPEInput value={set.rpe} onChange={(v: any) => updateSet(ex.id, set.id, 'rpe', v)} disabled={set.completed} col="col-span-2" />
                      </>
                    )}
                    <div className="col-span-3 flex justify-end items-center gap-1">
                      <button onClick={() => removeSet(ex.id, set.id)} className="p-2 text-slate-700 hover:text-red-400 transition-colors" title="Remove Set"><Trash2 size={16} /></button>
                      <button onClick={() => updateSet(ex.id, set.id, 'completed', !set.completed)} className={`p-2 rounded-xl transition-all ${set.completed ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-700 hover:text-emerald-400'}`}><CheckCircle size={20} /></button>
                    </div>
                  </div>
                ))}
                <button onClick={() => addSet(ex.id)} className="w-full mt-4 py-3 bg-slate-900/30 border border-dashed border-slate-700 rounded-2xl text-[10px] font-black uppercase text-slate-500 flex items-center justify-center gap-2 hover:bg-slate-700/20 hover:border-slate-600 transition-all"><Plus size={14} /> New Set</button>
              </div>
            </div>
          ))}
          
          <button onClick={() => addExercise()} className="w-full py-8 bg-slate-800/20 border-2 border-dashed border-slate-700/50 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 text-slate-500 hover:text-emerald-400 hover:border-emerald-400/50 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center group-hover:border-emerald-500/50 transition-colors"><Plus size={24} /></div>
            <span className="text-xs font-black uppercase tracking-[0.2em]">Add Exercise</span>
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-xs p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6">
                <Star size={32} className="fill-current" />
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-6">Session Options</h2>
              
              <div className="w-full space-y-3">
                <button 
                  onClick={openTemplateModal}
                  className="w-full p-5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center gap-4 text-left active:scale-[0.98] transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white shrink-0">
                    <Star size={20} className="fill-current" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white uppercase tracking-tight">Save as Template</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Create a reusable routine</p>
                  </div>
                </button>

                <div className="pt-4">
                  <button 
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full py-4 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:text-white transition-colors"
                  >
                    Close Menu
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-xs p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6">
                <Layers size={32} />
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Name Template</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">Unique name for your routine</p>
              
              <div className="w-full space-y-2 mb-8">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block text-left ml-1">Template Name</label>
                <input 
                  autoFocus 
                  value={templateName} 
                  onChange={(e) => setTemplateName(e.target.value)} 
                  placeholder="WORKOUT NAME..." 
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-white font-black uppercase tracking-tight focus:outline-none focus:border-indigo-500 transition-colors" 
                />
              </div>

              <div className="w-full space-y-3">
                <button 
                  onClick={handleSaveAsTemplate}
                  className="w-full py-4 bg-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-indigo-500/20"
                >
                  Save Template
                </button>
                <button 
                  onClick={() => setIsTemplateModalOpen(false)}
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
