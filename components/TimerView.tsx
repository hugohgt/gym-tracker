
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Timer as TimerIcon, Hourglass, Bell, AlertCircle, Zap, ShieldAlert, Trophy, Minus, Plus } from 'lucide-react';

type TimerMode = 'rest' | 'stopwatch' | 'tabata';
type TabataPhase = 'idle' | 'ready' | 'work' | 'rest' | 'done';

const TimerView: React.FC = () => {
  const [mode, setMode] = useState<TimerMode>('rest');
  
  // Rest Timer State
  const [restTime, setRestTime] = useState(60);
  const [initialRestTime, setInitialRestTime] = useState(60);
  const [isRestRunning, setIsRestRunning] = useState(false);
  const [restCompleted, setRestCompleted] = useState(false);
  
  // Stopwatch State
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);

  // Tabata Settings
  const [tabataWork, setTabataWork] = useState(20);
  const [tabataRest, setTabataRest] = useState(10);
  const [tabataTotalRounds, setTabataTotalRounds] = useState(8);

  // Tabata Progress
  const [tabataPhase, setTabataPhase] = useState<TabataPhase>('idle');
  const [tabataCurrentRound, setTabataCurrentRound] = useState(1);
  const [tabataTime, setTabataTime] = useState(0);
  const [isTabataRunning, setIsTabataRunning] = useState(false);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Handle Rest Timer
  useEffect(() => {
    if (mode === 'rest' && isRestRunning && restTime > 0) {
      timerRef.current = setInterval(() => {
        setRestTime((prev) => prev - 1);
      }, 1000);
    } else if (mode === 'rest' && restTime === 0 && isRestRunning) {
      setIsRestRunning(false);
      setRestCompleted(true);
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRestRunning, restTime, mode]);

  // Handle Stopwatch
  useEffect(() => {
    if (mode === 'stopwatch' && isStopwatchRunning) {
      timerRef.current = setInterval(() => {
        setStopwatchTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isStopwatchRunning, mode]);

  // Handle Tabata logic
  useEffect(() => {
    if (mode === 'tabata' && isTabataRunning && tabataTime > 0) {
      timerRef.current = setInterval(() => {
        setTabataTime((prev) => prev - 1);
      }, 1000);
    } else if (mode === 'tabata' && isTabataRunning && tabataTime === 0) {
      // Transition logic
      if (tabataPhase === 'ready') {
        setTabataPhase('work');
        setTabataTime(tabataWork);
      } else if (tabataPhase === 'work') {
        if (tabataRest > 0) {
          setTabataPhase('rest');
          setTabataTime(tabataRest);
        } else {
          handleTabataRoundEnd();
        }
      } else if (tabataPhase === 'rest') {
        handleTabataRoundEnd();
      }
      
      if ('vibrate' in navigator) navigator.vibrate(100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isTabataRunning, tabataTime, tabataPhase, mode]);

  const handleTabataRoundEnd = () => {
    if (tabataCurrentRound < tabataTotalRounds) {
      setTabataCurrentRound(prev => prev + 1);
      setTabataPhase('work');
      setTabataTime(tabataWork);
    } else {
      setTabataPhase('done');
      setIsTabataRunning(false);
      if ('vibrate' in navigator) navigator.vibrate([300, 100, 300]);
    }
  };

  const startTabata = () => {
    if (tabataPhase === 'idle' || tabataPhase === 'done') {
      setTabataPhase('ready');
      setTabataTime(5); // 5s Get Ready
      setTabataCurrentRound(1);
    }
    setIsTabataRunning(true);
  };

  const handleTabataReset = () => {
    setIsTabataRunning(false);
    setTabataPhase('idle');
    setTabataTime(0);
    setTabataCurrentRound(1);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRestReset = () => {
    setIsRestRunning(false);
    setRestTime(initialRestTime);
    setRestCompleted(false);
  };

  const handleStopwatchReset = () => {
    setIsStopwatchRunning(false);
    setStopwatchTime(0);
  };

  const handlePreset = (seconds: number) => {
    setIsRestRunning(false);
    setInitialRestTime(seconds);
    setRestTime(seconds);
    setRestCompleted(false);
  };

  const handleTabataPreset = (work: number, rest: number) => {
    handleTabataReset();
    setTabataWork(work);
    setTabataRest(rest);
    setTabataTotalRounds(8);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6 flex flex-col items-center">
      {/* Segmented Control */}
      <div className="flex bg-slate-800/50 p-1 rounded-2xl border border-slate-700/50 w-full">
        <button 
          onClick={() => { setMode('rest'); setIsTabataRunning(false); setIsStopwatchRunning(false); }}
          className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
            mode === 'rest' ? 'bg-emerald-500 text-slate-900 shadow-lg' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Hourglass size={12} />
          Rest
        </button>
        <button 
          onClick={() => { setMode('tabata'); setIsRestRunning(false); setIsStopwatchRunning(false); }}
          className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
            mode === 'tabata' ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Zap size={12} />
          Tabata
        </button>
        <button 
          onClick={() => { setMode('stopwatch'); setIsRestRunning(false); setIsTabataRunning(false); }}
          className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
            mode === 'stopwatch' ? 'bg-cyan-500 text-slate-900 shadow-lg' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <TimerIcon size={12} />
          Stopwatch
        </button>
      </div>

      {mode === 'rest' && (
        <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-slate-800/40 border border-slate-700/60 p-10 rounded-[3rem] flex flex-col items-center justify-center shadow-xl relative overflow-hidden group">
            <div className={`absolute inset-0 transition-opacity duration-1000 ${restCompleted ? 'bg-emerald-500/10 opacity-100' : 'opacity-0'}`}></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Remaining Rest</span>
            <div className={`text-7xl font-black transition-all ${restCompleted ? 'text-emerald-400 scale-110' : 'text-white'}`}>
              {formatTime(restTime)}
            </div>
            {restCompleted && (
              <div className="flex items-center gap-2 mt-4 text-emerald-400 font-black text-xs uppercase tracking-widest animate-bounce">
                <Bell size={14} /> Ready for next set!
              </div>
            )}
          </div>
          <div className="flex justify-center items-center gap-6">
            <button onClick={handleRestReset} className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-90">
              <RotateCcw size={24} />
            </button>
            <button onClick={() => setIsRestRunning(!isRestRunning)} className={`w-20 h-20 rounded-full flex items-center justify-center text-slate-900 transition-all active:scale-95 shadow-lg ${isRestRunning ? 'bg-rose-500 shadow-rose-500/20' : 'bg-emerald-500 shadow-emerald-500/20'}`}>
              {isRestRunning ? <Pause size={32} /> : <Play size={32} fill="currentColor" className="ml-1" />}
            </button>
            <div className="w-14" />
          </div>
          <div className="grid grid-cols-5 gap-2 px-1">
            {[30, 60, 90, 120, 180].map((s) => (
              <button key={s} onClick={() => handlePreset(s)} className={`py-3.5 rounded-xl border text-[9px] font-black uppercase tracking-tight transition-all ${initialRestTime === s ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-800/40 border-slate-700 text-slate-500 hover:border-slate-500'}`}>
                {s}s
              </button>
            ))}
          </div>
          <div className="bg-slate-900/40 p-4 rounded-2xl border border-dashed border-slate-800 flex items-center gap-3">
            <AlertCircle size={16} className="text-slate-600" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tip: Rest 60-90s for hypertrophy, 2-3m for strength.</p>
          </div>
        </div>
      )}

      {mode === 'stopwatch' && (
        <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-slate-800/40 border border-slate-700/60 p-10 rounded-[3rem] flex flex-col items-center justify-center shadow-xl">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Elapsed Time</span>
            <div className={`text-7xl font-black text-cyan-400 font-mono`}>
              {formatTime(stopwatchTime)}
            </div>
          </div>
          <div className="flex justify-center items-center gap-6">
            <button onClick={handleStopwatchReset} className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-90">
              <RotateCcw size={24} />
            </button>
            <button onClick={() => setIsStopwatchRunning(!isStopwatchRunning)} className={`w-20 h-20 rounded-full flex items-center justify-center text-slate-900 transition-all active:scale-95 shadow-lg ${isStopwatchRunning ? 'bg-rose-500 shadow-rose-500/20' : 'bg-cyan-500 shadow-cyan-500/20'}`}>
              {isStopwatchRunning ? <Pause size={32} /> : <Play size={32} fill="currentColor" className="ml-1" />}
            </button>
            <div className="w-14" />
          </div>
        </div>
      )}

      {mode === 'tabata' && (
        <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-2">
          {/* Main Tabata Display */}
          <div className="bg-slate-800/40 border border-slate-700/60 p-8 rounded-[3rem] flex flex-col items-center justify-center shadow-xl relative overflow-hidden">
            {/* Background Glow based on phase */}
            <div className={`absolute inset-0 transition-all duration-700 opacity-20 ${
              tabataPhase === 'ready' ? 'bg-amber-500' :
              tabataPhase === 'work' ? 'bg-emerald-500' :
              tabataPhase === 'rest' ? 'bg-cyan-500' :
              tabataPhase === 'done' ? 'bg-yellow-400' : 'transparent'
            }`}></div>

            <div className="relative z-10 flex flex-col items-center">
              <span className={`text-[10px] font-black uppercase tracking-[0.4em] mb-2 ${
                tabataPhase === 'ready' ? 'text-amber-400' :
                tabataPhase === 'work' ? 'text-emerald-400' :
                tabataPhase === 'rest' ? 'text-cyan-400' :
                tabataPhase === 'done' ? 'text-yellow-400' : 'text-slate-500'
              }`}>
                {tabataPhase === 'idle' ? 'Ready to Start' : tabataPhase.replace('_', ' ')}
              </span>

              <div className={`text-7xl font-black transition-all font-mono ${
                tabataPhase === 'work' ? 'text-white' : 'text-slate-200'
              }`}>
                {tabataPhase === 'idle' ? '00:00' : formatTime(tabataTime)}
              </div>

              <div className="mt-4 flex items-center gap-2">
                <div className="px-3 py-1 bg-slate-900/60 border border-slate-700/50 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Round {tabataCurrentRound} / {tabataTotalRounds}
                </div>
              </div>

              {tabataPhase === 'done' && (
                <div className="mt-4 flex items-center gap-2 text-yellow-400 font-black text-xs uppercase tracking-widest">
                  <Trophy size={14} /> Workout Complete!
                </div>
              )}
            </div>
          </div>

          {/* Tabata Controls */}
          <div className="flex justify-center items-center gap-6">
            <button onClick={handleTabataReset} className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 hover:text-white transition-all active:scale-90">
              <RotateCcw size={24} />
            </button>
            <button 
              onClick={() => isTabataRunning ? setIsTabataRunning(false) : startTabata()} 
              className={`w-20 h-20 rounded-full flex items-center justify-center text-slate-900 transition-all active:scale-95 shadow-lg ${
                isTabataRunning ? 'bg-rose-500 shadow-rose-500/20' : 'bg-amber-500 shadow-amber-500/20'
              }`}
            >
              {isTabataRunning ? <Pause size={32} /> : <Play size={32} fill="currentColor" className="ml-1" />}
            </button>
            <div className="w-14" />
          </div>

          {/* Configuration Steppers */}
          {tabataPhase === 'idle' && (
            <div className="grid grid-cols-1 gap-4 bg-slate-800/30 border border-slate-700/40 p-5 rounded-3xl">
              <div className="grid grid-cols-3 gap-4">
                <Stepper 
                  label="Work (ON)" 
                  value={tabataWork} 
                  unit="s" 
                  onIncrement={() => setTabataWork(prev => prev + 5)} 
                  onDecrement={() => setTabataWork(prev => Math.max(5, prev - 5))} 
                  color="text-emerald-400"
                />
                <Stepper 
                  label="Rest (OFF)" 
                  value={tabataRest} 
                  unit="s" 
                  onIncrement={() => setTabataRest(prev => prev + 5)} 
                  onDecrement={() => setTabataRest(prev => Math.max(0, prev - 5))} 
                  color="text-cyan-400"
                />
                <Stepper 
                  label="Rounds" 
                  value={tabataTotalRounds} 
                  unit="" 
                  onIncrement={() => setTabataTotalRounds(prev => prev + 1)} 
                  onDecrement={() => setTabataTotalRounds(prev => Math.max(1, prev - 1))} 
                  color="text-amber-400"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-700/40">
                <button 
                  onClick={() => handleTabataPreset(20, 10)}
                  className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-tight border transition-all ${tabataWork === 20 && tabataRest === 10 ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-800/60 border-slate-700 text-slate-500'}`}
                >
                  20 ON / 10 OFF
                </button>
                <button 
                  onClick={() => handleTabataPreset(30, 10)}
                  className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-tight border transition-all ${tabataWork === 30 && tabataRest === 10 ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-800/60 border-slate-700 text-slate-500'}`}
                >
                  30 ON / 10 OFF
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Stepper = ({ label, value, unit, onIncrement, onDecrement, color }: any) => (
  <div className="flex flex-col items-center gap-2">
    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
    <div className="flex items-center gap-1.5">
      <button onClick={onDecrement} className="w-6 h-6 rounded-lg bg-slate-900 flex items-center justify-center text-slate-500 active:bg-slate-800">
        <Minus size={12} />
      </button>
      <div className={`text-sm font-black w-8 text-center ${color}`}>
        {value}{unit}
      </div>
      <button onClick={onIncrement} className="w-6 h-6 rounded-lg bg-slate-900 flex items-center justify-center text-slate-500 active:bg-slate-800">
        <Plus size={12} />
      </button>
    </div>
  </div>
);

export default TimerView;
