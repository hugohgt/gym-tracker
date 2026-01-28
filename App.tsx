
import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, History, PlusCircle, BarChart3, User, X, Timer as TimerIcon, CheckCircle2, AlertTriangle, LogOut, Cloud, RefreshCw, Loader2, Database } from 'lucide-react';
import { Workout, ViewType, UserProfile, MUSCLE_GROUPS, WorkoutTemplate } from './types';
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

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(null);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [toast, setToastInternal] = useState<{message: string, type: 'success'|'error', id: number} | null>(null);
  const [historyDateFilter, setHistoryDateFilter] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const setToast = (t: {message: string, type: 'success' | 'error'} | null) => {
    if (!t) { setToastInternal(null); return; }
    setToastInternal({ ...t, id: Date.now() });
    setTimeout(() => setToastInternal(null), 3000);
  };

  // 1. Unified Auth & State Management
  useEffect(() => {
    if (!supabase) {
      setIsInitialized(true);
      return;
    }

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) setIsInitialized(true);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      
      if (event === 'SIGNED_OUT') {
        // Clear all user data on logout
        setWorkouts([]);
        setTemplates([]);
        setActiveProfile(null);
        setInitializationError(null);
        setActiveView('dashboard');
        setIsInitialized(true);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setInitializationError(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Automated Profile Onboarding & Sync
  useEffect(() => {
    if (!session) {
      // Local fallback logic if not configured/logged in
      if (!isSupabaseConfigured) {
        const { state } = loadState();
        setWorkouts(state.workouts || []);
        setTemplates(state.templates || []);
        setCustomCategories(state.customCategories || [...MUSCLE_GROUPS]);
        setIsInitialized(true);
      }
      return;
    }

    const syncAccount = async () => {
      if (!supabase) return;
      setIsSyncing(true);
      try {
        // Fetch the profile for this account (Strict RLS: usuario_id = auth.uid())
        let { data: pData, error: pError } = await supabase
          .from('usuarios')
          .select('*')
          .eq('usuario_id', session.user.id)
          .maybeSingle();

        if (pError) throw pError;

        // BOOTSTRAP: Auto-create profile if missing
        if (!pData) {
          const defaultName = session.user.email?.split('@')[0] || 'Trainer';
          const { data: created, error: createError } = await supabase
            .from('usuarios')
            .insert([{
              id: Math.random().toString(36).substr(2, 9),
              usuario_id: session.user.id,
              name: defaultName.charAt(0).toUpperCase() + defaultName.slice(1),
              color: '#10b981',
              last_used_at: new Date().toISOString()
            }])
            .select()
            .single();
          
          if (createError) throw createError;
          pData = created;
        }

        const profile: UserProfile = { ...pData, user_id: pData.usuario_id };
        setActiveProfile(profile);

        // Fetch user's workouts
        const { data: wData, error: wError } = await supabase
          .from('entrenos')
          .select('*')
          .eq('usuario_id', session.user.id)
          .order('fecha', { ascending: false });

        if (wError) throw wError;

        const mappedWorkouts: Workout[] = (wData || []).map(raw => {
          let obs: any = {};
          try { obs = JSON.parse(raw.observaciones || '{}'); } catch { obs = { notes: raw.observaciones }; }
          return {
            id: raw.entreno_id,
            user_id: raw.usuario_id,
            profile_id: profile.id, 
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
        setCustomCategories([...MUSCLE_GROUPS]);
        setIsInitialized(true);
      } catch (err: any) {
        console.error("Account Sync Error:", err.message);
        setInitializationError(err.message.includes('not found') ? "Cloud tables not detected. Check schema." : "Sync failed.");
        setIsInitialized(true);
      } finally {
        setIsSyncing(false);
      }
    };

    syncAccount();
  }, [session]);

  const addWorkout = async (newWorkout: Omit<Workout, 'userId' | 'user_id' | 'profile_id'>) => {
    // FRESH SESSION CHECK: Prevent stale closure errors
    let currentSession = session;
    if (!currentSession && supabase) {
      const { data } = await supabase.auth.getSession();
      currentSession = data.session;
    }

    if (!currentSession || !activeProfile) {
      setToast({ message: "Please sign in to save", type: 'error' });
      setActiveView('dashboard');
      return;
    }

    const workoutId = Math.random().toString(36).substr(2, 9);
    const workoutToSave: Workout = { 
      ...newWorkout, 
      id: workoutId, 
      profile_id: activeProfile.id,
      user_id: currentSession.user.id 
    };

    setIsSyncing(true);
    try {
      const payload = {
        entreno_id: workoutId,
        usuario_id: currentSession.user.id,
        nombre_rutina: workoutToSave.title,
        fecha: workoutToSave.date,
        duracion_minutos: workoutToSave.duration || 0,
        observaciones: JSON.stringify({
          exercises: workoutToSave.exercises,
          type: workoutToSave.type,
          quality: workoutToSave.quality,
          notes: workoutToSave.notes,
          profile_id: activeProfile.id 
        })
      };

      const { error } = await supabase!.from('entrenos').insert([payload]);
      if (error) throw error;
      
      setWorkouts([workoutToSave, ...workouts]);
      setToast({ message: "Workout saved", type: 'success' });
    } catch (err: any) {
      setToast({ message: "Save failed - RLS or Network error", type: 'error' });
      // Don't save locally if auth failed to keep data integrity
    } finally {
      setIsSyncing(false);
    }
    setActiveView('dashboard');
  };

  const deleteWorkout = async (id: string) => {
    if (!supabase || !session) return;
    setIsSyncing(true);
    try {
      const { error } = await supabase.from('entrenos').delete().eq('entreno_id', id);
      if (error) throw error;
      setWorkouts(workouts.filter(w => w.id !== id));
      setToast({ message: "Entry removed", type: 'success' });
    } catch {
      setToast({ message: "Delete failed", type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateProfile = async (updated: UserProfile) => {
    setActiveProfile(updated);
    if (supabase && session) {
      try {
        await supabase.from('usuarios').upsert({
          id: updated.id,
          usuario_id: session.user.id,
          name: updated.name,
          color: updated.color,
          last_used_at: new Date().toISOString()
        });
        setToast({ message: "Profile updated", type: 'success' });
      } catch (err) { console.error("Update error", err); }
    }
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      // Logic inside useEffect(onAuthStateChange) will handle state cleanup
    }
  };

  // 3. Conditional Rendering based on Auth
  if (isSupabaseConfigured && !session && isInitialized) {
    return <AuthScreen />;
  }

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-slate-900 overflow-x-hidden font-sans">
      <header className="pt-8 pb-4 px-6 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent uppercase tracking-tighter">GYM TRACKER</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            {isSyncing ? <RefreshCw size={10} className="text-emerald-400 animate-spin" /> : <Cloud size={10} className="text-emerald-500" />}
            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-[0.2em]">{isSyncing ? 'Syncing...' : 'Account Secure'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {session && (
            <button onClick={handleLogout} className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 active:scale-95 transition-all"><LogOut size={16} /></button>
          )}
          <button onClick={() => setActiveView('profiles')} className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center overflow-hidden transition-transform active:scale-95 shadow-lg">
            {activeProfile ? (
              <div className="w-full h-full flex items-center justify-center font-black text-white" style={{ backgroundColor: activeProfile.color }}>
                {activeProfile.name.charAt(0)}
              </div>
            ) : <User size={18} />}
          </button>
        </div>
      </header>

      <main className="px-4 py-6 pb-32">
        {!isInitialized ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="text-emerald-500 animate-spin" size={32} />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Verifying Session...</p>
          </div>
        ) : initializationError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
            <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500"><Database size={32} /></div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-tight">Sync Failure</h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2 px-8 leading-relaxed">{initializationError}</p>
            </div>
            <button onClick={() => window.location.reload()} className="px-6 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-all"><RefreshCw size={14} /> Retry Sync</button>
          </div>
        ) : (
          <>
            {activeView === 'dashboard' && <Dashboard workouts={workouts} onNavigate={(v, d) => { if(v === 'history') setHistoryDateFilter(d); setActiveView(v); }} />}
            {activeView === 'history' && <HistoryView workouts={workouts} onDelete={deleteWorkout} dateFilter={historyDateFilter} onClearFilter={() => setHistoryDateFilter(null)} />}
            {activeView === 'log' && (
              <WorkoutLogger 
                onSave={addWorkout}
                onSaveTemplate={(t) => setTemplates([...templates, normalizeTemplate({...t, user_id: session?.user?.id})])}
                onCancel={() => setActiveView('dashboard')} 
                previousWorkouts={workouts}
                templates={templates}
                availableCategories={customCategories}
                onAddCategory={(cat) => setCustomCategories([...customCategories, cat])}
                onToast={setToast}
              />
            )}
            {activeView === 'stats' && <Analytics workouts={workouts} />}
            {activeView === 'timer' && <TimerView />}
            {activeView === 'ai' && <AICoach workouts={workouts} />}
            {activeView === 'profiles' && activeProfile && (
              <ProfileSwitcher 
                profile={activeProfile}
                workouts={workouts}
                templates={templates}
                customCategories={customCategories}
                onUpdate={handleUpdateProfile} 
                onClose={() => setActiveView('dashboard')}
                onToast={setToast}
              />
            )}
          </>
        )}
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
