
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LayoutDashboard, History, PlusCircle, BarChart3, User, Share, X, Timer as TimerIcon, CheckCircle2, AlertTriangle, Layers, Trophy, ShieldCheck, Download, LogOut, Cloud, Settings, RefreshCw } from 'lucide-react';
import { Workout, ViewType, UserProfile, MUSCLE_GROUPS, WorkoutTemplate, ExercisePR, Exercise } from './types';
import Dashboard from './components/Dashboard';
import HistoryView from './components/HistoryView';
import WorkoutLogger from './components/WorkoutLogger';
import AICoach from './components/AICoach';
import Analytics from './components/Analytics';
import TimerView from './components/TimerView';
import ProfileSwitcher from './components/ProfileSwitcher';
import { AuthScreen } from './components/AuthScreen';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { loadState, saveState, AppState, normalizeWorkout, normalizeTemplate, normalizeExerciseName, checkIsBackupDue, createBackupSnapshot, getLatestBackup, BackupSnapshot, migrateState, downloadAppStateAsJSON } from './storage/appStorage';

const IOS_PROMPT_KEY = 'gym-tracker:ios-prompt-dismissed';

interface ToastState {
  message: string;
  type: 'success' | 'error';
  durationMs?: number;
  id: number;
}

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
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
  const [isSyncing, setIsSyncing] = useState(false);
  
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setToast = (t: Omit<ToastState, 'id'> | null) => {
    if (!t) {
      setToastInternal(null);
      return;
    }
    setToastInternal({ ...t, id: Date.now() });
  };

  // Auth Listener - Only run if supabase is configured
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Initialize and Fetch Cloud Data
  useEffect(() => {
    if (!session || !isSupabaseConfigured) return;

    const initializeData = async () => {
      setIsSyncing(true);
      try {
        const { data, error } = await supabase
          .from('user_app_data')
          .select('payload')
          .eq('user_id', session.user.id)
          .single();

        let stateToLoad: AppState;

        if (data && data.payload) {
          stateToLoad = migrateState(data.payload);
        } else {
          const { state } = loadState();
          stateToLoad = state;
        }

        setWorkouts(stateToLoad.workouts || []);
        setTemplates(stateToLoad.templates || []);
        setProfiles(stateToLoad.profiles || []);
        setActiveUserId(stateToLoad.activeUserId);
        setCustomCategories(stateToLoad.customCategories || [...MUSCLE_GROUPS]);
        setIsInitialized(true);
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setIsSyncing(false);
      }
    };

    initializeData();
  }, [session]);

  // Save to Cloud and Local periodically
  useEffect(() => {
    if (!isInitialized || !session || !isSupabaseConfigured) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
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

      try {
        await supabase
          .from('user_app_data')
          .upsert({ 
            user_id: session.user.id, 
            payload: appState,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
      } catch (err) {
        console.error("Cloud sync failed:", err);
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [workouts, templates, profiles, activeUserId, customCategories, isInitialized, session]);

  const activeUserWorkouts = useMemo(() => {
    if (!activeUserId) return [];
    return workouts
      .filter(w => w.userId === activeUserId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [workouts, activeUserId]);

  const handleNavigate = (view: ViewType, data?: any) => {
    if (view === 'history') setHistoryDateFilter(data || null);
    else setHistoryDateFilter(null);
    setActiveView(view);
  };

  const addWorkout = (newWorkout: Omit<Workout, 'userId'>) => {
    if (!activeUserId) {
      setToast({ message: "Please select or create a profile first", type: 'error' });
      setActiveView('profiles');
      return;
    }
    const workoutWithUser: Workout = normalizeWorkout({ ...newWorkout, userId: activeUserId });
    setWorkouts([workoutWithUser, ...workouts]);
    setActiveView('dashboard');
    setToast({ message: "Workout saved", type: 'success' });
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setIsInitialized(false);
    setWorkouts([]);
    setProfiles([]);
  };

  // If Supabase is not configured, show a helpful setup screen
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-8">
          <Settings size={40} className="animate-spin-slow" />
        </div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Setup Required</h1>
        <p className="text-sm text-slate-400 max-w-xs mb-8 leading-relaxed uppercase font-bold">
          Your Supabase keys are missing. Please add <span className="text-white">NEXT_PUBLIC_SUPABASE_URL</span> and <span className="text-white">NEXT_PUBLIC_SUPABASE_ANON_KEY</span> to your Vercel Environment Variables.
        </p>
        <div className="space-y-4 w-full max-w-xs">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-left">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Instructions</p>
            <ol className="text-[9px] font-bold text-slate-300 space-y-2 uppercase tracking-tight">
              <li>1. Go to Vercel Project Settings</li>
              <li>2. Add the two Supabase keys</li>
              <li>3. <span className="text-emerald-400">Important:</span> Re-deploy your app</li>
            </ol>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-slate-800 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <RefreshCw size={16} /> Check Again
          </button>
        </div>
      </div>
    );
  }

  if (!session) return <AuthScreen />;

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-slate-900 overflow-x-hidden">
      <header className="pt-8 pb-4 px-6 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent uppercase tracking-tighter">
            GYM TRACKER
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Cloud size={10} className={isSyncing ? "text-emerald-400 animate-pulse" : "text-slate-500"} />
            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-[0.2em]">Cloud Sync Active</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleLogout}
            className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 active:scale-95 transition-all"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
          <button 
            onClick={() => handleNavigate('profiles')}
            className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center overflow-hidden transition-transform active:scale-95 shadow-lg"
          >
            <User className="w-5 h-5 text-slate-500" />
          </button>
        </div>
      </header>

      <main className="px-4 py-6 pb-32">
        {activeView === 'dashboard' && <Dashboard workouts={activeUserWorkouts} onNavigate={handleNavigate} />}
        {activeView === 'history' && <HistoryView workouts={activeUserWorkouts} onDelete={(id) => setWorkouts(workouts.filter(w => w.id !== id))} dateFilter={historyDateFilter} onClearFilter={() => setHistoryDateFilter(null)} />}
        {activeView === 'log' && (
          <WorkoutLogger 
            onSave={addWorkout}
            onSaveTemplate={(t) => setTemplates([...templates, normalizeTemplate({...t, userId: activeUserId!})])}
            onCancel={() => setActiveView('dashboard')} 
            previousWorkouts={activeUserWorkouts}
            templates={templates.filter(t => t.userId === activeUserId)}
            availableCategories={customCategories}
            onAddCategory={(cat) => setCustomCategories([...customCategories, cat])}
            onToast={setToast}
          />
        )}
        {activeView === 'stats' && <Analytics workouts={activeUserWorkouts} />}
        {activeView === 'timer' && <TimerView />}
        {activeView === 'ai' && <AICoach workouts={activeUserWorkouts} />}
        {activeView === 'profiles' && (
           <ProfileSwitcher 
           profiles={profiles} 
           workouts={workouts}
           templates={templates}
           activeUserId={activeUserId} 
           onUpdate={(updated, nextId) => { setProfiles(updated); setActiveUserId(nextId); }} 
           customCategories={customCategories}
           onImportAll={() => {}}
           onClose={() => setActiveView('dashboard')}
           onToast={setToast}
         />
        )}
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

      {toast && (
        <div 
          key={toast.id}
          className="fixed left-1/2 -translate-x-1/2 z-[9999] animate-toast pointer-events-auto w-full max-w-md px-5"
          style={{ bottom: 'calc(100px + env(safe-area-inset-bottom))' }}
        >
          <div className="bg-slate-800/95 backdrop-blur-md border border-slate-700 rounded-[1.25rem] px-5 py-3.5 flex items-center gap-3 w-full justify-between transition-all">
            <div className="flex items-center gap-3">
              {toast.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-400" /> : <AlertTriangle size={16} className="text-red-400" />}
              <span className="text-[10px] font-black text-white uppercase tracking-widest">{toast.message}</span>
            </div>
            <button onClick={() => setToastInternal(null)} className="p-1 text-slate-500 hover:text-white transition-colors ml-2"><X size={14} /></button>
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
