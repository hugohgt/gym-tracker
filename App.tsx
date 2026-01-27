
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LayoutDashboard, History, PlusCircle, BarChart3, User, Share, X, Timer as TimerIcon, CheckCircle2, AlertTriangle, Layers, Trophy, ShieldCheck, Download, LogOut, Cloud, Settings, RefreshCw, Loader2 } from 'lucide-react';
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
import { normalizeWorkout, normalizeTemplate, migrateState, loadState } from './storage/appStorage';

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
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 2. Fetch Initial Data from Supabase Tables
  useEffect(() => {
    if (!session || !isSupabaseConfigured) return;

    const fetchAllData = async () => {
      setIsSyncing(true);
      try {
        // Fetch Profiles
        const { data: profileData, error: pError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .order('last_used_at', { ascending: false });

        if (pError) throw pError;

        // Fetch Workouts
        const { data: workoutData, error: wError } = await supabase
          .from('workouts')
          .select('*')
          .eq('user_id', session.user.id)
          .order('date', { ascending: false });

        if (wError) throw wError;

        // Fetch Templates
        const { data: templateData, error: tError } = await supabase
          .from('templates')
          .select('*')
          .eq('user_id', session.user.id);

        if (tError) throw tError;

        const mappedProfiles = profileData || [];
        setProfiles(mappedProfiles);
        setWorkouts(workoutData || []);
        setTemplates(templateData || []);
        
        // Auto-select the last used profile
        if (mappedProfiles.length > 0) {
          setActiveUserId(mappedProfiles[0].id);
        }

        setCustomCategories([...MUSCLE_GROUPS]); // Fallback or fetch from a settings table
        setIsInitialized(true);
      } catch (err: any) {
        console.error("Fetch Error:", err.message);
        setToast({ message: "Failed to load cloud data", type: 'error' });
        // Fallback to local storage if DB fails
        const { state } = loadState();
        setWorkouts(state.workouts || []);
        setProfiles(state.profiles || []);
      } finally {
        setIsSyncing(false);
      }
    };

    fetchAllData();
  }, [session]);

  const activeUserWorkouts = useMemo(() => {
    if (!activeUserId) return [];
    return workouts
      .filter(w => w.profile_id === activeUserId || w.userId === activeUserId) // Support legacy keys during migration
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [workouts, activeUserId]);

  const handleNavigate = (view: ViewType, data?: any) => {
    if (view === 'history') setHistoryDateFilter(data || null);
    else setHistoryDateFilter(null);
    setActiveView(view);
  };

  // 3. Structured Data Sync Functions
  // Update signature to match WorkoutLogger's prop definition
  const addWorkout = async (newWorkout: Omit<Workout, 'userId' | 'user_id'>) => {
    if (!activeUserId || !session) {
      setToast({ message: "Profile error", type: 'error' });
      return;
    }

    setIsSyncing(true);
    const workoutToSave = {
      user_id: session.user.id,
      profile_id: activeUserId,
      date: newWorkout.date,
      title: newWorkout.title,
      type: newWorkout.type,
      quality: newWorkout.quality,
      exercises: newWorkout.exercises,
      notes: newWorkout.notes,
      duration: newWorkout.duration
    };

    try {
      const { data, error } = await supabase
        .from('workouts')
        .insert([workoutToSave])
        .select();

      if (error) throw error;

      setWorkouts([data[0], ...workouts]);
      setActiveView('dashboard');
      setToast({ message: "Workout synced to cloud", type: 'success' });
    } catch (err: any) {
      setToast({ message: "Sync failed. Saving locally.", type: 'error' });
      setWorkouts([normalizeWorkout({ ...newWorkout, profile_id: activeUserId, user_id: session.user.id }), ...workouts]);
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteWorkout = async (id: string) => {
    setIsSyncing(true);
    try {
      const { error } = await supabase.from('workouts').delete().eq('id', id);
      if (error) throw error;
      setWorkouts(workouts.filter(w => w.id !== id));
      setToast({ message: "Workout deleted", type: 'success' });
    } catch (err) {
      setToast({ message: "Delete failed", type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateProfiles = async (updatedProfiles: UserProfile[], nextId: string | null) => {
    setProfiles(updatedProfiles);
    setActiveUserId(nextId);

    // Sync profile changes to DB
    if (session && isSupabaseConfigured) {
      try {
        // This is a simplified bulk update. In production, consider individual upserts.
        for (const profile of updatedProfiles) {
          await supabase.from('profiles').upsert({
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
    if (isSupabaseConfigured) await supabase.auth.signOut();
    setIsInitialized(false);
    setWorkouts([]);
    setProfiles([]);
    setSession(null);
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
        <Settings size={48} className="text-amber-500 animate-spin-slow mb-6" />
        <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Configuration Error</h1>
        <p className="text-slate-400 text-sm uppercase font-bold tracking-widest max-w-xs leading-relaxed">
          Please check your Supabase environment variables in Vercel.
        </p>
      </div>
    );
  }

  if (!session) return <AuthScreen />;

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
              <Cloud size={10} className="text-emerald-500" />
            )}
            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-[0.2em]">
              {isSyncing ? 'Syncing...' : 'Cloud Connected'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleLogout}
            className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 active:scale-95 transition-all"
          >
            <LogOut size={16} />
          </button>
          <button 
            onClick={() => handleNavigate('profiles')}
            className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center overflow-hidden transition-transform active:scale-95 shadow-lg"
          >
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
        ) : (
          <>
            {activeView === 'dashboard' && <Dashboard workouts={activeUserWorkouts} onNavigate={handleNavigate} />}
            {activeView === 'history' && <HistoryView workouts={activeUserWorkouts} onDelete={deleteWorkout} dateFilter={historyDateFilter} onClearFilter={() => setHistoryDateFilter(null)} />}
            {activeView === 'log' && (
              <WorkoutLogger 
                onSave={addWorkout}
                onSaveTemplate={(t) => setTemplates([...templates, normalizeTemplate({...t, user_id: session.user.id})])}
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
                currentAuthUserId={session.user.id}
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
