
import React, { useState, useMemo } from 'react';
import { Workout, Exercise, WorkoutType } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell, AreaChart, Area } from 'recharts';
import { Activity, Zap, TrendingUp, ChevronDown, Award, Calendar, ChevronRight, List, History as HistoryIcon, X, Dumbbell, Heart } from 'lucide-react';

interface AnalyticsProps {
  workouts: Workout[];
}

const Analytics: React.FC<AnalyticsProps> = ({ workouts }) => {
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [showDetailedHistory, setShowDetailedHistory] = useState(false);
  const [volumeMetric, setVolumeMetric] = useState<'kg' | 'km'>('kg');
  const [aggregationType, setAggregationType] = useState<'weekly' | 'total'>('weekly');

  // Extract unique exercise names
  const uniqueExercises = useMemo(() => {
    const names = new Set<string>();
    workouts.forEach(w => w.exercises.forEach(ex => names.add(ex.name)));
    const sorted = Array.from(names).sort();
    if (sorted.length > 0 && !selectedExercise) {
      setSelectedExercise(sorted[0]);
    }
    return sorted;
  }, [workouts]);

  // Ensure workouts are sorted by date for chronological processing
  const chronologicalWorkouts = useMemo(() => {
    return [...workouts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [workouts]);

  // Identify the type of the selected exercise
  const selectedExerciseType = useMemo(() => {
    if (!selectedExercise) return 'strength';
    // Find first occurrence to determine type
    const workout = workouts.find(w => w.exercises.some(ex => ex.name === selectedExercise));
    return workout?.type || 'strength';
  }, [selectedExercise, workouts]);

  // Data for Volume Chart
  const volumeData = useMemo(() => {
    let runningTotalKg = 0;
    let runningTotalKm = 0;
    
    const allSessionsData = chronologicalWorkouts.map(w => {
      // KG Volume: Only from strength workouts, calculating Weight * Reps
      const sessionKg = w.type === 'strength' 
        ? w.exercises.reduce((total, ex) => 
            total + ex.sets.reduce((sTotal, set) => {
              const repsValue = set.metricType === 'reps' || !set.metricType ? (set.metricValue || set.reps || 0) : 0;
              return sTotal + ((set.weight || 0) * repsValue);
            }, 0), 0
          )
        : 0;

      // KM Volume: Only from cardio workouts, using the dedicated distance field
      const sessionKm = w.type === 'cardio' 
        ? w.exercises.reduce((total, ex) => 
            total + ex.sets.reduce((sTotal, set) => sTotal + (set.distance || 0), 0), 0
          )
        : 0;
      
      runningTotalKg += sessionKg;
      runningTotalKm += sessionKm;

      return {
        date: new Date(w.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        sessionKg,
        sessionKm,
        cumulativeKg: runningTotalKg,
        cumulativeKm: runningTotalKm,
      };
    });

    const displayData = aggregationType === 'weekly' 
      ? allSessionsData.slice(-7) 
      : allSessionsData;

    return displayData.map(item => ({
      ...item,
      volume: volumeMetric === 'kg' 
        ? (aggregationType === 'weekly' ? item.sessionKg : item.cumulativeKg)
        : (aggregationType === 'weekly' ? item.sessionKm : item.cumulativeKm)
    }));
  }, [chronologicalWorkouts, volumeMetric, aggregationType]);

  // Data for Exercise Progress Chart
  const exerciseProgressData = useMemo(() => {
    if (!selectedExercise) return [];
    
    const data = chronologicalWorkouts
      .filter(w => w.exercises.some(ex => ex.name === selectedExercise))
      .map(w => {
        const targetEx = w.exercises.find(ex => ex.name === selectedExercise);
        const maxWeight = targetEx ? Math.max(...targetEx.sets.map(s => s.weight || 0)) : 0;
        const maxDist = targetEx ? Math.max(...targetEx.sets.map(s => s.metricValue || s.distance || 0)) : 0;
        
        return {
          fullDate: w.date,
          date: new Date(w.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          weight: maxWeight,
          distance: maxDist,
          value: selectedExerciseType === 'cardio' ? maxDist : maxWeight,
          allSets: targetEx ? targetEx.sets : []
        };
      });

    let currentMax = 0;
    return data.map(item => {
      const isPR = item.value > currentMax;
      if (isPR) currentMax = item.value;
      return { ...item, isPR };
    });
  }, [chronologicalWorkouts, selectedExercise, selectedExerciseType]);

  const displayVolumeTotal = useMemo(() => {
    if (aggregationType === 'total') {
      const last = volumeData[volumeData.length - 1];
      return last ? last.volume : 0;
    }
    return volumeData.reduce((acc, curr) => acc + curr.volume, 0);
  }, [volumeData, aggregationType]);

  const currentPRValue = exerciseProgressData.length > 0 ? Math.max(...exerciseProgressData.map(d => d.value)) : 0;
  
  const prMilestones = useMemo(() => {
    return [...exerciseProgressData].filter(d => d.isPR).reverse();
  }, [exerciseProgressData]);

  if (workouts.length < 1) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-20 opacity-50">
        <TrendingUp size={48} className="mb-4 text-slate-600" />
        <p className="text-lg font-bold">More data needed</p>
        <p className="text-sm px-10">Log your first session to see your progress visualized here.</p>
      </div>
    );
  }

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.isPR) {
      return (
        <g>
          <circle cx={cx} cy={cy} r={6} fill="#fbbf24" stroke="#0f172a" strokeWidth={2} />
          <circle cx={cx} cy={cy} r={12} fill="#fbbf24" fillOpacity={0.2} className="animate-pulse" />
        </g>
      );
    }
    return <circle cx={cx} cy={cy} r={4} fill={selectedExerciseType === 'cardio' ? '#22d3ee' : '#10b981'} stroke="#0f172a" strokeWidth={2} />;
  };

  return (
    <div className="space-y-8 pb-20 relative">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Activity className="text-emerald-400" />
        Performance Metrics
      </h2>

      {/* Volume Chart */}
      <div className="bg-slate-800/40 border border-slate-700/60 p-5 rounded-[2rem] shadow-sm">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">
                {aggregationType === 'weekly' ? 'Weekly Training Volume' : 'Total Accumulated Volume'}
              </h3>
              <p className="text-3xl font-black text-white">{displayVolumeTotal.toLocaleString()} <span className="text-xs font-bold text-slate-500 uppercase">{volumeMetric.toUpperCase()}</span></p>
            </div>
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700">
              <button 
                onClick={() => setVolumeMetric('kg')}
                className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${volumeMetric === 'kg' ? 'bg-emerald-500 text-slate-900' : 'text-slate-500'}`}
              >KG</button>
              <button 
                onClick={() => setVolumeMetric('km')}
                className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${volumeMetric === 'km' ? 'bg-cyan-500 text-slate-900' : 'text-slate-500'}`}
              >KM</button>
            </div>
          </div>

          <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-700/50 self-start">
            <button 
              onClick={() => setAggregationType('weekly')}
              className={`px-4 py-1.5 text-[9px] font-black rounded-lg transition-all uppercase tracking-wider ${aggregationType === 'weekly' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-400'}`}
            >Weekly</button>
            <button 
              onClick={() => setAggregationType('total')}
              className={`px-4 py-1.5 text-[9px] font-black rounded-lg transition-all uppercase tracking-wider ${aggregationType === 'total' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-400'}`}
            >Total</button>
          </div>
        </div>
        
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {aggregationType === 'weekly' ? (
              <BarChart data={volumeData}>
                <defs>
                  <linearGradient id="barGradKg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="barGradKm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 10, fontWeight: '700'}}
                />
                <Tooltip 
                  contentStyle={{backgroundColor: '#0f172a', borderRadius: '1.2rem', border: '1px solid #334155', color: '#fff'}}
                  cursor={{fill: '#1e293b', radius: 4}}
                  formatter={(value: any) => [`${value.toLocaleString()} ${volumeMetric.toUpperCase()}`, 'Volume']}
                />
                <Bar dataKey="volume" fill={volumeMetric === 'kg' ? "url(#barGradKg)" : "url(#barGradKm)"} radius={[6, 6, 0, 0]} />
              </BarChart>
            ) : (
              <AreaChart data={volumeData}>
                <defs>
                  <linearGradient id="areaGradKg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="areaGradKm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 10, fontWeight: '700'}}
                  hide={volumeData.length > 15}
                />
                <Tooltip 
                  contentStyle={{backgroundColor: '#0f172a', borderRadius: '1.2rem', border: '1px solid #334155', color: '#fff'}}
                  formatter={(value: any) => [`${value.toLocaleString()} ${volumeMetric.toUpperCase()}`, 'Total Volume']}
                />
                <Area 
                  type="monotone" 
                  dataKey="volume" 
                  stroke={volumeMetric === 'kg' ? '#10b981' : '#22d3ee'} 
                  fill={volumeMetric === 'kg' ? 'url(#areaGradKg)' : 'url(#areaGradKm)'} 
                  strokeWidth={3}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Exercise Progress Chart */}
      <div className="bg-slate-800/40 border border-slate-700/60 p-5 rounded-[2rem] shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 blur-[80px] -mr-16 -mt-16 rounded-full pointer-events-none"></div>
        
        <div className="flex flex-col mb-6 gap-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Progress Tracker</h3>
              <p className="text-2xl font-black text-white flex items-center gap-2">
                {currentPRValue} <span className="text-xs font-bold text-slate-500 uppercase">{selectedExerciseType === 'cardio' ? 'KM' : 'KG'} MAX</span>
                {currentPRValue > 0 && <Award className="text-yellow-400 w-5 h-5" />}
              </p>
            </div>
            <div className="relative group">
              <select 
                value={selectedExercise}
                onChange={(e) => {
                  setSelectedExercise(e.target.value);
                  setShowDetailedHistory(false);
                }}
                className={`appearance-none bg-slate-900 border border-slate-700 rounded-2xl px-4 py-2 pr-10 text-xs font-black focus:outline-none focus:ring-2 transition-all uppercase tracking-wider ${selectedExerciseType === 'cardio' ? 'text-cyan-400 focus:ring-cyan-500/20' : 'text-emerald-400 focus:ring-emerald-500/20'}`}
              >
                {uniqueExercises.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 w-4 h-4" />
            </div>
          </div>
        </div>
        
        <div className="h-56 w-full">
          {exerciseProgressData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={exerciseProgressData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: '700'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                <Tooltip 
                  contentStyle={{backgroundColor: '#0f172a', borderRadius: '1.2rem', border: '1px solid #334155', color: '#fff'}}
                  formatter={(value: any, name: any, props: any) => [
                    <span className="flex items-center gap-2">
                      {value}{selectedExerciseType === 'cardio' ? 'km' : 'kg'} {props.payload.isPR && <span className="text-[10px] bg-yellow-400 text-black px-1.5 py-0.5 rounded-full font-black">NEW PR! 🏆</span>}
                    </span>, 
                    'Performance'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={selectedExerciseType === 'cardio' ? '#22d3ee' : '#10b981'} 
                  strokeWidth={4} 
                  dot={<CustomDot />}
                  activeDot={{ r: 8, fill: selectedExerciseType === 'cardio' ? '#22d3ee' : '#10b981', stroke: '#fff', strokeWidth: 3 }}
                  animationDuration={1500}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm italic gap-2">
               <Calendar size={24} className="opacity-20" />
               Select an exercise to see progress
            </div>
          )}
        </div>

        <button 
          onClick={() => setShowDetailedHistory(true)}
          className={`mt-6 w-full py-3 border rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm ${selectedExerciseType === 'cardio' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'}`}
        >
          <HistoryIcon size={14} /> View Performance Log
        </button>

        {prMilestones.length > 0 && (
          <div className="mt-8 space-y-3">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
              <Award size={12} className="text-yellow-400" />
              All-Time Milestones
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {prMilestones.slice(0, 3).map((milestone, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-900/40 p-3 rounded-2xl border border-slate-700/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-yellow-400/10 flex items-center justify-center">
                      {selectedExerciseType === 'cardio' ? <Heart size={16} className="text-cyan-400" /> : <Dumbbell size={16} className="text-emerald-400" />}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-100">{milestone.value} <span className="text-[10px] font-bold text-slate-500 uppercase">{selectedExerciseType === 'cardio' ? 'KM' : 'KG'}</span></p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">{milestone.date}</p>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-slate-700" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detailed History Overlay */}
      {showDetailedHistory && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-sm p-4 flex flex-col animate-in fade-in zoom-in duration-300">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">{selectedExercise}</h3>
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Historical Performance Log</p>
            </div>
            <button 
              onClick={() => setShowDetailedHistory(false)}
              className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pb-8 pr-1 no-scrollbar">
            {[...exerciseProgressData].reverse().map((entry, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 relative overflow-hidden">
                {entry.isPR && (
                  <div className="absolute top-0 right-0 p-3">
                    <span className="text-[8px] font-black bg-yellow-400 text-black px-2 py-0.5 rounded-full uppercase">All-Time PR</span>
                  </div>
                )}
                <div className="flex items-center gap-2 mb-4">
                  <Calendar size={12} className="text-slate-500" />
                  <span className="text-xs font-black text-slate-400 uppercase">{new Date(entry.fullDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {entry.allSets.map((set, sIdx) => (
                    <div key={sIdx} className="bg-slate-800/50 rounded-2xl p-3 border border-slate-700/50 flex flex-col items-center justify-center">
                      <span className="text-[8px] font-black text-slate-500 uppercase mb-1">Entry {sIdx + 1}</span>
                      {selectedExerciseType === 'cardio' ? (
                        <>
                          <p className="text-sm font-black text-cyan-400">{set.metricValue || set.distance}<span className="text-[10px] text-slate-500 ml-0.5 uppercase">KM</span></p>
                          <p className="text-[10px] font-bold text-slate-400">{set.time}m • {set.pace}/km</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-black text-white">{set.weight}<span className="text-[10px] text-slate-500 ml-0.5">KG</span></p>
                          <p className="text-[10px] font-bold text-slate-400">× {set.metricValue || set.reps}</p>
                          {set.rpe && <p className="text-[8px] font-black text-indigo-400 mt-1 uppercase">RPE {set.rpe}</p>}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
