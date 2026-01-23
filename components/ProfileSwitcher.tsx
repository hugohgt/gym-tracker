
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Workout } from '../types';
import { Plus, X, User, Trash2, Edit2, Check, ArrowLeft, AlertTriangle, Calendar, Info, CheckCircle2, Download, Share2 } from 'lucide-react';

interface ProfileSwitcherProps {
  profiles: UserProfile[];
  activeUserId: string | null;
  onUpdate: (profiles: UserProfile[], activeId: string | null) => void;
  onClose?: () => void;
  forceCreate?: boolean;
}

const COLORS = [
  '#10b981', // emerald
  '#22d3ee', // cyan
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#f43f5e', // rose
  '#8b5cf6', // violet
];

const ProfileSwitcher: React.FC<ProfileSwitcherProps> = ({ profiles, activeUserId, onUpdate, onClose, forceCreate = false }) => {
  const [isCreating, setIsCreating] = useState(forceCreate);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  
  // Deletion state
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  
  // Toast state
  const [toast, setToast] = useState<string | null>(null);

  // Clear toast after 4 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const newProfile: UserProfile = {
      id: Date.now().toString(),
      name: newName.trim(),
      color: selectedColor,
    };
    const updated = [...profiles, newProfile];
    onUpdate(updated, newProfile.id);
    setNewName('');
    setIsCreating(false);
  };

  const handleRename = (id: string) => {
    if (!newName.trim()) {
      setEditingId(null);
      return;
    }
    const updated = profiles.map(p => p.id === id ? { ...p, name: newName.trim(), color: selectedColor } : p);
    onUpdate(updated, activeUserId);
    setEditingId(null);
    setNewName('');
  };

  const executeDelete = (id: string, deleteWorkouts: boolean) => {
    const updated = profiles.filter(p => p.id !== id);
    const nextActiveId = activeUserId === id ? (updated.length > 0 ? updated[0].id : null) : activeUserId;
    
    if (deleteWorkouts) {
      localStorage.removeItem(`ironlog_workouts_${id}`);
    }
    
    onUpdate(updated, nextActiveId);
    setShowDeleteModal(null);
    
    // Set toast message based on deletion choice
    setToast(deleteWorkouts ? "Profile and workouts deleted" : "Profile deleted");
  };

  const handleExport = () => {
    const activeUser = profiles.find(p => p.id === activeUserId);
    if (!activeUser) return;

    try {
      const workoutData = localStorage.getItem(`ironlog_workouts_${activeUserId}`);
      const workouts = workoutData ? JSON.parse(workoutData) : [];
      
      const exportData = {
        user: activeUser,
        workouts: workouts,
        exportedAt: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `gym-tracker_${activeUser.name.toLowerCase().replace(/\s+/g, '-')}_${dateStr}.json`;

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setToast("Export created");
    } catch (error) {
      console.error("Export failed", error);
      setToast("Export failed");
    }
  };

  const startEditing = (profile: UserProfile) => {
    setEditingId(profile.id);
    setNewName(profile.name);
    setSelectedColor(profile.color);
  };

  const getLastSessionText = (userId: string) => {
    try {
      const data = localStorage.getItem(`ironlog_workouts_${userId}`);
      if (!data) return "No sessions yet";
      const workouts: Workout[] = JSON.parse(data);
      if (!workouts || workouts.length === 0) return "No sessions yet";
      
      // Workouts are typically sorted newest first
      const lastDate = new Date(workouts[0].date);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const lastDateMidnight = new Date(lastDate);
      lastDateMidnight.setHours(0, 0, 0, 0);
      
      const diffTime = now.getTime() - lastDateMidnight.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return "Last session: Today";
      if (diffDays === 1) return "Last session: Yesterday";
      if (diffDays < 0) return "Last session: Future (?)";
      return `Last session: ${diffDays} days ago`;
    } catch (e) {
      return "No sessions yet";
    }
  };

  const deleteTarget = profiles.find(p => p.id === showDeleteModal);
  const isActiveBeingDeleted = activeUserId === showDeleteModal;
  const activeUser = profiles.find(p => p.id === activeUserId);

  return (
    <div className={`fixed inset-0 bg-slate-900 z-[100] flex flex-col p-6 overflow-hidden ${forceCreate ? '' : 'animate-in fade-in slide-in-from-bottom-4 duration-300'}`}>
      <header className="flex justify-between items-center mb-10 max-w-md mx-auto w-full">
        {!forceCreate && (
          <button onClick={onClose} className="p-2 -ml-2 text-slate-500 hover:text-white">
            <ArrowLeft size={24} />
          </button>
        )}
        <h1 className="text-xl font-black text-white uppercase tracking-tighter">
          {isCreating ? 'Create Profile' : editingId ? 'Edit Profile' : 'User Profiles'}
        </h1>
        <div className="w-10"></div>
      </header>

      <div className="flex-1 max-w-md mx-auto w-full space-y-4 overflow-y-auto no-scrollbar pb-10">
        {isCreating || editingId ? (
          <div className="bg-slate-800/40 border border-slate-700/60 p-8 rounded-[2.5rem] space-y-6">
            <div className="flex flex-col items-center gap-6">
              <div 
                className="w-24 h-24 rounded-3xl flex items-center justify-center text-4xl font-black text-white shadow-xl"
                style={{ backgroundColor: selectedColor }}
              >
                {newName ? newName.charAt(0).toUpperCase() : '?'}
              </div>
              
              <div className="w-full space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Profile Name</label>
                <input 
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="ENTER NAME..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-4 text-white font-black uppercase tracking-tight focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="w-full space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Profile Color</label>
                <div className="flex justify-between">
                  {COLORS.map(c => (
                    <button 
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      className={`w-10 h-10 rounded-xl border-4 transition-transform active:scale-90 ${selectedColor === c ? 'border-white' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="w-full pt-4 flex gap-3">
                {!forceCreate && (
                  <button 
                    onClick={() => { setIsCreating(false); setEditingId(null); setNewName(''); }}
                    className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                )}
                <button 
                  onClick={() => editingId ? handleRename(editingId) : handleCreate()}
                  className="flex-[2] py-4 bg-emerald-500 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                >
                  {editingId ? 'Save Changes' : 'Create Profile'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {activeUser && (
              <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-[2rem] p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1">Active Profile</h2>
                      <p className="text-lg font-black text-white uppercase tracking-tight">{activeUser.name}</p>
                    </div>
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shadow-lg"
                      style={{ backgroundColor: activeUser.color }}
                    >
                      {activeUser.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  
                  <button 
                    onClick={handleExport}
                    className="w-full py-4 bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] group"
                  >
                    <Download size={18} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Export User Data</span>
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2 mb-2">Manage Profiles</h3>
              {profiles.map(p => (
                <div key={p.id} className="group flex items-center gap-3">
                  <button 
                    onClick={() => onUpdate(profiles, p.id)}
                    className={`flex-1 flex items-center gap-4 p-4 rounded-3xl border transition-all active:scale-[0.98] ${
                      activeUserId === p.id ? 'bg-slate-800 border-emerald-500/50 shadow-lg' : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-500'
                    }`}
                  >
                    <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-inner"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-black text-white uppercase tracking-tight text-sm">{p.name}</h3>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                        {getLastSessionText(p.id)}
                      </p>
                    </div>
                    {activeUserId === p.id && (
                      <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-slate-900">
                        <Check size={14} strokeWidth={4} />
                      </div>
                    )}
                  </button>
                  
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); startEditing(p); }}
                      className="w-10 h-10 rounded-2xl bg-slate-800/50 border border-slate-700 flex items-center justify-center text-slate-500 hover:text-white transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowDeleteModal(p.id); }}
                      className="w-10 h-10 rounded-2xl bg-slate-800/50 border border-slate-700 flex items-center justify-center text-slate-700 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => { setIsCreating(true); setNewName(''); setSelectedColor(COLORS[profiles.length % COLORS.length]); }}
              className="w-full py-8 bg-slate-800/20 border-2 border-dashed border-slate-700/50 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 text-slate-500 hover:text-emerald-400 hover:border-emerald-400/50 transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center group-hover:border-emerald-500/50 transition-colors">
                <Plus size={24} />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.2em]">Add New User</span>
            </button>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-xs p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-6">
                <AlertTriangle size={32} />
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Delete profile?</h2>
              <p className="text-xs font-medium text-slate-400 leading-relaxed mb-6 uppercase tracking-wider">
                This will remove the profile <span className="text-white font-black">"{deleteTarget.name}"</span>. 
                {isActiveBeingDeleted && (
                  <span className="block mt-2 text-amber-400/80 font-black">
                    This is your active profile. You will be switched to another one.
                  </span>
                )}
              </p>

              <div className="w-full space-y-3">
                <button 
                  onClick={() => executeDelete(deleteTarget.id, true)}
                  className="w-full py-4 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-red-500/20"
                >
                  Delete User + Workouts
                </button>
                <button 
                  onClick={() => executeDelete(deleteTarget.id, false)}
                  className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                >
                  Delete User Only
                </button>
                <button 
                  onClick={() => setShowDeleteModal(null)}
                  className="w-full py-4 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[120] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl px-6 py-3 shadow-2xl flex items-center gap-3">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">{toast}</span>
          </div>
        </div>
      )}

      {forceCreate && (
        <div className="max-w-md mx-auto w-full p-4 mt-auto">
          <p className="text-[10px] font-bold text-slate-500 text-center uppercase tracking-widest leading-relaxed">
            Welcome to IronLog. Create your first profile to begin tracking your transformation.
          </p>
        </div>
      )}
    </div>
  );
};

export default ProfileSwitcher;
