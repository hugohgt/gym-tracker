
import React, { useState, useMemo } from 'react';
import { Workout, Exercise, WorkoutType } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell, AreaChart, Area } from 'recharts';
import { Activity, Zap, TrendingUp, ChevronDown, Award, Calendar, ChevronRight, List, History as HistoryIcon, X, Dumbbell, Heart, Sparkles, Clock, ArrowUp, ArrowDown, Lightbulb, Trophy, Filter } from 'lucide-react';

interface AnalyticsProps {
  workouts: Workout[];
}

type TimeRange = '7d' | '30d' | '90d';

const Analytics: React.FC<AnalyticsProps> = ({ workouts }) => {
  // Filters
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [activityType, setActivityType] = useState<WorkoutType>('strength');
  
  // Existing view states
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [showDetailedHistory, setShowDetailedHistory] = useState(false);
  const [aggregationType, setAggregationType] = useState<'weekly' | 'total'>('weekly');

  // Core Filtering Logic
  const { currentWorkouts, comparisonWorkouts, rangeStart, rangeEnd, rangeDays } = useMemo(() => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    
    const currentStart = new Date(now);
    currentStart.setDate(now.getDate() - (days - 1));
    currentStart.setHours(0, 0, 0, 0);
    
    const compEnd = new Date(currentStart);
    compEnd.setDate(currentStart.getDate() - 1);
    compEnd.setHours(23, 59, 59, 999);
    
    const compStart = new Date(compEnd);
    compStart.setDate(compEnd.getDate() - (days - 1));
    compStart.setHours(0, 0, 0, 0);

    const filterByType = (w: Workout) => w.type === activityType;
    
    const current = workouts.filter(w => {
      const d = new Date(w.date);
      return d >= currentStart && d <= now && filterByType(w);
    });

    const comparison = workouts.filter(w => {
      const d = new Date(w.date);
      return d >= compStart && d <= compEnd && filterByType(w);
    });

    return { 
      currentWorkouts: current, 
      comparisonWorkouts: comparison, 
      rangeStart: currentStart, 
      rangeEnd: now,
      rangeDays: days
    };
  }, [workouts, timeRange, activityType]);

  // Summary Stats based on filtered range
  const rangeStats = useMemo(() => {
    const calculateVolume = (list: Workout[]) => {
      return list.reduce((total, w) => {
        // Only include normal quality workouts in volume calculations
        if (w.quality && w.quality !== 'normal') return total;

        return total + w.exercises.reduce((exTotal, ex) => 
          exTotal + ex.sets.reduce((sTotal, s) => {
            if (activityType === 'strength') {
              const reps = s.metricType === 'reps' || !s.metricType ? (s.metricValue || s.reps || 0) : 0;
              return sTotal + ((s.weight || 0) * reps);
            } else {
              return sTotal + (s.distance || 0);
            }
          }, 0), 0
        );
      }, 0);
    };

    const currentVol = calculateVolume(currentWorkouts);
    const lastVol = calculateVolume(comparisonWorkouts);

    return {
      count: currentWorkouts.length,
      volume: currentVol,
      deltas: {
        count: currentWorkouts.length - comparisonWorkouts.length,
        volume: currentVol - lastVol
      }
    };
  }, [currentWorkouts, comparisonWorkouts, activityType]);

  const renderDelta = (delta: number, unit: string = '') => {
    if (delta === 0) return <span className="text-slate-600">—</span>;
    const isPos = delta > 0;
    const formattedUnit = unit ? ` ${unit.toUpperCase()}` : '';
    return (
      <span className={`flex items-center gap-0.5 font-black tracking-tighter text-[9px] ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
        {isPos ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
        {isPos ? `+${Math.abs(delta).toLocaleString()}${formattedUnit}` : `-${Math.abs(delta).toLocaleString()}${formattedUnit}`}
      </span>
    );
  };

  // Filter unique exercises based on selected Activity Type
  const availableExercises = useMemo(() => {
    const names = new Set<string>();
    workouts
      .filter(w => w.type === activityType)
      .forEach(w => w.exercises.forEach(ex => names.add(ex.name)));
    const sorted = Array.from(names).sort();
    
    // Auto-select first available if current selection is invalid for type
    if (sorted.length > 0 && (!selectedExercise || !names.has(selectedExercise))) {
      setSelectedExercise(sorted[0]);
    }
    return sorted;
  }, [workouts, activityType, selectedExercise]);

  const chronologicalWorkouts = useMemo(() => {
    return [...workouts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [workouts]);

  // Volume Chart Data (Filtered by activity type and range)
  const volumeData = useMemo(() => {
    let runningTotal = 0;
    
    // For volume chart, we map over the range window specifically
    const data = currentWorkouts
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(w => {
        // Default session volume to 0 if not a 'normal' session
        let sessionVol = 0;
        if (!w.quality || w.quality === 'normal') {
          sessionVol = w.exercises.reduce((exTotal, ex) => 
            exTotal + ex.sets.reduce((sTotal, s) => {
              if (activityType === 'strength') {
                const reps = s.metricType === 'reps' || !s.metricType ? (s.metricValue || s.reps || 0) : 0;
                return sTotal + ((s.weight || 0) * reps);
              } else {
                return sTotal + (s.distance || 0);
              }
            }, 0), 0
          );
        }
        
        runningTotal += sessionVol;

        return {
          date: new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          sessionVol,
          cumulativeVol: runningTotal,
        };
      });

    return data.map(item => ({
      ...item,
      volume: aggregationType === 'weekly' ? item.sessionVol : item.cumulativeVol
    }));
  }, [currentWorkouts, activityType, aggregationType]);

  // Progress Tracker Data (Filtered by range, but milestones remain global)
  const exerciseProgressData = useMemo(() => {
    if (!selectedExercise) return [];
    
    // 1. Get ALL-TIME data for this exercise to compute milestones correctly
    const allTimeData = chronologicalWorkouts
      .filter(w => w.exercises.some(ex => ex.name === selectedExercise))
      .map(w => {
        const targetEx = w.exercises.find(ex => ex.name === selectedExercise);
        const maxVal = targetEx ? Math.max(...targetEx.sets.map(s => 
          activityType === 'strength' ? (s.weight || 0) : (s.metricValue || s.distance || 0)
        )) : 0;
        
        return {
          fullDate: w.date,
          date: new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          value: maxVal,
          allSets: targetEx ? targetEx.sets : []
        };
      });

    // 2. Compute the PR chain (Always All-Time)
    let currentMax = 0;
    const allTimeWithPRs = allTimeData.map(item => {
      const isPR = item.value > currentMax;
      if (isPR) currentMax = item.value;
      return { ...item, isPR };
    });

    const latestPRIdx = allTimeWithPRs.reduce((acc, curr, idx) => curr.isPR ? idx : acc, -1);
    
    // 3. Filter the chart data points to the selected range
    return allTimeWithPRs
      .filter(item => {
        const d = new Date(item.fullDate);
        return d >= rangeStart && d <= rangeEnd;
      })
      .map((item, idx, arr) => ({
        ...item,
        // Match the absolute PR from all-time data
        isLatestPR: allTimeWithPRs.findIndex(orig => orig.fullDate === item.fullDate) === latestPRIdx
      }));
  }, [chronologicalWorkouts, selectedExercise, activityType, rangeStart, rangeEnd]);

  // Global Milestones (Ignore Range Filters)
  const { bestPR, prevPR, absoluteMax } = useMemo(() => {
    if (!selectedExercise) return { bestPR: null, prevPR: null, absoluteMax: 0 };
    
    const allTimeRecords = chronologicalWorkouts
      .filter(w => w.exercises.some(ex => ex.name === selectedExercise))
      .map(w => {
        const targetEx = w.exercises.find(ex => ex.name === selectedExercise);
        return targetEx ? Math.max(...targetEx.sets.map(s => 
          activityType === 'strength' ? (s.weight || 0) : (s.metricValue || s.distance || 0)
        )) : 0;
      });

    // Chain logic for Prev/Best
    const chain: {value: number, date: string}[] = [];
    let runningMax = 0;
    chronologicalWorkouts
      .filter(w => w.exercises.some(ex => ex.name === selectedExercise))
      .forEach(w => {
        const targetEx = w.exercises.find(ex => ex.name === selectedExercise);
        const val = targetEx ? Math.max(...targetEx.sets.map(s => 
          activityType === 'strength' ? (s.weight || 0) : (s.metricValue || s.distance || 0)
        )) : 0;
        if (val > runningMax) {
          runningMax = val;
          chain.push({ value: val, date: new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) });
        }
      });

    return {
      bestPR: chain[chain.length - 1] || null,
      prevPR: chain.length > 1 ? chain[chain.length - 2] : null,
      absoluteMax: runningMax
    };
  }, [chronologicalWorkouts, selectedExercise, activityType]);

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.isLatestPR) {
      return (
        <g>
          <circle cx={cx} cy={cy} r={6} fill="#fbbf24" stroke="#0f172a" strokeWidth={2} />
          <circle cx={cx} cy={cy} r={12} fill="#fbbf24" fillOpacity={0.2} className="animate-pulse" />
        </g>
      );
    }
    return <circle cx={cx} cy={cy} r={4} fill={activityType === 'cardio' ? '#22d3ee' : '#10b981'} stroke="#0f172a" strokeWidth={2} />;
  };

  if (workouts.length < 1) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-20 opacity-50">
        <TrendingUp size={48} className="mb-4 text-slate-600" />
        <p className="text-lg font-bold">More data needed</p>
        <p className="text-sm px-10">Log your first session to see your progress visualized here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 relative">
      {/* Primary Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity className="text-emerald-400" />
            Performance
          </h2>
          <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 shadow-sm">
            <button 
              onClick={() => setActivityType('strength')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${activityType === 'strength' ? 'bg-emerald-500 text-slate-900 shadow-md' : 'text-slate-500'}`}
            >
              <Dumbbell size={12} /> STRENGTH
            </button>
            <button 
              onClick={() => setActivityType('cardio')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${activityType === 'cardio' ? 'bg-cyan-500 text-slate-900 shadow-md' : 'text-slate-500'}`}
            >
              <Heart size={12} /> CARDIO
            </button>
          </div>
        </div>

        <div className="flex bg-slate-800/40 p-1 rounded-2xl border border-slate-700/40">
          {(['7d', '30d', '90d'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                timeRange === range ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              Last {range.slice(0, -1)} Days
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats Card */}
      <div className="bg-slate-800/40 border border-slate-700/60 p-5 rounded-[2rem] shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-indigo-400" />
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Summary · Last {rangeDays} Days</h3>
          </div>
          <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
            {rangeStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {rangeEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Sessions</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{rangeStats.count}</span>
              {renderDelta(rangeStats.deltas.count)}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Volume</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{rangeStats.volume.toLocaleString()}</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase">{activityType === 'strength' ? 'KG' : 'KM'}</span>
            </div>
            {renderDelta(rangeStats.deltas.volume, activityType === 'strength' ? 'KG' : 'KM')}
          </div>
        </div>
      </div>

      {/* Volume Chart */}
      <div className="bg-slate-800/40 border border-slate-700/60 p-5 rounded-[2rem] shadow-sm">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                {aggregationType === 'weekly' ? 'Volume per Session' : 'Accumulated Volume'} · Last {rangeDays} Days
              </h3>
            </div>
            <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-700/50">
              <button 
                onClick={() => setAggregationType('weekly')}
                className={`px-4 py-1.5 text-[9px] font-black rounded-lg transition-all uppercase tracking-wider ${aggregationType === 'weekly' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500'}`}
              >Sessions</button>
              <button 
                onClick={() => setAggregationType('total')}
                className={`px-4 py-1.5 text-[9px] font-black rounded-lg transition-all uppercase tracking-wider ${aggregationType === 'total' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500'}`}
              >Total</button>
            </div>
          </div>
        </div>
        
        <div className="h-48 w-full">
          {volumeData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {aggregationType === 'weekly' ? (
                <BarChart data={volumeData}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={activityType === 'strength' ? '#10b981' : '#22d3ee'} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={activityType === 'strength' ? '#10b981' : '#22d3ee'} stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: '700'}} />
                  <Tooltip contentStyle={{backgroundColor: '#0f172a', borderRadius: '1rem', border: '1px solid #334155', color: '#fff'}} cursor={{fill: '#1e293b', radius: 4}} formatter={(val: any) => [`${val.toLocaleString()} ${activityType === 'strength' ? 'KG' : 'KM'}`, 'Volume']} />
                  <Bar dataKey="volume" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                </BarChart>
              ) : (
                <AreaChart data={volumeData}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={activityType === 'strength' ? '#10b981' : '#22d3ee'} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={activityType === 'strength' ? '#10b981' : '#22d3ee'} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: '700'}} />
                  <Tooltip contentStyle={{backgroundColor: '#0f172a', borderRadius: '1rem', border: '1px solid #334155', color: '#fff'}} formatter={(val: any) => [`${val.toLocaleString()} ${activityType === 'strength' ? 'KG' : 'KM'}`, 'Total Volume']} />
                  <Area type="monotone" dataKey="volume" stroke={activityType === 'strength' ? '#10b981' : '#22d3ee'} fill="url(#areaGrad)" strokeWidth={3} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-[10px] font-bold text-slate-600 uppercase tracking-widest">No activity in this period</div>
          )}
        </div>
      </div>

      {/* Exercise Progress Tracker */}
      <div className="bg-slate-800/40 border border-slate-700/60 p-5 rounded-[2rem] shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 blur-[80px] -mr-16 -mt-16 rounded-full pointer-events-none"></div>
        
        <div className="flex flex-col mb-6 gap-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Progress Tracker</h3>
              <p className="text-2xl font-black text-white flex items-center gap-2">
                {absoluteMax.toLocaleString()} <span className="text-xs font-bold text-slate-500 uppercase">{activityType === 'strength' ? 'KG' : 'KM'} MAX</span>
              </p>
            </div>
            <div className="relative group">
              <select 
                value={selectedExercise}
                onChange={(e) => setSelectedExercise(e.target.value)}
                className={`appearance-none bg-slate-900 border border-slate-700 rounded-2xl px-4 py-2 pr-10 text-xs font-black focus:outline-none focus:ring-2 transition-all uppercase tracking-wider ${activityType === 'cardio' ? 'text-cyan-400 focus:ring-cyan-500/20' : 'text-emerald-400 focus:ring-emerald-500/20'}`}
              >
                {availableExercises.map(name => (
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
                  formatter={(val: any, _: any, props: any) => [
                    <span className="flex items-center gap-2">
                      {val.toLocaleString()} {activityType === 'strength' ? 'KG' : 'KM'} {props.payload.isLatestPR && <span className="text-[9px] font-black bg-yellow-400 text-black px-1.5 py-0.5 rounded-full">ALL-TIME PR! 🏆</span>}
                    </span>, 
                    'Value'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={activityType === 'cardio' ? '#22d3ee' : '#10b981'} 
                  strokeWidth={4} 
                  dot={<CustomDot />}
                  activeDot={{ r: 8, fill: activityType === 'cardio' ? '#22d3ee' : '#10b981', stroke: '#fff', strokeWidth: 3 }}
                  animationDuration={1500}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-[10px] font-bold uppercase tracking-widest gap-2">
               <Calendar size={24} className="opacity-20" />
               No records in this {timeRange} window
            </div>
          )}
        </div>

        {/* Global Milestones Section */}
        <div className="mt-8 space-y-3">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
            <Award size={12} className="text-yellow-400" />
            All-Time Milestones
          </h4>
          
          {bestPR ? (
            <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-700/30 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center shadow-inner">
                  <Trophy size={20} className="text-yellow-400 fill-current" />
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-base font-black text-slate-100">{bestPR.value.toLocaleString()} <span className="text-[10px] font-bold text-slate-500 uppercase">{activityType === 'strength' ? 'KG' : 'KM'}</span></p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{bestPR.date}</p>
                  </div>
                  {prevPR && (
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-0.5">
                      Prev Record: {prevPR.value.toLocaleString()} {activityType === 'strength' ? 'KG' : 'KM'} · {prevPR.date}
                    </p>
                  )}
                </div>
              </div>
              <ChevronRight size={14} className="text-slate-700" />
            </div>
          ) : (
            <div className="bg-slate-900/20 p-4 rounded-2xl border border-dashed border-slate-800 text-center">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">No records found for {selectedExercise}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
