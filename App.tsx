
import React, { useState, useEffect } from 'react';
import { Layout, LayoutDashboard, History, PlusCircle, BrainCircuit, BarChart3, ChevronRight, Dumbbell, Trash2, CheckCircle2, X, Timer as TimerIcon, User } from 'lucide-react';
import { Workout, ViewType, Exercise, Set as WorkoutSet, MUSCLE_GROUPS, UserProfile } from './types';
import Dashboard from './components/Dashboard';
import HistoryView from './components/HistoryView';
import WorkoutLogger from './components/WorkoutLogger';
import AICoach from './components/AICoach';
import Analytics from './components/Analytics';
import TimerView from './components/TimerView';
import ProfileSwitcher from './components/ProfileSwitcher';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Helper to sort workouts by date newest first
  const sortWorkouts = (list: Workout[]) => {
    return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // Load basic global data (profiles, active user)
  useEffect(() => {
    const savedProfiles = localStorage.getItem('ironlog_profiles');
    const savedActiveUserId = localStorage.getItem('ironlog_active_user');
    
    if (savedProfiles) {
      const parsed = JSON.parse(savedProfiles);
      setProfiles(parsed);
      if (savedActiveUserId) {
        setActiveUserId(savedActiveUserId);
      } else if (parsed.length > 0) {
        setActiveUserId(parsed[0].id);
      }
    }

    const savedCategories = localStorage.getItem('ironlog_categories');
    if (savedCategories) {
      setCustomCategories(JSON.parse(savedCategories));
    } else {
      setCustomCategories([...MUSCLE_GROUPS]);
    }
    
    setIsInitialized(true);
  }, []);

  // Load user-specific workouts whenever activeUserId changes
  useEffect(() => {
    if (activeUserId) {
      const userWorkoutsKey = `ironlog_workouts_${activeUserId}`;
      const savedWorkouts = localStorage.getItem(userWorkoutsKey);
      if (savedWorkouts) {
        setWorkouts(sortWorkouts(JSON.parse(savedWorkouts)));
      } else {
        setWorkouts([]);
      }
    }
  }, [activeUserId]);

  // Persist global state
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('ironlog_profiles', JSON.stringify(profiles));
      if (activeUserId) localStorage.setItem('ironlog_active_user', activeUserId);
      localStorage.setItem('ironlog_categories', JSON.stringify(customCategories));
    }
  }, [profiles, activeUserId, customCategories, isInitialized]);

  // Persist workouts specifically for the active user
  useEffect(() => {
    if (isInitialized && activeUserId) {
      localStorage.setItem(`ironlog_workouts_${activeUserId}`, JSON.stringify(workouts));
    }
  }, [workouts, activeUserId, isInitialized]);

  // Fix: addWorkout now correctly typed to handle workouts before userId is assigned
  const addWorkout = (newWorkout: Omit<Workout, 'userId'>) => {
    if (!activeUserId) return;
    
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
      // Logic for switching user handled by useEffect above
      setActiveView('dashboard');
    }
  };

  const activeUser = profiles.find(p => p.id === activeUserId);

  if (isInitialized && profiles.length === 0) {
    return (
      <ProfileSwitcher 
        profiles={profiles} 
        activeUserId={activeUserId} 
        onUpdate={handleProfileUpdate} 
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
          onClose={() => setActiveView('dashboard')}
        />
      );
    }

    switch (activeView) {
      case 'dashboard':
        return <Dashboard workouts={workouts} onNavigate={setActiveView} />;
      case 'history':
        return <HistoryView workouts={workouts} onDelete={deleteWorkout} />;
      case 'log':
        return (
          <WorkoutLogger 
            onSave={addWorkout} 
            onCancel={() => setActiveView('dashboard')} 
            previousWorkouts={workouts}
            availableCategories={customCategories}
            onAddCategory={handleAddCategory}
          />
        );
      case 'ai':
        return <AICoach workouts={workouts} />;
      case 'stats':
        return <Analytics workouts={workouts} />;
      case 'timer':
        return <TimerView />;
      default:
        return <Dashboard workouts={workouts} onNavigate={setActiveView} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-slate-900">
      {/* Header */}
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

      {/* Main Content Area */}
      <main className="px-4 py-6 pb-32">
        {renderView()}
      </main>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 flex justify-around items-center px-4 py-4 safe-bottom z-50">
        <NavButton 
          active={activeView === 'dashboard'} 
          icon={<LayoutDashboard size={24} />} 
          label="Home" 
          onClick={() => setActiveView('dashboard')} 
        />
        <NavButton 
          active={activeView === 'history'} 
          icon={<History size={24} />} 
          label="Log" 
          onClick={() => setActiveView('history')} 
        />
        <div className="relative -top-6">
          <button 
            onClick={() => setActiveView('log')}
            className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/20 flex items-center justify-center text-white border-4 border-slate-900 active:scale-95 transition-transform"
          >
            <PlusCircle size={32} />
          </button>
        </div>
        <NavButton 
          active={activeView === 'timer'} 
          icon={<TimerIcon size={24} />} 
          label="Timer" 
          onClick={() => setActiveView('timer')} 
        />
        <NavButton 
          active={activeView === 'stats'} 
          icon={<BarChart3 size={24} />} 
          label="Stats" 
          onClick={() => setActiveView('stats')} 
        />
      </nav>
    </div>
  );
};

const NavButton: React.FC<{active: boolean, icon: React.ReactNode, label: string, onClick: () => void}> = ({active, icon, label, onClick}) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 min-w-[60px] transition-colors ${active ? 'text-emerald-400' : 'text-slate-500'}`}
  >
    {icon}
    <span className="text-[10px] font-bold tracking-wider uppercase">{label}</span>
  </button>
);

export default App;
