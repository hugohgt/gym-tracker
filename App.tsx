
import React, { useState, useEffect, useMemo } from 'react';
import { Layout, LayoutDashboard, History, PlusCircle, BrainCircuit, BarChart3, ChevronRight, Dumbbell, Trash2, CheckCircle2, X, Timer as TimerIcon, User, Share } from 'lucide-react';
import { Workout, ViewType, Exercise, Set as WorkoutSet, MUSCLE_GROUPS, UserProfile } from './types';
import Dashboard from './components/Dashboard';
import HistoryView from './components/HistoryView';
import WorkoutLogger from './components/WorkoutLogger';
import AICoach from './components/AICoach';
import Analytics from './components/Analytics';
import TimerView from './components/TimerView';
import ProfileSwitcher from './components/ProfileSwitcher';

const STORAGE_KEY = 'gym-tracker:data';
const STORAGE_VERSION = 1;
const IOS_PROMPT_KEY = 'gym-tracker:ios-prompt-dismissed';

type PersistedStateV1 = {
  version: number;
  workouts: Workout[];
  profiles: UserProfile[];
  activeUserId: string | null;
  customCategories: string[];
};

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  // Helper to sort workouts by date newest first
  const sortWorkouts = (list: Workout[]) => {
    return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  useEffect(() => {
    // Detect if we should show the iOS install prompt
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    // @ts-ignore - standalone is an iOS specific property on navigator
    const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
    const isDismissed = localStorage.getItem(IOS_PROMPT_KEY) === 'true';

    if (isIOS && !isStandalone && !isDismissed) {
      setShowIOSPrompt(true);
    }

    const saved = safeParse<PersistedStateV1>(localStorage.getItem(STORAGE_KEY));
    let initialWorkouts: Workout[] = [];
    let initialProfiles: UserProfile[] = [];
    let initialActiveId: string | null = null;
    let initialCats: string[] = [...MUSCLE_GROUPS];

    if (saved && saved.version === STORAGE_VERSION) {
      initialWorkouts = saved.workouts ?? [];
      initialProfiles = saved.profiles ?? [];
      initialActiveId = saved.activeUserId ?? null;
      initialCats = saved.customCategories ?? [...MUSCLE_GROUPS];
    } else {
      // Fallback to legacy keys if storage_key is missing or version mismatch
      const savedProfiles = safeParse<UserProfile[]>(localStorage.getItem('ironlog_profiles'));
      const savedActiveUserId = localStorage.getItem('ironlog_active_user');
      const savedCategories = safeParse<string[]>(localStorage.getItem('ironlog_categories'));
      
      if (savedProfiles) {
        initialProfiles = savedProfiles;
        initialActiveId = savedActiveUserId || (savedProfiles.length > 0 ? savedProfiles[0].id : null);
      }
      
      if (savedCategories) {
        initialCats = savedCategories;
      }

      // Legacy per-user workout loading for migration
      if (initialProfiles.length > 0) {
        const combinedLegacy: Workout[] = [];
        initialProfiles.forEach(p => {
          const ws = safeParse<Workout[]>(localStorage.getItem(`ironlog_workouts_${p.id}`));
          if (ws) {
            // Ensure each has the correct userId
            combinedLegacy.push(...ws.map(w => ({ ...w, userId: p.id })));
          }
        });
        initialWorkouts = combinedLegacy;
      }
    }

    // Migration: assign orphaned workouts to the active user (or first profile)
    const migrationTargetId = initialActiveId || (initialProfiles.length > 0 ? initialProfiles[0].id : null);
    if (migrationTargetId) {
      initialWorkouts = initialWorkouts.map(w => {
        if (!w.userId) return { ...w, userId: migrationTargetId };
        return w;
      });
    }

    setWorkouts(sortWorkouts(initialWorkouts));
    setProfiles(initialProfiles);
    setActiveUserId(initialActiveId);
    setCustomCategories(initialCats);
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    const payload: PersistedStateV1 = {
      version: STORAGE_VERSION,
      workouts,
      profiles,
      activeUserId,
      customCategories,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    
    // Maintain legacy keys for extra safety, but STORAGE_KEY is now the main source
    localStorage.setItem('ironlog_profiles', JSON.stringify(profiles));
    if (activeUserId) {
      localStorage.setItem('ironlog_active_user', activeUserId);
      const userSpecificWorkouts = workouts.filter(w => w.userId === activeUserId);
      localStorage.setItem(`ironlog_workouts_${activeUserId}`, JSON.stringify(userSpecificWorkouts));
    }
    localStorage.setItem('ironlog_categories', JSON.stringify(customCategories));
  }, [workouts, profiles, activeUserId, customCategories, isInitialized]);

  // Derived state: workouts for the current active user only
  const activeUserWorkouts = useMemo(() => {
    if (!activeUserId) return [];
    return workouts.filter(w => w.userId === activeUserId);
  }, [workouts, activeUserId]);

  const addWorkout = (newWorkout: Omit<Workout, 'userId'>) => {
    if (!activeUserId) {
      alert("Please select or create a profile first.");
      setActiveView('profiles');
      return;
    }
    
    const workoutWithUser: Workout = { ...newWorkout, userId: activeUserId };
    
    const newFoundCategories = new Set(customCategories);
    workoutWithUser.exercises.forEach(ex => {
      if (ex.category) newFoundCategories.add(ex.category);
      ex.tags?.forEach(tag => newFoundCategories.add(tag));
    });
    
    if (newFoundCategories.size > customCategories.length) {
      setCustomCategories(Array.from(newFoundCategories));
    }

    setWorkouts(sortWorkouts([workoutWithUser, ...workouts]));
    setActiveView('dashboard');
  };

  const deleteWorkout = (id: string) => {
    setWorkouts(workouts.filter(w => w.id !== id));
  };

  const handleAddCategory = (cat: string) => {
    if (!customCategories.includes(cat)) {
      setCustomCategories([...customCategories, cat]);
    }
  };

  const handleProfileUpdate = (updatedProfiles: UserProfile[], nextActiveId: string | null) => {
    setProfiles(updatedProfiles);
    setActiveUserId(nextActiveId);
    if (nextActiveId !== activeUserId) {
      setActiveView('dashboard');
    }
  };

  const handleImportAll = (data: any, mode: 'replace' | 'merge') => {
    // Standardize imported workouts to ensure userId exists
    const processImportedWorkouts = (wsMap: Record<string, Workout[]>) => {
      const flat: Workout[] = [];
      Object.entries(wsMap).forEach(([uid, ws]) => {
        flat.push(...ws.map(w => ({ ...w, userId: uid })));
      });
      return flat;
    };

    if (mode === 'replace') {
      const importedWorkouts = data.allWorkouts ? processImportedWorkouts(data.allWorkouts) : [];
      setWorkouts(sortWorkouts(importedWorkouts));
      setProfiles(data.profiles || []);
      setCustomCategories(data.customCategories || [...MUSCLE_GROUPS]);
      const nextActiveId = data.activeUserId || (data.profiles && data.profiles.length > 0 ? data.profiles[0].id : null);
      setActiveUserId(nextActiveId);
    } else {
      // Merge logic
      const mergedProfiles = [...profiles];
      const mergedCategories = new Set([...customCategories, ...(data.customCategories || [])]);
      const profileMap: Record<string, string> = {}; // importedId -> localId

      (data.profiles || []).forEach((impProf: UserProfile) => {
        const existing = profiles.find(p => p.id === impProf.id || p.name.toLowerCase() === impProf.name.toLowerCase());
        if (existing) {
          profileMap[impProf.id] = existing.id;
        } else {
          mergedProfiles.push(impProf);
          profileMap[impProf.id] = impProf.id;
        }
      });

      const importedFlat = data.allWorkouts ? processImportedWorkouts(data.allWorkouts) : [];
      const updatedWorkouts = [...workouts];

      importedFlat.forEach(impW => {
        const localUid = profileMap[impW.userId];
        if (!localUid) return;

        const wWithLocalUid = { ...impW, userId: localUid };
        
        // De-duplicate
        const signature = `${new Date(impW.date).getTime()}-${impW.title.toLowerCase()}-${impW.exercises.length}`;
        const alreadyExists = updatedWorkouts.some(existing => {
          if (existing.userId !== localUid) return false;
          if (existing.id === impW.id) return true;
          const existingSig = `${new Date(existing.date).getTime()}-${existing.title.toLowerCase()}-${existing.exercises.length}`;
          return signature === existingSig;
        });

        if (!alreadyExists) {
          updatedWorkouts.push(wWithLocalUid);
        }
      });

      setProfiles(mergedProfiles);
      setCustomCategories(Array.from(mergedCategories));
      setWorkouts(sortWorkouts(updatedWorkouts));
    }
    
    setActiveView('dashboard');
  };

  const dismissIOSPrompt = () => {
    localStorage.setItem(IOS_PROMPT_KEY, 'true');
    setShowIOSPrompt(false);
  };

  const activeUser = profiles.find(p => p.id === activeUserId);

  if (isInitialized && profiles.length === 0) {
    return (
      <ProfileSwitcher 
        profiles={profiles} 
        activeUserId={activeUserId} 
        onUpdate={handleProfileUpdate} 
        customCategories={customCategories}
        onImportAll={handleImportAll}
        forceCreate 
      />
    );
  }

  const renderView = () => {
    if (activeView === 'profiles') {
      return (
        <ProfileSwitcher 
          profiles={profiles} 
          activeUserId={activeUserId} 
          onUpdate={handleProfileUpdate} 
          customCategories={customCategories}
          onImportAll={handleImportAll}
          onClose={() => setActiveView('dashboard')}
        />
      );
    }

    switch (activeView) {
      case 'dashboard':
        return <Dashboard workouts={activeUserWorkouts} onNavigate={setActiveView} />;
      case 'history':
        return <HistoryView workouts={activeUserWorkouts} onDelete={deleteWorkout} />;
      case 'log':
        return (
          <WorkoutLogger 
            onSave={addWorkout} 
            onCancel={() => setActiveView('dashboard')} 
            previousWorkouts={activeUserWorkouts}
            availableCategories={customCategories}
            onAddCategory={handleAddCategory}
          />
        );
      case 'ai':
        return <AICoach workouts={activeUserWorkouts} />;
      case 'stats':
        return <Analytics workouts={activeUserWorkouts} />;
      case 'timer':
        return <TimerView />;
      default:
        return <Dashboard workouts={activeUserWorkouts} onNavigate={setActiveView} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-slate-900">
      {showIOSPrompt && (
        <div className="fixed top-4 left-4 right-4 z-[100] animate-in slide-in-from-top-4 duration-500 max-w-md mx-auto">
          <div className="bg-slate-800/95 backdrop-blur-md border border-slate-700/60 p-4 rounded-2xl shadow-2xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Share size={18} className="text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-white uppercase tracking-wider mb-0.5">Install App</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Tap <span className="text-white">Share</span> → <span className="text-white">Add to Home Screen</span></p>
            </div>
            <button 
              onClick={dismissIOSPrompt}
              className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-500 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <header className="pt-8 pb-4 px-6 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            GYM TRACKER
          </h1>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-[0.2em]">Track. Analyze. Grow.</p>
        </div>
        <button 
          onClick={() => setActiveView('profiles')}
          className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center overflow-hidden transition-transform active:scale-95 shadow-lg"
          style={{ borderColor: activeUser?.color || 'transparent' }}
        >
          {activeUser ? (
            <div className="w-full h-full flex items-center justify-center text-xs font-black text-white" style={{ backgroundColor: activeUser.color }}>
              {activeUser.name.charAt(0).toUpperCase()}
            </div>
          ) : (
            <User className="w-5 h-5 text-slate-500" />
          )}
        </button>
      </header>

      <main className="px-4 py-6 pb-32">
        {renderView()}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 flex justify-around items-center px-4 py-4 safe-bottom z-50">
        <NavButton active={activeView === 'dashboard'} icon={<LayoutDashboard size={24} />} label="Home" onClick={() => setActiveView('dashboard')} />
        <NavButton active={activeView === 'history'} icon={<History size={24} />} label="Log" onClick={() => setActiveView('history')} />
        <div className="relative -top-6">
          <button onClick={() => setActiveView('log')} className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/20 flex items-center justify-center text-white border-4 border-slate-900 active:scale-95 transition-transform"><PlusCircle size={32} /></button>
        </div>
        <NavButton active={activeView === 'timer'} icon={<TimerIcon size={24} />} label="Timer" onClick={() => setActiveView('timer')} />
        <NavButton active={activeView === 'stats'} icon={<BarChart3 size={24} />} label="Stats" onClick={() => setActiveView('stats')} />
      </nav>
    </div>
  );
};

const NavButton: React.FC<{active: boolean, icon: React.ReactNode, label: string, onClick: () => void}> = ({active, icon, label, onClick}) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 min-w-[60px] transition-colors ${active ? 'text-emerald-400' : 'text-slate-500'}`}>
    {icon}
    <span className="text-[10px] font-bold tracking-wider uppercase">{label}</span>
  </button>
);

export default App;
