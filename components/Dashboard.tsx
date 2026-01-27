
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Workout, ViewType, WorkoutType } from '../types';
import { ChevronRight, Flame, Trophy, Calendar as CalendarIcon, Zap, ChevronLeft, Dumbbell, Heart, Sparkles, Lightbulb } from 'lucide-react';

interface DashboardProps {
  workouts: Workout[];
  onNavigate: (view: ViewType, data?: any) => void;
  isNewPR?: boolean;
  onClearPRFlag?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ workouts, onNavigate, isNewPR, onClearPRFlag }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const touchStartX = useRef<number | null>(null);
  
  const lastWorkout = workouts[0];
  const workoutCount = workouts.length;

  // One-time animation trigger logic
  useEffect(() => {
    if (isNewPR) {
      const timer = setTimeout(() => {
        if (onClearPRFlag) onClearPRFlag();
      }, 2000); // Reset flag after animation completes
      return () => clearTimeout(timer);
    }
  }, [isNewPR, onClearPRFlag]);

  const getStreak = () => {
    if (workouts.length === 0) return 0;
    // Simple mock logic for streak based on recent workout density
    return Math.min(workouts.length, 5); 
  };

  const trainingDays = useMemo(() => {
    const days = new Set<string>();
    workouts.forEach(w => {
      days.add(new Date(w.date).toDateString());
    });
    return days;
  }, [workouts]);

  const calendarDays = useMemo(() => {
    const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const endOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    
    const days = [];
    for (let i = 0; i < startOfMonth.getDay(); i++) {
      days.push(null);
    }
    for (let i = 1; i <= endOfMonth.getDate(); i++) {
      days.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), i));
    }
    return days;
  }, [viewDate]);

  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchStartX.current - touchEndX;
    if (Math.abs(deltaX) > 50) {
      if (deltaX > 0) nextMonth();
      else prevMonth();
    }
    touchStartX.current = null;
  };

  const handleDayClick = (date: Date) => {
    if (trainingDays.has(date.toDateString())) {
      onNavigate('history', date.toISOString());
    }
  };

  const weeklyInsight = useMemo(() => {
    // If the user has never trained, do not show the insight card
    if (workouts.length === 0) return null;

    const now = new Date();
    // Monday as start of week
    const dayOfWeek = (now.getDay() + 6) % 7; 
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek);
    monday.setHours(0, 0, 0, 0);

    const workoutsThisWeek = workouts.filter(w => new Date(w.date) >= monday).length;

    const lastSessionDate = lastWorkout ? new Date(lastWorkout.date) : null;
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const isRecentlyActive = lastSessionDate && (
      lastSessionDate.toDateString() === now.toDateString() || 
      lastSessionDate.toDateString() === yesterday.toDateString()
    );

    // Messaging Logic based on frequency and recency
    if (workoutsThisWeek === 0) {
      return "No sessions yet this week. Ready to start?";
    }
    
    if (workoutsThisWeek === 1) {
      return "You’ve trained once this week. One more session to build consistency.";
    }

    if (workoutsThisWeek === 2 || workoutsThisWeek === 3) {
      if (isRecentlyActive) {
        return `You trained ${workoutsThisWeek} times this week. Keep the momentum.`;
      }
      return `You trained ${workoutsThisWeek} times this week. Keep it up.`;
    }

    if (workoutsThisWeek === 4) {
      return "Great consistency this week. 4 sessions completed.";
    }

    if (workoutsThisWeek === 5) {
      return "Strong week. You’ve trained 5 times so far.";
    }

    if (workoutsThisWeek >= 6) {
      return "Exceptional consistency this week. Remember to prioritize recovery.";
    }

    return null;
  }, [workouts, lastWorkout]);

  const monthName = viewDate.toLocaleString('en-US', { month: 'long' });
  const yearName = viewDate.getFullYear();

  const getTypeIcon = (type: WorkoutType) => {
    switch (type) {
      case 'strength': return <Dumbbell size={14} className="text-emerald-400" />;
      case 'cardio': return <Heart size={14} className="text-cyan-400" />;
      case 'mobility': return <Sparkles size={14} className="text-indigo-400" />;
      default: return <Zap size={14} />;
    }
  };

  const hasAnyPR = lastWorkout?.exercises.some(ex => ex.isPR);

  return (
    <div className="w-full max-w-[520px] mx-auto space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-3xl">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="text-orange-400 w-4 h-4" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Streak</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black">{getStreak()}</span>
            <span className="text-xs font-bold text-slate-500 uppercase">Days</span>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-3xl">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="text-yellow-400 w-4 h-4" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black">{workoutCount}</span>
            <span className="text-xs font-bold text-slate-500 uppercase">Sessions</span>
          </div>
        </div>
      </div>

      <div 
        className="bg-slate-800/40 border border-slate-700/60 p-5 rounded-[2rem] select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
            <CalendarIcon size={12} className="text-emerald-400" />
            Training Calendar
          </h3>
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="p-1 text-slate-500 hover:text-white transition-colors"><ChevronLeft size={16} /></button>
            <span className="text-[10px] font-black text-emerald-400 uppercase bg-emerald-400/10 px-2 py-0.5 rounded-full min-w-[100px] text-center">
              {monthName} {yearName}
            </span>
            <button onClick={nextMonth} className="p-1 text-slate-500 hover:text-white transition-colors"><ChevronRight size={16} /></button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-center">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
            <div key={d} className="text-[8px] font-black text-slate-600 pb-2">{d}</div>
          ))}
          {calendarDays.map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} />;
            
            const isToday = date.toDateString() === new Date().toDateString();
            const hasTrained = trainingDays.has(date.toDateString());
            
            return (
              <div 
                key={idx} 
                onClick={() => handleDayClick(date)}
                className={`aspect-square flex items-center justify-center text-[10px] font-bold rounded-xl transition-all relative
                  ${hasTrained ? 'bg-emerald-500 text-slate-900 shadow-[0_0_10px_rgba(16,185,129,0.3)] cursor-pointer active:scale-90' : 'text-slate-500'}
                  ${isToday ? 'ring-1 ring-emerald-500/50' : ''}
                  ${!hasTrained && isToday ? 'text-emerald-400' : ''}
                `}
              >
                {date.getDate()}
                {hasTrained && (
                  <div className="absolute -bottom-0.5 w-1 h-1 bg-white rounded-full opacity-50"></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {weeklyInsight && (
        <div className="bg-slate-800/40 border border-slate-700/60 p-5 rounded-[1.5rem] animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb size={14} className="text-amber-400" />
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Weekly Insight</h3>
          </div>
          <p className="text-sm font-medium text-slate-200 leading-relaxed">
            {weeklyInsight}
          </p>
        </div>
      )}

      <div>
        <div className="flex justify-between items-center mb-4 px-2">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            Recent Activity
          </h2>
          {lastWorkout && (
            <button onClick={() => onNavigate('history')} className="text-[10px] font-black text-emerald-400 uppercase tracking-wider hover:opacity-70">
              Logbook
            </button>
          )}
        </div>

        {lastWorkout ? (
          <div className="bg-slate-800/80 border border-slate-700 rounded-[2rem] p-5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 flex items-center gap-2">
              {getTypeIcon(lastWorkout.type)}
              {hasAnyPR ? (
                <div className={`flex items-center gap-1.5 bg-yellow-400/10 text-yellow-500 text-[8px] font-black px-2 py-0.5 rounded border border-yellow-500/20 uppercase tracking-tighter ${isNewPR ? 'animate-pr-delight' : ''}`}>
                  <Trophy size={8} className="fill-current" />
                  New Record
                </div>
              ) : (
                <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-black px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-tighter">Verified Session</span>
              )}
            </div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-black text-slate-100 uppercase tracking-tight">{lastWorkout.title}</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {new Date(lastWorkout.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              {lastWorkout.exercises.slice(0, 3).map((ex, idx) => (
                <div key={idx} className="flex justify-between items-center bg-slate-900/40 px-3 py-2 rounded-xl border border-slate-700/30">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-300 font-bold uppercase tracking-tight">{ex.name}</span>
                    {ex.isPR && <Trophy size={10} className={`text-yellow-500 fill-current ${isNewPR ? 'animate-pr-delight' : ''}`} style={{ animationDelay: `${0.1 * idx}s` }} />}
                  </div>
                  <span className="text-[10px] font-black text-emerald-400/80 bg-emerald-400/5 px-2 py-0.5 rounded border border-emerald-400/10">
                    {ex.sets.length} SETS
                  </span>
                </div>
              ))}
              {lastWorkout.exercises.length > 3 && (
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center pt-2">
                  + {lastWorkout.exercises.length - 3} More Exercises
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex justify-center w-full">
            <div className="w-full bg-slate-800/30 border-2 border-dashed border-slate-700/60 rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="w-20 h-20 rounded-3xl bg-slate-900/50 border border-slate-700/50 flex items-center justify-center mb-6 shadow-xl">
                <Zap className="text-slate-600 w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-100 uppercase tracking-widest mb-2">Zero Activity Found</h3>
              <p className="text-[10px] text-slate-500 font-bold mb-10 uppercase tracking-[0.2em] max-w-[200px] leading-relaxed">
                Your transformation journey is waiting for its first entry.
              </p>
              <button 
                onClick={() => onNavigate('log')}
                className="w-full max-w-[220px] py-4 bg-emerald-500 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-[0.98] transition-all shadow-[0_15px_30px_rgba(16,185,129,0.25)] mx-auto"
              >
                Start First Workout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
