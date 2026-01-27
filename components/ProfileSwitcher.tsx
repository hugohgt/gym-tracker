
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UserProfile, Workout, WorkoutTemplate } from '../types';
import { Plus, X, User, Trash2, Edit2, Check, ArrowLeft, AlertTriangle, Calendar, Info, CheckCircle2, Download, Upload, AlertCircle, RefreshCw, Layers, Dumbbell, Heart, Sparkles, ShieldCheck } from 'lucide-react';
import { downloadAppStateAsJSON } from '../storage/appStorage';

interface ProfileSwitcherProps {
  profiles: UserProfile[];
  workouts: Workout[];
  templates: WorkoutTemplate[];
  activeUserId: string | null;
  currentAuthUserId: string;
  customCategories: string[];
  onUpdate: (profiles: UserProfile[], activeId: string | null) => void;
  onImportAll: (data: any, mode: 'replace' | 'merge') => void;
  onClose?: () => void;
  onToast?: (t: { message: string, type: 'success' | 'error', durationMs?: number } | null) => void;
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

const ProfileSwitcher: React.FC<ProfileSwitcherProps> = ({ profiles, workouts, templates, activeUserId, currentAuthUserId, customCategories, onUpdate, onImportAll, onClose, onToast, forceCreate = false }) => {
  const [isCreating, setIsCreating] = useState(forceCreate);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  
  // Modal & Input state
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [pendingImportData, setPendingImportData] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const setToast = (t: { message: string, type: 'success' | 'error', durationMs?: number } | null) => {
    if (onToast) onToast(t);
  };

  const sortedProfiles = useMemo(() => {
    const sorted = [...profiles].sort((a, b) => {
      const aActive = a.id === activeUserId;
      const bActive = b.id === activeUserId;
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      const nameA = a.name.trim().toLowerCase();
      const nameB = b.name.trim().toLowerCase();
      return nameA.localeCompare(nameB);
    });
    return sorted;
  }, [profiles, activeUserId]);

  const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

  const validateName = (name: string, currentEditingId: string | null) => {
    const trimmed = name.trim();
    if (!trimmed) return { valid: false, message: 'Name required', toast: 'Please enter a profile name.' };
    const normalized = normalizeName(name);
    const isDuplicate = profiles.some(p => p.id !== currentEditingId && normalizeName(p.name) === normalized);
    if (isDuplicate) return { valid: false, message: 'Name already in use', toast: 'That profile name already exists.' };
    return { valid: true, message: null, toast: null };
  };

  const validation = validateName(newName, editingId);

  const handleCreate = () => {
    if (!validation.valid) {
      setToast({ message: validation.toast || 'Invalid name', type: 'error' });
      return;
    }
    // Correctly using last_used_at and providing user_id
    const newProfile: UserProfile = {
      id: Date.now().toString(),
      user_id: currentAuthUserId,
      name: newName.trim().replace(/\s+/g, ' '),
      color: selectedColor,
      last_used_at: new Date().toISOString()
    };
    const updated = [...profiles, newProfile];
    onUpdate(updated, newProfile.id);
    setNewName('');
    setIsCreating(false);
  };

  const handleRename = (id: string) => {
    if (!validation.valid) {
      setToast({ message: validation.toast || 'Invalid name', type: 'error' });
      return;
    }
    const updated = profiles.map(p => p.id === id ? { ...p, name: newName.trim().replace(/\s+/g, ' '), color: selectedColor } : p);
    onUpdate(updated, activeUserId);
    setEditingId(null);
    setNewName('');
  };

  const executeDelete = (id: string, deleteWorkouts: boolean) => {
    const updatedProfiles = profiles.filter(p => p.id !== id);
    const nextActiveId = activeUserId === id ? (updatedProfiles.length > 0 ? updatedProfiles[0].id : null) : activeUserId;
    onUpdate(updatedProfiles, nextActiveId);
    setShowDeleteModal(null);
    setToast({ message: "Profile updated", type: 'success' });
  };

  const handleExport = () => {
    try {
      const activeUser = profiles.find(p => p.id === activeUserId);
      const isFullBackup = !activeUserId;
      const profileName = activeUser ? activeUser.name : 'full-app';
      
      const exportedWorkouts = activeUserId 
        ? workouts.filter(w => w.profile_id === activeUserId || w.userId === activeUserId)
        : workouts;

      // templates use profile_id for association
      const exportedTemplates = activeUserId 
        ? templates.filter(t => t.profile_id === activeUserId)
        : templates;

      const exportData = {
        version: 2,
        backupType: isFullBackup ? 'app' : 'profile',
        profileName: profileName,
        profiles: activeUserId ? profiles.filter(p => p.id === activeUserId) : profiles,
        activeUserId,
        customCategories,
        workouts: exportedWorkouts,
        templates: exportedTemplates,
        exportedAt: new Date().toISOString()
      };

      const sanitizedName = profileName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `gym-tracker_${isFullBackup ? 'full-backup' : sanitizedName}_${dateStr}.json`;

      // Reuse unified download utility
      downloadAppStateAsJSON(exportData, fileName);

      setToast({ message: `Exported: ${isFullBackup ? 'Full Backup' : profileName}`, type: 'success' });
    } catch (error) {
      setToast({ message: "Export failed", type: 'error' });
    }
  };

  const handleFilePicker = () => fileInputRef.current?.click();

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data.profiles || !Array.isArray(data.profiles)) {
          setToast({ message: 'Invalid backup format.', type: 'error' });
          return;
        }
        setPendingImportData(data);
      } catch (err) {
        setToast({ message: 'Import failed. Invalid JSON.', type: 'error' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const getImportSummary = () => {
    if (!pendingImportData) return null;
    const data = pendingImportData as any;
    const profilesList = data.profiles || [];
    const isAppBackup = data.backupType === 'app';
    
    let workoutsList: any[] = Array.isArray(data.workouts) ? data.workouts : [];
    const templatesList = Array.isArray(data.templates) ? data.templates : [];

    const breakdown = { strength: 0, cardio: 0, mobility: 0 };
    workoutsList.forEach((w: any) => {
      if (w.type === 'strength') breakdown.strength++;
      else if (w.type === 'cardio') breakdown.cardio++;
      else if (w.type === 'mobility') breakdown.mobility++;
    });

    return {
      type: isAppBackup ? 'System Archive' : 'Profile Backup',
      name: isAppBackup ? 'Full App' : (profilesList[0]?.name || 'Unknown'),
      profileCount: profilesList.length,
      count: workoutsList.length,
      templateCount: templatesList.length,
      breakdown,
      isAppBackup,
      exportedAt: data.exportedAt || data.updatedAt
    };
  };

  const executeImport = (mode: 'replace' | 'merge') => {
    if (!pendingImportData) return;
    onImportAll(pendingImportData, mode);
    setPendingImportData(null);
  };

  const startEditing = (profile: UserProfile) => {
    setEditingId(profile.id);
    setNewName(profile.name);
    setSelectedColor(profile.color);
  };

  const getLastSessionText = (userId: string) => {
    // Check both profile_id and legacy userId
    const userWorkouts = workouts.filter(w => w.profile_id === userId || w.userId === userId);
    if (userWorkouts.length === 0) return "No sessions yet";
    const lastDate = new Date(userWorkouts[0].date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const lastDateMidnight = new Date(lastDate);
    lastDateMidnight.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((now.getTime() - lastDateMidnight.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Last session: Today";
    if (diffDays === 1) return "Last session: Yesterday";
    return `Last session: ${diffDays} days ago`;
  };

  const importSummary = getImportSummary();
  const deleteTarget = profiles.find(p => p.id === showDeleteModal);
  const activeUser = profiles.find(p => p.id === activeUserId);

  return (
    <div className={`fixed inset-0 bg-slate-900 z-[100] flex flex-col p-6 overflow-hidden ${forceCreate ? '' : 'animate-in fade-in slide-in-from-bottom-4 duration-300'}`}>
      <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
      
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
                <div className="flex justify-between items-end ml-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Profile Name</label>
                  {!validation.valid && newName.trim().length > 0 && (
                    <span className="text-[9px] font-black text-red-400 uppercase tracking-tight">{validation.message}</span>
                  )}
                </div>
                <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="ENTER NAME..." className={`w-full bg-slate-900 border ${!validation.valid && newName.trim().length > 0 ? 'border-red-500/50' : 'border-slate-700'} rounded-2xl px-4 py-4 text-white font-black uppercase tracking-tight focus:outline-none focus:border-emerald-500 transition-colors`} />
              </div>
              <div className="w-full space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Profile Color</label>
                <div className="flex justify-between">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setSelectedColor(c)} className={`w-10 h-10 rounded-xl border-4 transition-transform active:scale-90 ${selectedColor === c ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="w-full pt-4 flex gap-3">
                {!forceCreate && (
                  <button onClick={() => { setIsCreating(false); setEditingId(null); setNewName(''); }} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all">Cancel</button>
                )}
                <button 
                  disabled={!validation.valid}
                  onClick={() => editingId ? handleRename(editingId) : handleCreate()} 
                  className={`flex-[2] py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg ${validation.valid ? 'bg-emerald-500 text-slate-900 active:scale-95 shadow-emerald-500/20' : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'}`}
                >
                  {editingId ? 'Save Changes' : 'Create Profile'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-[2rem] p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1">
                      {activeUser ? 'Active Profile' : 'System Management'}
                    </h2>
                    <p className="text-lg font-black text-white uppercase tracking-tight">
                      {activeUser ? activeUser.name : 'No Active User'}
                    </p>
                  </div>
                  {activeUser ? (
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shadow-lg" style={{ backgroundColor: activeUser.color }}>
                      {activeUser.name.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500">
                      <User size={20} />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button onClick={handleFilePicker} className="flex-1 py-3.5 bg-slate-800/80 border border-slate-700/60 hover:border-indigo-500/40 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] group">
                      <Upload size={14} className="text-indigo-400 group-hover:-translate-y-0.5 transition-transform" />
                      <span className="text-[9px] font-black text-white uppercase tracking-[0.15em]">Import File</span>
                    </button>
                    <button onClick={handleExport} className="flex-1 py-3.5 bg-slate-800/80 border border-slate-700/60 hover:border-emerald-500/40 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] group">
                      <Download size={14} className="text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
                      <span className="text-[9px] font-black text-white uppercase tracking-[0.15em]">Export Profile</span>
                    </button>
                  </div>
                  <button 
                    onClick={() => {
                      const exportData = {
                        version: 2,
                        backupType: 'app',
                        profileName: 'full-app',
                        profiles: profiles,
                        activeUserId,
                        customCategories,
                        workouts: workouts,
                        templates: templates,
                        exportedAt: new Date().toISOString()
                      };
                      const fileName = `gym-tracker_full-backup_${new Date().toISOString().split('T')[0]}.json`;
                      
                      // Reuse unified download utility
                      downloadAppStateAsJSON(exportData, fileName);
                      
                      setToast({ message: "Full system backup exported", type: 'success' });
                    }} 
                    className="w-full py-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-indigo-500/20 transition-all"
                  >
                    <ShieldCheck size={12} /> Create Full App Backup
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2 mb-2">Switch Users</h3>
              {sortedProfiles.map(p => (
                <div key={p.id} className="group flex items-center gap-3">
                  <button onClick={() => onUpdate(profiles, p.id)} className={`flex-1 flex items-center gap-4 p-4 rounded-3xl border transition-all active:scale-[0.98] ${activeUserId === p.id ? 'bg-slate-800 border-emerald-500/50 shadow-lg' : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-500'}`}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-inner" style={{ backgroundColor: p.color }}>{p.name.charAt(0).toUpperCase()}</div>
                    <div className="flex-1 text-left">
                      <h3 className="font-black text-white uppercase tracking-tight text-sm">{p.name}</h3>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{getLastSessionText(p.id)}</p>
                    </div>
                    {activeUserId === p.id && <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-slate-900"><Check size={14} strokeWidth={4} /></div>}
                  </button>
                  <div className="flex flex-col gap-2">
                    <button onClick={(e) => { e.stopPropagation(); startEditing(p); }} className="w-10 h-10 rounded-2xl bg-slate-800/50 border border-slate-700 flex items-center justify-center text-slate-500 hover:text-white transition-colors"><Edit2 size={16} /></button>
                    <button onClick={(e) => { e.stopPropagation(); setShowDeleteModal(p.id); }} className="w-10 h-10 rounded-2xl bg-slate-800/50 border border-slate-700 flex items-center justify-center text-slate-700 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => { setIsCreating(true); setNewName(''); setSelectedColor(COLORS[profiles.length % COLORS.length]); }} className="w-full py-8 bg-slate-800/20 border-2 border-dashed border-slate-700/50 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 text-slate-500 hover:text-emerald-400 hover:border-emerald-400/50 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center group-hover:border-emerald-500/50 transition-colors"><Plus size={24} /></div>
              <span className="text-xs font-black uppercase tracking-[0.2em]">Add New User</span>
            </button>
          </>
        )}
      </div>

      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-xs p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-6"><AlertTriangle size={32} /></div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Delete profile?</h2>
              <p className="text-xs font-medium text-slate-400 leading-relaxed mb-6 uppercase tracking-wider">This will remove the profile <span className="text-white font-black">"{deleteTarget.name}"</span> and all its association.</p>
              <div className="w-full space-y-3">
                <button onClick={() => executeDelete(deleteTarget.id, true)} className="w-full py-4 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-red-500/20">Delete Profile</button>
                <button onClick={() => setShowDeleteModal(null)} className="w-full py-4 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:text-white transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pendingImportData && importSummary && (
        <div className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-[340px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-6 ${importSummary.isAppBackup ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'}`}>
                {importSummary.isAppBackup ? <ShieldCheck size={32} /> : <Layers size={32} />}
              </div>
              
              <div className="mb-6 w-full">
                <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-1">
                  {importSummary.isAppBackup ? 'App Backup Detected' : 'Import Profile?'}
                </h2>
                <div className={`rounded-2xl py-4 px-4 border mt-4 space-y-3 text-left ${importSummary.isAppBackup ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-slate-950/50 border-slate-800/50'}`}>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Backup Summary</p>
                    <p className="text-sm font-black text-white uppercase">{importSummary.name}</p>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${importSummary.isAppBackup ? 'text-indigo-400' : 'text-emerald-400'}`}>
                      {importSummary.isAppBackup ? `${importSummary.profileCount} Profiles` : 'Single Profile'} • {importSummary.count} Workouts
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {importSummary.breakdown.strength > 0 && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 shrink-0">
                        <Dumbbell size={8} className="text-emerald-400" />
                        <span className="text-[8px] font-black text-emerald-400 uppercase">Str: {importSummary.breakdown.strength}</span>
                      </div>
                    )}
                    {importSummary.breakdown.cardio > 0 && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-500/5 border border-cyan-500/10 shrink-0">
                        <Heart size={8} className="text-cyan-400" />
                        <span className="text-[8px] font-black text-cyan-400 uppercase">Car: {importSummary.breakdown.cardio}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="w-full space-y-3">
                <button 
                  onClick={() => executeImport('merge')}
                  className="w-full py-4 bg-emerald-500 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <Layers size={14} /> Merge {importSummary.isAppBackup ? 'App' : 'Profile'} Data
                </button>
                
                {!importSummary.isAppBackup && (
                  <button 
                    onClick={() => {
                      if (window.confirm(`This will clear all existing data for this profile and replace it with the backup. Proceed?`)) {
                        executeImport('replace');
                      }
                    }}
                    className="w-full py-4 bg-slate-800 text-slate-200 border border-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
                  >
                    <RefreshCw size={14} /> Overwrite Profile Data
                  </button>
                )}

                <button 
                  onClick={() => setPendingImportData(null)}
                  className="w-full py-4 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSwitcher;
