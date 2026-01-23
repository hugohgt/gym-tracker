
import React, { useState } from 'react';
import { Workout } from '../types';
import { BrainCircuit, Sparkles, Send, Loader2, Dumbbell, Target } from 'lucide-react';
import { getWorkoutFeedback, generatePlan } from '../services/geminiService';

interface AICoachProps {
  workouts: Workout[];
}

const AICoach: React.FC<AICoachProps> = ({ workouts }) => {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [goalPrompt, setGoalPrompt] = useState('');
  const [aiPlan, setAiPlan] = useState<any | null>(null);

  const fetchAnalysis = async () => {
    if (workouts.length < 1) return;
    setLoading(true);
    try {
      const result = await getWorkoutFeedback(workouts);
      setFeedback(result);
    } catch (e) {
      setFeedback("Sorry, I couldn't crunch the numbers right now.");
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!goalPrompt) return;
    setLoading(true);
    try {
      const plan = await generatePlan(goalPrompt);
      setAiPlan(plan);
      setGoalPrompt('');
    } catch (e) {
      alert("Error generating plan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-indigo-500 rounded-xl">
          <BrainCircuit className="text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">AI Coach</h2>
          <p className="text-xs text-slate-500 uppercase font-black tracking-widest">Powered by Gemini 3</p>
        </div>
      </div>

      {/* Analysis Section */}
      <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 overflow-hidden relative">
        <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
          <Sparkles size={14} className="text-indigo-400" />
          Progress Analysis
        </h3>
        
        {loading && !aiPlan ? (
          <div className="py-8 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-indigo-400" size={32} />
            <p className="text-sm font-medium animate-pulse">Calculating muscle metrics...</p>
          </div>
        ) : feedback ? (
          <div className="prose prose-invert prose-sm">
            <div className="whitespace-pre-wrap text-slate-200 leading-relaxed bg-slate-900/40 p-4 rounded-xl border border-slate-700">
              {feedback}
            </div>
            <button 
              onClick={fetchAnalysis}
              className="mt-4 text-xs font-bold text-indigo-400 uppercase tracking-wider"
            >
              Refresh Analysis
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-slate-400 mb-4">I can analyze your last sessions to help you optimize your training.</p>
            <button 
              onClick={fetchAnalysis}
              disabled={workouts.length < 1}
              className="px-6 py-2.5 bg-indigo-500 disabled:bg-slate-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
            >
              Start Analysis
            </button>
          </div>
        )}
      </section>

      {/* Planner Section */}
      <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
          <Target size={14} className="text-emerald-400" />
          AI Routine Generator
        </h3>
        
        <div className="flex gap-2 mb-4">
          <input 
            value={goalPrompt}
            onChange={(e) => setGoalPrompt(e.target.value)}
            placeholder="e.g., hypertrophy for back and biceps"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50"
          />
          <button 
            onClick={handleGeneratePlan}
            disabled={loading || !goalPrompt}
            className="p-3 bg-emerald-500 text-white rounded-xl active:scale-95 transition-transform disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>

        {aiPlan && (
          <div className="mt-6 space-y-4">
            <div className="p-4 bg-slate-900 border border-emerald-500/30 rounded-xl">
              <h4 className="font-bold text-emerald-400 mb-4 flex items-center gap-2">
                <Dumbbell size={16} />
                {aiPlan.title}
              </h4>
              <div className="space-y-4">
                {aiPlan.exercises.map((ex: any, i: number) => (
                  <div key={i} className="border-b border-slate-800 pb-3 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-bold text-slate-100 text-sm">{ex.name}</p>
                      <span className="text-xs font-black text-slate-500 uppercase">{ex.sets} x {ex.reps}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">{ex.tips}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default AICoach;
