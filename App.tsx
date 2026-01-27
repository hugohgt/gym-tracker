
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LayoutDashboard, History, PlusCircle, BarChart3, User, Share, X, Timer as TimerIcon, CheckCircle2, AlertTriangle, Layers, Trophy, ShieldCheck, Download } from 'lucide-react';
import { Workout, ViewType, UserProfile, MUSCLE_GROUPS, WorkoutTemplate, ExercisePR, Exercise } from './types';
import Dashboard from './components/Dashboard';
import HistoryView from './components/HistoryView';
import WorkoutLogger from './components/WorkoutLogger';
import AICoach from './components/AICoach';
import Analytics from './components/Analytics';
import TimerView from './components/TimerView';
import ProfileSwitcher from './components/ProfileSwitcher';
// Added downloadAppStateAsJSON for reuse
import { loadState, saveState, createDefaultState, AppState, normalizeWorkout, normalizeTemplate, normalizeExerciseName, checkIsBackupDue, createBackupSnapshot, getLatestBackup, BackupSnapshot, migrateState, downloadAppStateAsJSON } from './storage/appStorage';

const IOS_PROMPT_KEY = 'gym-tracker:ios-prompt-dismissed';
const BACKUP_DISMISSED_KEY = 'gym-tracker:backup-dismissed-date';

