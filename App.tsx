
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LayoutDashboard, History, PlusCircle, BarChart3, User, X, Timer as TimerIcon, CheckCircle2, AlertTriangle, LogOut, Cloud, RefreshCw, Loader2, Database, WifiOff } from 'lucide-react';
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
import { normalizeWorkout, normalizeTemplate } from './storage/appStorage';
import * as syncQueue from './storage/syncQueue';

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
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const setToast = useCallback((t: {message: string, type: 'success' | 'error'} | null) => {
    if (!t) { setToastInternal(null); return; }
    setToastInternal({ ...t, id: Date.now() });
    setTimeout(() => setToastInternal(null), 3000);
  }, []);

  // 1. Unified Auth Listener (Source of Truth)
  useEffect(() => {
    if (!supabase) {
      setIsInitialized(true);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) setIsInitialized(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === 'SIGNED_OUT') {
        setWorkouts([]);
        setTemplates([]);
        setActiveProfile(null);
        setInitializationError(null);
        setActiveView('dashboard');
        setIsInitialized(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Sync Logic
  const syncPendingWorkouts = useCallback(async () => {
    if (!supabase || !session || !navigator.onLine) return;
    
    const pending = await syncQueue.listQueuedWorkouts();
    if (pending.length === 0) return;

    setIsSyncing(true);
    try {
      for (const item of pending) {
        // Migration logic: Rename client_id to usuario_id if present (client_id is removed from schema)
        const workoutUserId = item.usuario_id || item.user_id || session.user.id;

        const fullData = {
          exercises: item.exercises,
          type: item.type,
          quality: item.quality,
          notes: item.notes,
          profile_id: item.profile_id
        };

        const payload = {
          entreno_id: item.id,
          usuario_id: workoutUserId,
          nombre_rutina: item.title,
          fecha: item.date,
          duracion_minutos: item.duration || 0,
          payload: fullData,
          observaciones: fullData // Ensure observaciones contains the full JSON object
        };

        console.log("Syncing pending workout payload:", payload);
        const { error } = await supabase.from('entrenos').insert([payload]);
        // If success or duplicate key, remove from local queue
        if (!error || error.code === '23505') {
          await syncQueue.removeQueuedWorkout(item.id);
        } else {
          console.error("Sync item failed:", error);
          // If it's a 400 bad request, we shouldn't retry it indefinitely
          if (error.status === 400) {
             console.error("Sync: Invalid data (400) for item", item.id);
             await syncQueue.removeQueuedWorkout(item.id);
          }
        }
      }
      
      const { data } = await supabase
        .from('entrenos')
        .select('*')
        .eq('usuario_id', session.user.id)
        .order('fecha', { ascending: false });
      
      if (data) {
        setWorkouts(data.map(raw => {
          const extra = raw.payload || {};
          return {
            id: raw.entreno_id,
            user_id: raw.usuario_id,
            profile_id: extra.profile_id || activeProfile?.id, 
            date: raw.fecha,
            title: raw.nombre_rutina,
            duration: raw.duracion_minutos,
            exercises: extra.exercises || [],
            type: extra.type || 'strength',
            quality: extra.quality || 'normal',
            notes: extra.notes || raw.observaciones?.notes || ''
          };
        }));
      }
    } catch (e) {
      console.error("Sync process failed", e);
    } finally {
      setIsSyncing(false);
    }
  }, [session, activeProfile]);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); syncPendingWorkouts(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (session) syncPendingWorkouts();
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [session, syncPendingWorkouts]);

  // 3. Data Synchronization & Profile Bootstrapping
  useEffect(() => {
    if (!session) return;
    const syncAccount = async () => {
      if (!supabase) return;
      setIsSyncing(true);
      try {
        let { data: pData } = await supabase.from('usuarios').select('*').eq('usuario_id', session.user.id).maybeSingle();
        if (!pData) {
          const { data: created } = await supabase.from('usuarios').insert([{
            usuario_id: session.user.id,
            name: (session.user.email?.split('@')[0] || 'User'),
            color: '#10b981',
            last_used_at: new Date().toISOString()
          }]).select().single();
          pData = created;
        }
        const profile: UserProfile = { ...pData, user_id: pData.usuario_id };
        setActiveProfile(profile);

        const { data: wData } = await supabase.from('entrenos').select('*').eq('usuario_id', session.user.id).order('fecha', { ascending: false });
        setWorkouts((wData || []).map(raw => {
          const extra = raw.payload || raw.observaciones || {};
          return {
            id: raw.entreno_id,
            user_id: raw.usuario_id,
            profile_id: extra.profile_id || profile.id, 
            date: raw.fecha,
            title: raw.nombre_rutina,
            duration: raw.duracion_minutos,
            exercises: extra.exercises || [],
            type: extra.type || 'strength',
            quality: extra.quality || 'normal',
            notes: extra.notes || ''
          };
        }));
        setCustomCategories([...MUSCLE_GROUPS]);
      } catch (err: any) {
        console.error("Account sync error", err);
      } finally {
        setIsInitialized(true);
        setIsSyncing(false);
      }
    };
    syncAccount();
  }, [session]);

  const addWorkout = async (newWorkout: Omit<Workout, 'user_id' | 'profile_id'>) => {
    if (!activeProfile || !session) {
      setToast({ message: "Authentication required", type: 'error' });
      return;
    }

    const workoutId = crypto.randomUUID();
    const workoutToSave: Workout = { 
      ...newWorkout, 
      id: workoutId, 
      profile_id: activeProfile.id,
      user_id: session.user.id 
    };

    const fullData = {
      exercises: workoutToSave.exercises,
      type: workoutToSave.type,
      quality: workoutToSave.quality,
      notes: workoutToSave.notes,
      profile_id: activeProfile.id 
    };

    const dbPayload = {
      entreno_id: workoutId,
      usuario_id: session.user.id,
      nombre_rutina: workoutToSave.title,
      fecha: workoutToSave.date,
      duracion_minutos: workoutToSave.duration || 0,
      payload: fullData,
      observaciones: fullData // Ensure observaciones is the JSON object
    };

    setIsSyncing(true);
    console.log("Saving workout to Supabase. Request Body:", dbPayload);

    try {
      const { error } = await supabase!.from('entrenos').insert([dbPayload]);
      
      if (error) {
        console.error("Supabase Operation Failed:", {
          status: error.status,
          code: error.code,
          message: error.message,
          details: error.details
        });

        // Auth Errors
        if (error.status === 401 || error.status === 403) {
          setToast({ message: error.status === 401 ? "Session expired. Re-login." : "Permission denied.", type: 'error' });
          setIsSyncing(false);
          return;
        }

        // Schema / Validation Errors (400) - DO NOT label as offline
        if (error.status === 400) {
          setToast({ message: `Sync failed (invalid data): ${error.message}`, type: 'error' });
          setIsSyncing(false);
          return;
        }

        // Other Server Errors
        if (error.status) {
          setToast({ message: `Server error (${error.status})`, type: 'error' });
          setIsSyncing(false);
          return;
        }

        // No status implies a network/offline failure
        throw error;
      }

      // Success Path
      setWorkouts(prev => [workoutToSave, ...prev]);
      setToast({ message: "Workout synced", type: 'success' });
      setActiveView('dashboard');
    } catch (err: any) {
      // Offline fallback for real network issues
      console.warn("Offline fallback triggered:", err);
      await syncQueue.queueWorkout(workoutToSave).catch(() => {});
      setWorkouts(prev => [workoutToSave, ...prev]);
      setToast({ message: "Saved locally. Sync later.", type: 'success' });
      setActiveView('dashboard');
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteWorkout = async (id: string) => {
    if (!supabase || !session) return;
    setIsSyncing(true);
    try {
      const { error } = await supabase.from('entrenos').delete().eq('entreno_id', id).eq('usuario_id', session.user.id);
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
    if (!supabase || !session) return;
    setActiveProfile(updated);
    try {
      await supabase.from('usuarios').update({ name: updated.name, color: updated.color }).eq('usuario_id', session.user.id);
      setToast({ message: "Account updated", type: 'success' });
    } catch (err) { console.error("Profile update error", err); }
  };

  const handleLogout = async () => { if (supabase) await supabase.auth.signOut(); };

  if (isSupabaseConfigured && !session && isInitialized) return <AuthScreen />;

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-slate-900 overflow-x-hidden font-sans">
      <header className="pt-8 pb-4 px-6 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent uppercase tracking-tighter">GYM TRACKER</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            {isSyncing ? <RefreshCw size={10} className="text-emerald-400 animate-spin" /> : 
             !isOnline ? <WifiOff size={10} className="text-amber-500" /> :
             <Cloud size={10} className="text-emerald-500" />}
            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-[0.2em]">
              {isSyncing ? 'Syncing...' : !isOnline ? 'Offline Mode' : 'Encrypted Cloud'}
            </p>
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
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Identifying Account...</p>
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
                isSaving={isSyncing}
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
