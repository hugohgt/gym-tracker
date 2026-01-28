
import React, { useState } from 'react';
import { UserProfile, Workout, WorkoutTemplate } from '../types';
import { Download, Upload, ArrowLeft, Settings, User, Check, Edit2, ShieldCheck, Dumbbell, Heart } from 'lucide-react';
import { downloadAppStateAsJSON } from '../storage/appStorage';

interface ProfileSwitcherProps {
  profile: UserProfile;
  workouts: Workout[];
  templates: WorkoutTemplate[];
  customCategories: string[];
  onUpdate: (profile: UserProfile) => void;
  onClose?: () => void;
  onToast?: (t: { message: string, type: 'success' | 'error' } | null) => void;
}

const COLORS = ['#10b981', '#22d3ee', '#6366f1', '#f59e0b', '#f43f5e', '#8b5cf6'];

const ProfileSwitcher: React.FC<ProfileSwitcherProps> = ({ profile, workouts, templates, customCategories, onUpdate, onClose, onToast }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [color, setColor] = useState(profile.color);
  
  const handleSave = () => {
    if (!name.trim()) return;
    onUpdate({ ...profile, name: name.trim(), color });
    setIsEditing(false);
  };

  const handleExport = () => {
    const exportData = {
      version: 2,
      backupType: 'profile',
      profileName: profile.name,
      profiles: [profile],
      customCategories,
      workouts,
      templates,
      exportedAt: new Date().toISOString()
    };
    const fileName = `gym-tracker_${profile.name.toLowerCase().replace(/\s+/g, '-')}_${new Date().toISOString().split('T')[0]}.json`;
    downloadAppStateAsJSON(exportData, fileName);
    onToast?.({ message: "Backup file downloaded", type: 'success' });
  };

  return (
    <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col p-6 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
      <header className="flex justify-between items-center mb-10 max-w-md mx-auto w-full">
        <button onClick={onClose} className="p-2 -ml-2 text-slate-500 hover:text-white">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-black text-white uppercase tracking-tighter">Account Settings</h1>
        <div className="w-10"></div>
      </header>

      <div className="flex-1 max-w-md mx-auto w-full space-y-6 overflow-y-auto no-scrollbar pb-10">
        <div className="bg-slate-800/40 border border-slate-700/60 p-8 rounded-[2.5rem] space-y-6">
          <div className="flex flex-col items-center gap-6">
            <div 
              className="w-24 h-24 rounded-3xl flex items-center justify-center text-4xl font-black text-white shadow-xl transition-colors duration-500"
              style={{ backgroundColor: color }}
            >
              {name.charAt(0).toUpperCase()}
            </div>
            
            {!isEditing ? (
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">{profile.name}</h2>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-white transition-colors"
                >
                  <Edit2 size={12} /> Edit Profile
                </button>
              </div>
            ) : (
              <div className="w-full space-y-6 animate-in fade-in zoom-in-95">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Training Alias</label>
                  <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3.5 text-white font-black uppercase tracking-tight focus:outline-none focus:border-emerald-500 transition-colors" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Avatar Accent</label>
                  <div className="flex justify-between">
                    {COLORS.map(c => (
                      <button key={c} onClick={() => setColor(c)} className={`w-10 h-10 rounded-xl border-4 transition-transform active:scale-90 ${color === c ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setIsEditing(false); setName(profile.name); setColor(profile.color); }} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest">Cancel</button>
                  <button onClick={handleSave} className="flex-[2] py-4 bg-emerald-500 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-emerald-500/20">Save Profile</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-[2rem] p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Data & Backup</h3>
              <p className="text-xs font-bold text-slate-200">Manage your training archive</p>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button 
              onClick={handleExport}
              className="flex-1 py-4 bg-slate-800/80 border border-slate-700/60 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black text-white uppercase tracking-widest active:scale-95 transition-all"
            >
              <Download size={14} className="text-emerald-400" /> Export
            </button>
            <button 
              disabled
              className="flex-1 py-4 bg-slate-800/40 border border-slate-700/30 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-widest opacity-50 cursor-not-allowed"
            >
              <Upload size={14} /> Import
            </button>
          </div>
          <p className="text-[9px] text-slate-500 text-center uppercase font-bold tracking-tight">Cloud sync is active. Manual exports are optional backups.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <StatBox label="Sessions" value={workouts.length} icon={<Dumbbell size={14} />} />
          <StatBox label="Templates" value={templates.length} icon={<Heart size={14} />} />
        </div>
      </div>
    </div>
  );
};

const StatBox = ({ label, value, icon }: any) => (
  <div className="bg-slate-800/20 border border-slate-800 p-5 rounded-3xl text-center">
    <div className="flex items-center justify-center gap-1.5 text-slate-500 mb-1">
      {icon}
      <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
    </div>
    <span className="text-2xl font-black text-white">{value}</span>
  </div>
);

export default ProfileSwitcher;
