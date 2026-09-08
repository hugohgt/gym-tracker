
import React, { useState, useMemo } from 'react';
import { Workout, Exercise, WorkoutType } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell, AreaChart, Area, PieChart, Pie } from 'recharts';
import { Activity, Zap, TrendingUp, ChevronDown, Award, Calendar, ChevronRight, List, History as HistoryIcon, X, Dumbbell, Heart, Sparkles, Clock, ArrowUp, ArrowDown, Lightbulb, Trophy, Filter, PieChart as PieChartIcon } from 'lucide-react';

interface AnalyticsProps {
  workouts: Workout[];
}

type StrengthTimeRange = 'this_week' | '30d' | 'all_time';
type CardioTimeRange = '7d' | '30d' | '90d';

export type PrimaryMuscleGroup =
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Biceps'
  | 'Triceps'
  | 'Quads'
  | 'Hamstrings'
  | 'Glutes'
  | 'Calves'
  | 'Core';

const PRIMARY_MUSCLE_GROUPS: PrimaryMuscleGroup[] = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Core'
];

const MUSCLE_COLORS: Record<PrimaryMuscleGroup, string> = {
  Chest: '#10b981',      // Emerald 500
  Back: '#06b6d4',       // Cyan 500
  Shoulders: '#14b8a6',  // Teal 500
  Biceps: '#38bdf8',     // Sky 400
  Triceps: '#34d399',    // Emerald 400
  Quads: '#22d3ee',      // Cyan 400
  Hamstrings: '#2dd4bf', // Teal 400
  Glutes: '#818cf8',     // Indigo 400
  Calves: '#67e8f9',     // Cyan 300
  Core: '#94a3b8'        // Slate 400
};

export function getPrimaryMuscleGroup(exercise: { name: string; category?: string; tags?: string[] }): PrimaryMuscleGroup {
  const cat = (exercise.category || '').toLowerCase();
  const name = (exercise.name || '').toLowerCase();
  const tags = (exercise.tags || []).map(t => t.toLowerCase());

  // Direct category matching
  if (cat.includes('chest') || cat.includes('pecho')) return 'Chest';
  if (cat.includes('back') || cat.includes('espalda') || cat.includes('lats') || cat.includes('dorsal')) return 'Back';
  if (cat.includes('shoulder') || cat.includes('hombro') || cat.includes('deltoid')) return 'Shoulders';
  if (cat.includes('bicep')) return 'Biceps';
  if (cat.includes('tricep')) return 'Triceps';
  if (cat.includes('quad') || cat.includes('cuad')) return 'Quads';
  if (cat.includes('hamstring') || cat.includes('femoral') || cat.includes('isquio')) return 'Hamstrings';
  if (cat.includes('glute') || cat.includes('glúteo')) return 'Glutes';
  if (cat.includes('calf') || cat.includes('calves') || cat.includes('gemelo')) return 'Calves';
  if (cat.includes('core') || cat.includes('abs') || cat.includes('abdomen') || cat.includes('abdominal')) return 'Core';

  // Exercise name keyword matching
  // Biceps (differentiating from leg curl)
  if (name.includes('bicep') || name.includes('curl') || name.includes('hammer') || name.includes('preacher')) {
    if (!name.includes('leg curl') && !name.includes('femoral') && !name.includes('hamstring')) return 'Biceps';
  }
  // Triceps
  if (name.includes('tricep') || name.includes('skull') || name.includes('pushdown') || name.includes('close-grip') || name.includes('french') || name.includes('kickback') || name.includes('copa')) {
    return 'Triceps';
  }
  // Chest
  if (name.includes('bench') || name.includes('chest') || name.includes('fly') || name.includes('press banca') || name.includes('push-up') || name.includes('pushup') || name.includes('pec') || name.includes('aperturas')) {
    return 'Chest';
  }
  // Shoulders
  if (name.includes('shoulder') || name.includes('overhead') || name.includes('ohp') || name.includes('lateral raise') || name.includes('front raise') || name.includes('military') || name.includes('arnold') || name.includes('deltoid') || name.includes('press militar') || name.includes('elevaciones laterales') || name.includes('pajaros')) {
    return 'Shoulders';
  }
  // Hamstrings
  if (name.includes('hamstring') || name.includes('leg curl') || name.includes('rdl') || name.includes('romanian') || name.includes('stiff leg') || name.includes('good morning') || name.includes('peso muerto rumano') || name.includes('curl femoral')) {
    return 'Hamstrings';
  }
  // Quads
  if (name.includes('squat') || name.includes('sentadilla') || name.includes('leg press') || name.includes('prensa') || name.includes('quad') || name.includes('lunge') || name.includes('zancada') || name.includes('hack') || name.includes('leg extension') || name.includes('extensiones')) {
    return 'Quads';
  }
  // Glutes
  if (name.includes('hip thrust') || name.includes('glute') || name.includes('bridge') || name.includes('abductor') || name.includes('puente')) {
    return 'Glutes';
  }
  // Calves
  if (name.includes('calf') || name.includes('calves') || name.includes('gemelo') || name.includes('soleus') || name.includes('talones')) {
    return 'Calves';
  }
  // Core
  if (name.includes('plank') || name.includes('crunch') || name.includes('sit-up') || name.includes('situp') || name.includes('abs') || name.includes('core') || name.includes('russian twist') || name.includes('leg raise') || name.includes('hollow') || name.includes('abdominal') || name.includes('plancha')) {
    return 'Core';
  }
  // Back
  if (name.includes('row') || name.includes('remo') || name.includes('pull') || name.includes('chin') || name.includes('lat') || name.includes('jalon') || name.includes('pulldown') || name.includes('deadlift') || name.includes('peso muerto') || name.includes('shrug') || name.includes('back') || name.includes('dominadas')) {
    return 'Back';
  }

  // Tags fallback
  for (const tag of tags) {
    if (tag.includes('chest')) return 'Chest';
    if (tag.includes('back')) return 'Back';
    if (tag.includes('shoulder')) return 'Shoulders';
    if (tag.includes('bicep')) return 'Biceps';
    if (tag.includes('tricep')) return 'Triceps';
    if (tag.includes('quad')) return 'Quads';
    if (tag.includes('hamstring')) return 'Hamstrings';
    if (tag.includes('glute')) return 'Glutes';
    if (tag.includes('calf')) return 'Calves';
    if (tag.includes('core')) return 'Core';
  }

  // Generic category fallbacks
  if (cat.includes('arm') || cat.includes('brazo')) return 'Biceps';
  if (cat.includes('leg') || cat.includes('pierna')) return 'Quads';
  if (cat.includes('lower back') || cat.includes('lumbar')) return 'Back';

  return 'Chest';
}

