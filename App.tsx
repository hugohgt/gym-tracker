
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LayoutDashboard, History, PlusCircle, BarChart3, User, Share, X, Timer as TimerIcon, CheckCircle2, AlertTriangle, Layers, Trophy, ShieldCheck, Download, LogOut, Cloud, Settings, RefreshCw, Loader2, Database } from 'lucide-react';
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
import { normalizeWorkout, normalizeTemplate, loadState } from './storage/appStorage';

const IOS_PROMPT_KEY = 'gym-tracker:ios-prompt-dismissed';

interface ToastState {
  message: string;
  type: 'success' | 'error';
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
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [toast, setToastInternal] = useState<ToastState | null>(null);
  const [historyDateFilter, setHistoryDateFilter] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const setToast = (t: Omit<ToastState, 'id'> | null) => {
    if (!t) {
      setToastInternal(null);
      return;
    }
    setToastInternal({ ...t, id: Date.now() });
    setTimeout(() => setToastInternal(null), 3000);
  };

  // 1. Auth Listener
  useEffect(() => {
    if (!supabase) {
      setIsInitialized(true);
      return;
    }
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) setIsInitialized(true); 
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  // 2. Data Fetching / Initialization
  useEffect(() => {
    if (!session) {
      const { state } = loadState();
      setWorkouts(state.workouts || []);
      setProfiles(state.profiles || []);
      setTemplates(state.templates || []);
      if (state.profiles?.length > 0) setActiveUserId(state.activeUserId);
      setCustomCategories(state.customCategories || [...MUSCLE_GROUPS]);
      setIsInitialized(true);
      return;
    }

    const fetchAllData = async () => {
      if (!supabase) return;
      setIsSyncing(true);
      setInitializationError(null);
      try {
        // Fetch using Spanish table names: usuarios, entrenos
        const [{ data: pData, error: pError }, { data: wData, error: wError }, { data: tData }] = await Promise.all([
          supabase.from('usuarios').select('*').eq('user_id', session.user.id).order('last_used_at', { ascending: false }),
          supabase.from('entrenos').select('*').eq('usuario_id', session.user.id).order('fecha', { ascending: false }),
          supabase.from('templates').select('*').eq('user_id', session.user.id)
        ]);

        // Error detection for missing tables
        if (wError?.code === 'PGRST116' || wError?.message?.includes('not found')) {
          setInitializationError('Table "entrenos" not found. Please check your Supabase schema.');
          setIsInitialized(true);
          return;
        }

        if (pError?.code === 'PGRST116' || pError?.message?.includes('not found')) {
          setInitializationError('Table "usuarios" not found. Please check your Supabase schema.');
          setIsInitialized(true);
          return;
        }

        const mappedProfiles = pData || [];
        setProfiles(mappedProfiles);
        
        // Map Spanish columns back to internal Workout type
        const mappedWorkouts: Workout[] = (wData || []).map(raw => {
          let obs: any = {};
          try {
            obs = JSON.parse(raw.observaciones || '{}');
          } catch (e) {
            obs = { notes: raw.observaciones };
          }

          return {
            id: raw.entreno_id,
            user_id: raw.usuario_id,
            profile_id: obs.profile_id || '', // Use the profile stored in JSON
            date: raw.fecha,
            title: raw.nombre_rutina,
            duration: raw.duracion_minutos,
            exercises: obs.exercises || [],
            type: obs.type || 'strength',
            quality: obs.quality || 'normal',
            notes: obs.notes || ''
          };
        });

        setWorkouts(mappedWorkouts);
        setTemplates(tData || []);
        
        if (mappedProfiles.length > 0 && !activeUserId) {
          setActiveUserId(mappedProfiles[0].id);
        }

        setCustomCategories([...MUSCLE_GROUPS]);
        setIsInitialized(true);
      } catch (err: any) {
        console.error("Cloud Sync Error:", err.message);
        setInitializationError("Failed to connect to Supabase.");
        setIsInitialized(true);
      } finally {
        setIsSyncing(false);
      }
    };

    fetchAllData();
  }, [session]);

  const activeUserWorkouts = useMemo(() => {
    if (!activeUserId) return [];
    // Filter by profile_id stored in our JSON blob (now part of normalized Workout object)
    return workouts
      .filter(w => w.profile_id === activeUserId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [workouts, activeUserId]);

  const handleNavigate = (view: ViewType, data?: any) => {
    if (view === 'history') setHistoryDateFilter(data || null);
    else setHistoryDateFilter(null);
    setActiveView(view);
  };

  const addWorkout = async (newWorkout: Omit<Workout, 'userId' | 'user_id' | 'profile_id'>) => {
    if (!activeUserId || !session) {
      setToast({ message: "Auth required for cloud", type: 'error' });
      return;
    }

    const workoutId = Date.now().toString();
    const workoutToSave: Workout = { 
      ...newWorkout, 
      id: workoutId, 
      profile_id: activeUserId,
      user_id: session.user.id 
    };

    if (supabase && session) {
      setIsSyncing(true);
      try {
        // Map internal Workout type to Spanish schema
        const payload = {
          entreno_id: workoutId,
          usuario_id: session.user.id, // Mandatory as requested
          nombre_rutina: workoutToSave.title,
          fecha: workoutToSave.date,
          duracion_minutos: workoutToSave.duration || 0,
          observaciones: JSON.stringify({
            exercises: workoutToSave.exercises,
            type: workoutToSave.type,
            quality: workoutToSave.quality,
            notes: workoutToSave.notes,
            profile_id: activeUserId // Key to keep profile data separate in entrenos
          })
        };

        const { error } = await supabase.from('entrenos').insert([payload]);

        if (error) throw error;
        setWorkouts([workoutToSave, ...workouts]);
        setToast({ message: "Synced to entrenos", type: 'success' });
      } catch (err: any) {
        console.error("Save error:", err);
        setToast({ message: "Cloud error, saving locally", type: 'error' });
        setWorkouts([normalizeWorkout(workoutToSave), ...workouts]);
      } finally {
        setIsSyncing(false);
      }
    } else {
      setWorkouts([normalizeWorkout(workoutToSave), ...workouts]);
      setToast({ message: "Saved locally", type: 'success' });
    }
    setActiveView('dashboard');
  };

  const deleteWorkout = async (id: string) => {
    if (supabase && session) {
      setIsSyncing(true);
      try {
        const { error } = await supabase.from('entrenos').delete().eq('entreno_id', id);
        if (error) throw error;
        setWorkouts(workouts.filter(w => w.id !== id));
        setToast({ message: "Workout deleted", type: 'success' });
      } catch (err) {
        setToast({ message: "Cloud delete failed", type: 'error' });
      } finally {
        setIsSyncing(false);
      }
    } else {
      setWorkouts(workouts.filter(w => w.id !== id));
      setToast({ message: "Deleted locally", type: 'success' });
    }
  };

  const handleUpdateProfiles = async (updatedProfiles: UserProfile[], nextId: string | null) => {
    setProfiles(updatedProfiles);
    setActiveUserId(nextId);

    if (supabase && session) {
      try {
        for (const profile of updatedProfiles) {
          // Upsert to "usuarios" table
          await supabase.from('usuarios').upsert({
            id: profile.id,
            user_id: session.user.id,
            name: profile.name,
            color: profile.color,
            last_used_at: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error("Profile sync error", err);
      }
    }
  };

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    window.location.reload();
  };

  if (isSupabaseConfigured && !session && activeView !== 'profiles') {
     return <AuthScreen />;
  }

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-slate-900 overflow-x-hidden font-sans">
      <header className="pt-8 pb-4 px-6 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent uppercase tracking-tighter">
            GYM TRACKER
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            {isSyncing ? (
              <RefreshCw size={10} className="text-emerald-400 animate-spin" />
            ) : (
              <Cloud size={10} className={isSupabaseConfigured ? "text-emerald-500" : "text-slate-600"} />
            )}
            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-[0.2em]">
              {isSyncing ? 'Syncing...' : isSupabaseConfigured ? 'Cloud Connected' : 'Local Only'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {session && (
            <button onClick={handleLogout} className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 active:scale-95 transition-all">
              <LogOut size={16} />
            </button>
          )}
          <button onClick={() => handleNavigate('profiles')} className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center overflow-hidden transition-transform active:scale-95 shadow-lg">
            {profiles.find(p => p.id === activeUserId)?.name.charAt(0) || <User size={18} />}
          </button>
        </div>
      </header>

      <main className="px-4 py-6 pb-32">
        {!isInitialized ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="text-emerald-500 animate-spin" size={32} />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Warming up...</p>
          </div>
        ) : initializationError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-6 text-center animate-in fade-in slide-in-from-top-4">
            <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
              <Database size={32} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-tight">Table not found</h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2 px-8 leading-relaxed">
                {initializationError}
              </p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-all"
            >
              <RefreshCw size={14} /> Retry Connection
            </button>
          </div>
        ) : (
          <>
            {activeView === 'dashboard' && <Dashboard workouts={activeUserWorkouts} onNavigate={handleNavigate} />}
            {activeView === 'history' && <HistoryView workouts={activeUserWorkouts} onDelete={deleteWorkout} dateFilter={historyDateFilter} onClearFilter={() => setHistoryDateFilter(null)} />}
            {activeView === 'log' && (
              <WorkoutLogger 
                onSave={addWorkout}
                onSaveTemplate={(t) => setTemplates([...templates, normalizeTemplate({...t, user_id: session?.user?.id || 'local'})])}
                onCancel={() => setActiveView('dashboard')} 
                previousWorkouts={activeUserWorkouts}
                templates={templates}
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
                currentAuthUserId={session?.user?.id || 'local'}
                onUpdate={handleUpdateProfiles} 
                customCategories={customCategories}
                onImportAll={() => {}}
                onClose={() => setActiveView('dashboard')}
                onToast={setToast}
              />
            )}
          </>
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
        <div className="fixed left-1/2 -translate-x-1/2 z-[9999] animate-toast pointer-events-auto w-full max-w-md px-5" style={{ bottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
          <div className="bg-slate-800/95 backdrop-blur-md border border-slate-700 rounded-2xl px-5 py-3 flex items-center gap-3 w-full justify-between shadow-2xl">
            <div className="flex items-center gap-3">
              {toast.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-400" /> : <AlertTriangle size={16} className="text-red-400" />}
              <span className="text-[10px] font-black text-white uppercase tracking-widest">{toast.message}</span>
            </div>
            <button onClick={() => setToastInternal(null)} className="p-1 text-slate-500 hover:text-white transition-colors"><X size={14} /></button>
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