interface ToastState {
  message: string;
  type: 'success' | 'error';
  durationMs?: number;
  id: number;
}

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [toast, setToastInternal] = useState<ToastState | null>(null);
  const [historyDateFilter, setHistoryDateFilter] = useState<string | null>(null);
  const [justAchievedPR, setJustAchievedPR] = useState(false);
  const [latestBackup, setLatestBackup] = useState<BackupSnapshot | null>(null);
  const [showBackupBanner, setShowBackupBanner] = useState(false);
  
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setToast = (t: Omit<ToastState, 'id'> | null) => {
    if (!t) {
      setToastInternal(null);
      return;
    }
    setToastInternal({ ...t, id: Date.now() });
  };

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    // @ts-ignore
    const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
    const isDismissed = localStorage.getItem(IOS_PROMPT_KEY) === 'true';

    if (isIOS && !isStandalone && !isDismissed) {
      setShowIOSPrompt(true);
    }

    const { state, recovered } = loadState();

    setWorkouts(state.workouts || []);
    setTemplates(state.templates || []);
    setProfiles(state.profiles || []);
    setActiveUserId(state.activeUserId);
    setCustomCategories(state.customCategories || [...MUSCLE_GROUPS]);
    setIsInitialized(true);

    if (recovered) {
      setToast({ message: "Recovered data from a backup", type: 'success' });
    }

    // Determine whether to show the backup banner
    let currentBackup: BackupSnapshot | null = null;
    if (checkIsBackupDue() && state.workouts.length > 0) {
      currentBackup = createBackupSnapshot(state);
    } else {
      currentBackup = getLatestBackup();
    }

    if (currentBackup) {
      setLatestBackup(currentBackup);
      
      // Persistence check: only show if this specific backup hasn't been dismissed
      const dismissedDate = localStorage.getItem(BACKUP_DISMISSED_KEY);
      const isFresh = Date.now() - new Date(currentBackup.date).getTime() < 24 * 60 * 60 * 1000;
      
      if (currentBackup.date !== dismissedDate && isFresh) {
        setShowBackupBanner(true);
      }
    }
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      const appState: AppState = {
        version: 2,
        backupType: 'app',
        updatedAt: new Date().toISOString(),
        profiles,
        activeUserId,
        customCategories,
        workouts: workouts.map(normalizeWorkout),
        templates: templates.map(normalizeTemplate),
      };
      saveState(appState);
    }, 400);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [workouts, templates, profiles, activeUserId, customCategories, isInitialized]);

  const activeUserWorkouts = useMemo(() => {
    if (!activeUserId) return [];
    return workouts
      .filter(w => w.userId === activeUserId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [workouts, activeUserId]);

  const activeUserTemplates = useMemo(() => {
    if (!activeUserId) return [];
    return templates.filter(t => t.userId === activeUserId);
  }, [templates, activeUserId]);

  const handleNavigate = (view: ViewType, data?: any) => {
    if (view === 'history') {
      setHistoryDateFilter(data || null);
    } else {
      setHistoryDateFilter(null);
    }
    setActiveView(view);
  };

  const handleExportBackup = () => {
    if (!latestBackup) return;
    
    const dateStr = new Date(latestBackup.date).toISOString().split('T')[0];
    const fileName = `gym-tracker_weekly-backup_${dateStr}.json`;
    
    // Reuse unified download logic
    downloadAppStateAsJSON(latestBackup.data, fileName);
    
    // Auto-dismiss on save
    dismissBackupBanner();
    setToast({ message: "Full system backup exported", type: 'success' });
  };

  const dismissBackupBanner = () => {
    if (latestBackup) {
      localStorage.setItem(BACKUP_DISMISSED_KEY, latestBackup.date);
    }
    setShowBackupBanner(false);
  };

  const addWorkout = (newWorkout: Omit<Workout, 'userId'>) => {
    if (!activeUserId) {
      setToast({ message: "Please select or create a profile first", type: 'error' });
      setActiveView('profiles');
      return;
    }
    
    const currentUser = profiles.find(p => p.id === activeUserId);
    const currentPRs: Record<string, ExercisePR> = { ...(currentUser?.prs || {}) };
    const improvedExercises: { name: string; count: number; metric?: string }[] = [];

    const exercisesWithPRFlags = newWorkout.exercises.map(ex => {
      const key = normalizeExerciseName(ex.name);
      if (!key || newWorkout.type !== 'strength') return { ...ex, isPR: false };

      const sessionMaxWeight = Math.max(...ex.sets.map(s => s.weight || 0), 0);
      const sessionVolume = ex.sets.reduce((sum, s) => {
        const weight = s.weight || 0;
        const reps = s.metricValue || s.reps || 0;
        return sum + (weight * reps);
      }, 0);
      const sessionMaxE1RM = Math.max(...ex.sets.filter(s => (s.metricValue || s.reps || 0) >= 1 && (s.weight || 0) > 0).map(s => {
        const reps = s.metricValue || s.reps || 0;
        return (s.weight || 0) * (1 + reps / 30);
      }), 0);

      const existingPR = currentPRs[key];
      let isPRInThisWorkout = false;
      let metricsImproved = 0;
      let firstImprovedMetric = '';

      if (!existingPR) {
        if (sessionMaxWeight > 0 || sessionVolume > 0 || sessionMaxE1RM > 0) {
          isPRInThisWorkout = true;
          metricsImproved = 3;
          currentPRs[key] = {
            bestWeight: sessionMaxWeight,
            bestVolume: sessionVolume,
            bestE1RM: sessionMaxE1RM,
            lastPRDate: new Date().toISOString()
          };
        }
      } else {
        if (sessionMaxWeight > existingPR.bestWeight) {
          existingPR.bestWeight = sessionMaxWeight;
          isPRInThisWorkout = true;
          metricsImproved++;
          firstImprovedMetric = 'Heaviest';
        }
        if (sessionVolume > existingPR.bestVolume) {
          existingPR.bestVolume = sessionVolume;
          isPRInThisWorkout = true;
          metricsImproved++;
          firstImprovedMetric = 'Volume';
        }
        if (sessionMaxE1RM > existingPR.bestE1RM) {
          existingPR.bestE1RM = sessionMaxE1RM;
          isPRInThisWorkout = true;
          metricsImproved++;
          firstImprovedMetric = 'Est. 1RM';
        }
        if (isPRInThisWorkout) {
          existingPR.lastPRDate = new Date().toISOString();
        }
      }

      if (isPRInThisWorkout) {
        improvedExercises.push({ 
          name: ex.name, 
          count: metricsImproved, 
          metric: metricsImproved === 1 ? firstImprovedMetric : undefined 
        });
      }

      return { ...ex, isPR: isPRInThisWorkout };
    });

    const workoutWithUser: Workout = normalizeWorkout({ 
      ...newWorkout, 
      exercises: exercisesWithPRFlags,
      userId: activeUserId 
    });

    const now = new Date().toISOString();
    setProfiles(prev => prev.map(p => 
      p.id === activeUserId ? { ...p, lastUsedAt: now, prs: currentPRs } : p
    ));

    const newFoundCategories = new Set(customCategories);
    workoutWithUser.exercises.forEach(ex => {
      if (ex.category) newFoundCategories.add(ex.category);
      ex.tags?.forEach(tag => newFoundCategories.add(tag));
    });
    
    if (newFoundCategories.size > customCategories.length) {
      setCustomCategories(Array.from(newFoundCategories));
    }

    setWorkouts([workoutWithUser, ...workouts]);
    setActiveView('dashboard');

    if (improvedExercises.length > 0) {
      setJustAchievedPR(true);
      if (improvedExercises.length === 1) {
        const item = improvedExercises[0];
        const msg = item.count === 1 
          ? `New PR: ${item.name} — ${item.metric}`
          : `New PRs: ${item.name} (${item.count})`;
        setToast({ message: msg, type: 'success', durationMs: 4000 });
      } else {
        setToast({ message: `New PRs: ${improvedExercises.length} Exercises improved`, type: 'success', durationMs: 4000 });
      }
    } else {
      setToast({ message: "Workout saved", type: 'success' });
    }
  };

  const addTemplate = (newTemplate: Omit<WorkoutTemplate, 'userId'>) => {
    if (!activeUserId) return;
    const templateWithUser = normalizeTemplate({ ...newTemplate, userId: activeUserId });
    setTemplates(prev => [templateWithUser, ...prev]);
    setToast({ message: "Template created", type: 'success' });
  };

  const deleteTemplate = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id));
    setToast({ message: 'Template deleted', type: 'success' });
  };

  const updateTemplate = (id: string, updates: Partial<WorkoutTemplate>) => {
    setTemplates(templates.map(t => t.id === id ? { ...t, ...updates } : t));
    setToast({ message: 'Template updated', type: 'success' });
  };

  const deleteWorkout = (id: string) => {
    const exists = workouts.some(w => w.id === id);
    if (exists) {
      setWorkouts(workouts.filter(w => w.id !== id));
      setToast({ message: 'Workout deleted', type: 'success' });
    } else {
      setToast({ message: 'Delete failed. Try again.', type: 'error' });
    }
  };

  const handleAddCategory = (cat: string) => {
    if (!customCategories.includes(cat)) {
      setCustomCategories([...customCategories, cat]);
    }
  };

  const handleProfileUpdate = (updatedProfiles: UserProfile[], nextActiveId: string | null) => {
    let finalProfiles = updatedProfiles;
    if (nextActiveId && nextActiveId !== activeUserId) {
      const now = new Date().toISOString();
      finalProfiles = updatedProfiles.map(p => 
        p.id === nextActiveId ? { ...p, lastUsedAt: now } : p
      );
    }
    setProfiles(finalProfiles);
    setActiveUserId(nextActiveId);
    if (nextActiveId !== activeUserId) {
      setActiveView('dashboard');
    }
  };

  const handleImportAll = (data: any, mode: 'replace' | 'merge') => {
    if (!data.profiles || !Array.isArray(data.profiles)) return;

    // Handle App-Wide Overwrite
    if (data.backupType === 'app' && mode === 'replace') {
      const newState = migrateState(data);
      // Constructing and saving state immediately to ensure absolute consistency
      const fullSnapshot: AppState = {
        ...newState,
        backupType: 'app',
        updatedAt: new Date().toISOString(),
        version: 2
      };
      saveState(fullSnapshot);
      
      setProfiles(fullSnapshot.profiles);
      setWorkouts(fullSnapshot.workouts);
      setTemplates(fullSnapshot.templates);
      setCustomCategories(fullSnapshot.customCategories);
      setActiveUserId(fullSnapshot.activeUserId);
      setActiveView('dashboard');
      setToast({ message: "App data restored", type: 'success' });
      return;
    }

    // Process Import (Merge App or Individual Profile)
    const importedProfiles: UserProfile[] = data.profiles;
    const importedWorkoutsRaw: Workout[] = (Array.isArray(data.workouts) ? data.workouts : []).map(normalizeWorkout);
    const importedTemplatesRaw: WorkoutTemplate[] = (Array.isArray(data.templates) ? data.templates : []).map(normalizeTemplate);
    
    let updatedProfiles = [...profiles];
    let updatedWorkouts = [...workouts];
    let updatedTemplates = [...templates];
    const profileIdMap: Record<string, string> = {};

    importedProfiles.forEach(impProf => {
      // Find matching profile by name or ID
      const existingIdx = updatedProfiles.findIndex(p => 
        p.id === impProf.id || p.name.toLowerCase() === impProf.name.toLowerCase()
      );
      
      let targetProfileId: string;
      if (existingIdx > -1) {
        targetProfileId = updatedProfiles[existingIdx].id;
        // Merge PRs and Update Last Used if relevant
        updatedProfiles[existingIdx] = { 
          ...updatedProfiles[existingIdx], 
          color: impProf.color || updatedProfiles[existingIdx].color,
          prs: { ...(updatedProfiles[existingIdx].prs || {}), ...(impProf.prs || {}) }
        };
      } else {
        targetProfileId = impProf.id;
        updatedProfiles.push({ ...impProf, prs: impProf.prs || {} });
      }
      profileIdMap[impProf.id] = targetProfileId;
      
      const profImportedWorkouts = importedWorkoutsRaw
        .filter(w => w.userId === impProf.id)
        .map(w => ({ ...w, userId: targetProfileId }));

      const profImportedTemplates = importedTemplatesRaw
        .filter(t => t.userId === impProf.id)
        .map(t => ({ ...t, userId: targetProfileId }));

      if (mode === 'replace' && data.backupType !== 'app') {
        // Individual Profile Overwrite (existing behavior)
        updatedWorkouts = updatedWorkouts.filter(w => w.userId !== targetProfileId);
        updatedWorkouts.push(...profImportedWorkouts);
        updatedTemplates = updatedTemplates.filter(t => t.userId !== targetProfileId);
        updatedTemplates.push(...profImportedTemplates);
      } else {
        // MERGE LOGIC (App or Profile)
        profImportedWorkouts.forEach(impW => {
          const isDuplicate = updatedWorkouts.some(existing => {
            if (existing.userId !== targetProfileId) return false;
            // Match by Signature: Date + Title + Ex Count
            const sigA = `${new Date(existing.date).getTime()}-${existing.title.toLowerCase()}-${existing.exercises.length}`;
            const sigB = `${new Date(impW.date).getTime()}-${impW.title.toLowerCase()}-${impW.exercises.length}`;
            return sigA === sigB;
          });
          if (!isDuplicate) updatedWorkouts.push(impW);
        });

        profImportedTemplates.forEach(impT => {
          const isDuplicate = updatedTemplates.some(existing => 
            existing.userId === targetProfileId && 
            (existing.id === impT.id || existing.title.toLowerCase() === impT.title.toLowerCase())
          );
          if (!isDuplicate) updatedTemplates.push(impT);
        });
      }
    });

    const mergedCategories = new Set([...customCategories, ...(data.customCategories || [])]);
    setProfiles(updatedProfiles);
    setWorkouts(updatedWorkouts);
    setTemplates(updatedTemplates);
    setCustomCategories(Array.from(mergedCategories));
    
    // Switch to active imported user if app backup
    const nextActiveIdImported = data.activeUserId ? profileIdMap[data.activeUserId] : profileIdMap[importedProfiles[0].id];
    if (nextActiveIdImported) setActiveUserId(nextActiveIdImported);
    
    setToast({ message: data.backupType === 'app' ? "System data merged successfully" : "Profile data merged successfully", type: 'success' });
    setActiveView('dashboard');
  };

  const dismissIOSPrompt = () => {
    localStorage.setItem(IOS_PROMPT_KEY, 'true');
    setShowIOSPrompt(false);
  };

  const activeUser = profiles.find(p => p.id === activeUserId);

  const renderView = () => {
    if (activeView === 'profiles') {
      return (
        <ProfileSwitcher 
          profiles={profiles} 
          workouts={workouts}
          templates={templates}
          activeUserId={activeUserId} 
          onUpdate={handleProfileUpdate} 
          customCategories={customCategories}
          onImportAll={handleImportAll}
          onClose={() => setActiveView('dashboard')}
          onToast={setToast}
        />
      );
    }

    switch (activeView) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {showBackupBanner && latestBackup && (
              <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl flex items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-white uppercase tracking-wider">Weekly backup ready</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Your data is safely cached on this device.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleExportBackup}
                    className="px-3 py-2 bg-indigo-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 active:scale-95 transition-all shadow-lg shadow-indigo-500/20"
                  >
                    <Download size={12} /> Save
                  </button>
                  <button 
                    onClick={dismissBackupBanner}
                    className="p-2 text-slate-500 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}
            <Dashboard workouts={activeUserWorkouts} onNavigate={handleNavigate} isNewPR={justAchievedPR} onClearPRFlag={() => setJustAchievedPR(false)} />
          </div>
        );
      case 'history':
        return <HistoryView 
          workouts={activeUserWorkouts} 
          onDelete={deleteWorkout} 
          dateFilter={historyDateFilter}
          onClearFilter={() => setHistoryDateFilter(null)}
        />;
      case 'log':
        return (
          <WorkoutLogger 
            onSave={addWorkout}
            onSaveTemplate={addTemplate}
            onDeleteTemplate={deleteTemplate}
            onUpdateTemplate={updateTemplate}
            onCancel={() => setActiveView('dashboard')} 
            previousWorkouts={activeUserWorkouts}
            templates={activeUserTemplates}
            availableCategories={customCategories}
            onAddCategory={handleAddCategory}
            onToast={setToast}
          />
        );
      case 'ai':
        return <AICoach workouts={activeUserWorkouts} />;
      case 'stats':
        return <Analytics workouts={activeUserWorkouts} />;
      case 'timer':
        return <TimerView />;
      default:
        return <Dashboard workouts={activeUserWorkouts} onNavigate={handleNavigate} isNewPR={justAchievedPR} onClearPRFlag={() => setJustAchievedPR(false)} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-slate-900 overflow-x-hidden">
      {isInitialized && profiles.length === 0 ? (
        <ProfileSwitcher 
          profiles={profiles} 
          workouts={workouts}
          templates={templates}
          activeUserId={activeUserId} 
          onUpdate={handleProfileUpdate} 
          customCategories={customCategories}
          onImportAll={handleImportAll}
          forceCreate 
          onToast={setToast}
        />
      ) : (
        <>
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
              onClick={() => handleNavigate('profiles')}
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
            <NavButton active={activeView === 'dashboard'} icon={<LayoutDashboard size={24} />} label="Home" onClick={() => handleNavigate('dashboard')} />
            <NavButton active={activeView === 'history'} icon={<History size={24} />} label="Log" onClick={() => handleNavigate('history')} />
            <div className="relative -top-6">
              <button onClick={() => handleNavigate('log')} className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/20 flex items-center justify-center text-white border-4 border-slate-900 active:scale-95 transition-transform"><PlusCircle size={32} /></button>
            </div>
            <NavButton active={activeView === 'timer'} icon={<TimerIcon size={24} />} label="Timer" onClick={() => handleNavigate('timer')} />
            <NavButton active={activeView === 'stats'} icon={<BarChart3 size={24} />} label="Stats" onClick={() => handleNavigate('stats')} />
          </nav>
        </>
      )}

      {toast && (
        <div 
          key={toast.id}
          className="fixed left-1/2 -translate-x-1/2 z-[9999] animate-toast pointer-events-auto w-full max-w-md px-5"
          style={{ bottom: 'calc(100px + env(safe-area-inset-bottom))' }}
        >
          <div className={`bg-slate-800/95 backdrop-blur-md border ${toast.type === 'error' ? 'border-red-500/50 shadow-red-500/10' : 'border-slate-700 shadow-2xl shadow-emerald-500/5'} rounded-[1.25rem] px-5 py-3.5 flex items-center gap-3 w-full justify-between transition-all`}>
            <div className="flex items-center gap-3">
              {toast.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-400" /> : <AlertTriangle size={16} className="text-red-400" />}
              <span className="text-[10px] font-black text-white uppercase tracking-widest">{toast.message}</span>
            </div>
            <button 
              onClick={() => setToastInternal(null)}
              className="p-1 rounded-full hover:bg-white/10 text-slate-500 hover:text-white transition-colors ml-2"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
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