const Analytics: React.FC<AnalyticsProps> = ({ workouts }) => {
  // Filters
  const [strengthTimeRange, setStrengthTimeRange] = useState<StrengthTimeRange>('this_week');
  const [cardioTimeRange, setCardioTimeRange] = useState<CardioTimeRange>('7d');
  const [activityType, setActivityType] = useState<WorkoutType>('strength');
  
  // Existing view states
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [aggregationType, setAggregationType] = useState<'weekly' | 'total'>('weekly');

  // Core Filtering Logic
  const { currentWorkouts, comparisonWorkouts, rangeStart, rangeEnd, rangeLabel } = useMemo(() => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    
    let currentStart = new Date(now);
    let compStart = new Date(now);
    let compEnd = new Date(now);
    let label = '';

    if (activityType === 'strength') {
      if (strengthTimeRange === 'this_week') {
        // Current calendar week starting Monday
        const dayOfWeek = (now.getDay() + 6) % 7; // Monday = 0
        currentStart = new Date(now);
        currentStart.setDate(now.getDate() - dayOfWeek);
        currentStart.setHours(0, 0, 0, 0);

        compEnd = new Date(currentStart);
        compEnd.setDate(currentStart.getDate() - 1);
        compEnd.setHours(23, 59, 59, 999);

        compStart = new Date(compEnd);
        compStart.setDate(compEnd.getDate() - 6);
        compStart.setHours(0, 0, 0, 0);

        label = 'This Week';
      } else if (strengthTimeRange === '30d') {
        currentStart = new Date(now);
        currentStart.setDate(now.getDate() - 29);
        currentStart.setHours(0, 0, 0, 0);

        compEnd = new Date(currentStart);
        compEnd.setDate(currentStart.getDate() - 1);
        compEnd.setHours(23, 59, 59, 999);

        compStart = new Date(compEnd);
        compStart.setDate(compEnd.getDate() - 29);
        compStart.setHours(0, 0, 0, 0);

        label = 'Last 30 Days';
      } else {
        // All Time
        currentStart = new Date(0);
        compStart = new Date(0);
        compEnd = new Date(0);
        label = 'All Time';
      }
    } else {
      // Cardio logic unchanged
      const days = cardioTimeRange === '7d' ? 7 : cardioTimeRange === '30d' ? 30 : 90;
      
      currentStart = new Date(now);
      currentStart.setDate(now.getDate() - (days - 1));
      currentStart.setHours(0, 0, 0, 0);
      
      compEnd = new Date(currentStart);
      compEnd.setDate(currentStart.getDate() - 1);
      compEnd.setHours(23, 59, 59, 999);
      
      compStart = new Date(compEnd);
      compStart.setDate(compEnd.getDate() - (days - 1));
      compStart.setHours(0, 0, 0, 0);

      label = `Last ${days} Days`;
    }

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
      rangeLabel: label
    };
  }, [workouts, strengthTimeRange, cardioTimeRange, activityType]);

  // Working Sets Calculation for Strength
  const { currentWorkingSets, compWorkingSets } = useMemo(() => {
    const countSets = (list: Workout[]) => {
      return list.reduce((total, w) => {
        return total + w.exercises.reduce((exTotal, ex) => exTotal + ex.sets.length, 0);
      }, 0);
    };

    return {
      currentWorkingSets: countSets(currentWorkouts),
      compWorkingSets: countSets(comparisonWorkouts)
    };
  }, [currentWorkouts, comparisonWorkouts]);

  // Muscle Distribution for Strength (Based on Working Sets, 1 Primary Group per Exercise)
  const muscleDistribution = useMemo(() => {
    const counts: Record<PrimaryMuscleGroup, number> = {
      Chest: 0,
      Back: 0,
      Shoulders: 0,
      Biceps: 0,
      Triceps: 0,
      Quads: 0,
      Hamstrings: 0,
      Glutes: 0,
      Calves: 0,
      Core: 0
    };

    let totalWorkingSets = 0;

    currentWorkouts.forEach(w => {
      w.exercises.forEach(ex => {
        const primaryGroup = getPrimaryMuscleGroup(ex);
        const setCount = ex.sets.length;
        counts[primaryGroup] += setCount;
        totalWorkingSets += setCount;
      });
    });

    const data = PRIMARY_MUSCLE_GROUPS.map(group => {
      const sets = counts[group];
      const percentage = totalWorkingSets > 0 ? (sets / totalWorkingSets) * 100 : 0;
      return {
        name: group,
        sets,
        percentage,
        formattedPercentage: Math.round(percentage * 10) / 10,
        color: MUSCLE_COLORS[group]
      };
    })
    .filter(item => item.sets > 0)
    .sort((a, b) => b.sets - a.sets);

    return { data, totalWorkingSets };
  }, [currentWorkouts]);

  // Summary Stats based on filtered range (Retains Cardio Volume logic intact)
  const rangeStats = useMemo(() => {
    const calculateVolume = (list: Workout[]) => {
      return list.reduce((total, w) => {
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
        volume: currentVol - lastVol,
        workingSets: currentWorkingSets - compWorkingSets
      }
    };
  }, [currentWorkouts, comparisonWorkouts, activityType, currentWorkingSets, compWorkingSets]);

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
    
    if (sorted.length > 0 && (!selectedExercise || !names.has(selectedExercise))) {
      setSelectedExercise(sorted[0]);
    }
    return sorted;
  }, [workouts, activityType, selectedExercise]);

  const chronologicalWorkouts = useMemo(() => {
    return [...workouts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [workouts]);

  // Volume Chart Data (For Cardio ONLY)
  const volumeData = useMemo(() => {
    let runningTotal = 0;
    
    const data = currentWorkouts
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(w => {
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

    let currentMax = 0;
    const allTimeWithPRs = allTimeData.map(item => {
      const isPR = item.value > currentMax;
      if (isPR) currentMax = item.value;
      return { ...item, isPR };
    });

    const latestPRIdx = allTimeWithPRs.reduce((acc, curr, idx) => curr.isPR ? idx : acc, -1);
    
    return allTimeWithPRs
      .filter(item => {
        const d = new Date(item.fullDate);
        return d >= rangeStart && d <= rangeEnd;
      })
      .map(item => ({
        ...item,
        isLatestPR: allTimeWithPRs.findIndex(orig => orig.fullDate === item.fullDate) === latestPRIdx
      }));
  }, [chronologicalWorkouts, selectedExercise, activityType, rangeStart, rangeEnd]);

  // Global Milestones (Ignore Range Filters)
  const { bestPR, prevPR, absoluteMax } = useMemo(() => {
    if (!selectedExercise) return { bestPR: null, prevPR: null, absoluteMax: 0 };

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

        {/* Time Filters */}
        <div className="flex bg-slate-800/40 p-1 rounded-2xl border border-slate-700/40">
          {activityType === 'strength' ? (
            <>
              <button
                onClick={() => setStrengthTimeRange('this_week')}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  strengthTimeRange === 'this_week' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-400'
                }`}
              >
                THIS WEEK
              </button>
              <button
                onClick={() => setStrengthTimeRange('30d')}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  strengthTimeRange === '30d' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-400'
                }`}
              >
                LAST 30 DAYS
              </button>
              <button
                onClick={() => setStrengthTimeRange('all_time')}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  strengthTimeRange === 'all_time' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-400'
                }`}
              >
                ALL TIME
              </button>
            </>
          ) : (
            (['7d', '30d', '90d'] as CardioTimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setCardioTimeRange(range)}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  cardioTimeRange === range ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-400'
                }`}
              >
                Last {range.slice(0, -1)} Days
              </button>
            ))
          )}
        </div>
      </div>

      {/* Summary Stats Card */}
      <div className="bg-slate-800/40 border border-slate-700/60 p-5 rounded-[2rem] shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-indigo-400" />
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Summary · {rangeLabel}</h3>
          </div>
          <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
            {activityType === 'strength' && strengthTimeRange === 'all_time' ? (
              'All Recorded Sessions'
            ) : (
              `${rangeStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${rangeEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            )}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Sessions</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{rangeStats.count}</span>
              {activityType === 'strength' && strengthTimeRange === 'all_time' ? null : renderDelta(rangeStats.deltas.count)}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
              {activityType === 'strength' ? 'Working Sets' : 'Total Volume'}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">
                {activityType === 'strength' ? currentWorkingSets.toLocaleString() : rangeStats.volume.toLocaleString()}
              </span>
              {activityType !== 'strength' && (
                <span className="text-[10px] font-bold text-slate-500 uppercase">KM</span>
              )}
            </div>
            {activityType === 'strength' ? (
              strengthTimeRange === 'all_time' ? null : renderDelta(rangeStats.deltas.workingSets, 'sets')
            ) : (
              renderDelta(rangeStats.deltas.volume, 'KM')
            )}
          </div>
        </div>
      </div>

      {/* Strength: MUSCLE DISTRIBUTION (Donut Chart) | Cardio: VOLUME PER SESSION */}
      {activityType === 'strength' ? (
        <div className="bg-slate-800/40 border border-slate-700/60 p-5 rounded-[2rem] shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <PieChartIcon size={14} className="text-emerald-400" />
                <h3 className="text-xs font-black text-slate-200 uppercase tracking-[0.2em]">Muscle Distribution</h3>
              </div>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Based on Working Sets</p>
            </div>
            <span className="text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20 uppercase tracking-widest">
              {rangeLabel}
            </span>
          </div>

          {muscleDistribution.totalWorkingSets > 0 ? (
            <div>
              {/* Donut Chart with Center Label */}
              <div className="relative w-full h-56 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip 
                      contentStyle={{backgroundColor: '#0f172a', borderRadius: '1rem', border: '1px solid #334155', color: '#fff'}}
                      formatter={(val: any, name: any) => {
                        const item = muscleDistribution.data.find(d => d.name === name);
                        return [`${val} sets (${item?.formattedPercentage}%)`, name];
                      }}
                    />
                    <Pie
                      data={muscleDistribution.data}
                      dataKey="sets"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={3}
                      stroke="#0f172a"
                      strokeWidth={2}
                    >
                      {muscleDistribution.data.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Center Content: Total Working Sets */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-black text-white leading-none">
                    {muscleDistribution.totalWorkingSets}
                  </span>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">
                    Working Sets
                  </span>
                </div>
              </div>

              {/* Legend with percentages and set counts */}
              <div className="grid grid-cols-2 gap-2 mt-6 pt-4 border-t border-slate-700/40">
                {muscleDistribution.data.map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/40 border border-slate-700/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-[11px] font-black text-slate-200 uppercase truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 pl-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{item.sets}s</span>
                      <span className="text-xs font-black text-emerald-400">{item.formattedPercentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-[10px] font-bold text-slate-600 uppercase tracking-widest gap-2">
              <Dumbbell size={24} className="opacity-20" />
              No working sets recorded in this period
            </div>
          )}
        </div>
      ) : (
        /* Cardio Volume Chart (Unchanged) */
        <div className="bg-slate-800/40 border border-slate-700/60 p-5 rounded-[2rem] shadow-sm">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  {aggregationType === 'weekly' ? 'Volume per Session' : 'Accumulated Volume'} · {rangeLabel}
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
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: '700'}} />
                    <Tooltip contentStyle={{backgroundColor: '#0f172a', borderRadius: '1rem', border: '1px solid #334155', color: '#fff'}} cursor={{fill: '#1e293b', radius: 4}} formatter={(val: any) => [`${val.toLocaleString()} KM`, 'Volume']} />
                    <Bar dataKey="volume" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                ) : (
                  <AreaChart data={volumeData}>
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: '700'}} />
                    <Tooltip contentStyle={{backgroundColor: '#0f172a', borderRadius: '1rem', border: '1px solid #334155', color: '#fff'}} formatter={(val: any) => [`${val.toLocaleString()} KM`, 'Total Volume']} />
                    <Area type="monotone" dataKey="volume" stroke="#22d3ee" fill="url(#areaGrad)" strokeWidth={3} />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[10px] font-bold text-slate-600 uppercase tracking-widest">No activity in this period</div>
            )}
          </div>
        </div>
      )}

      {/* Exercise Progress Tracker (Unchanged) */}
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
               No records in this {rangeLabel} window
            </div>
          )}
        </div>

        {/* Global Milestones Section (Unchanged) */}
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

