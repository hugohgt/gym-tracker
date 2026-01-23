import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Workout } from '../types';
import { Plus, X, User, Trash2, Edit2, Check, ArrowLeft, AlertTriangle, Calendar, Info, CheckCircle2, Download, Upload, AlertCircle, RefreshCw, Layers } from 'lucide-react';

interface ProfileSwitcherProps {
  profiles: UserProfile[];
  workouts: Workout[];
  activeUserId: string | null;
  customCategories: string[];
  onUpdate: (profiles: UserProfile[], activeId: string | null) => void;
  onImportAll: (data: any, mode: 'replace' | 'merge') => void;
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

const ProfileSwitcher: React.FC<ProfileSwitcherProps> = ({ profiles, workouts, activeUserId, customCategories, onUpdate, onImportAll, onClose, forceCreate = false }) => {
  const [isCreating, setIsCreating] = useState(forceCreate);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  
  // Modal & Input state
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [pendingImportData, setPendingImportData] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Toast state
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

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
    const updatedProfiles = profiles.filter(p => p.id !== id);
    const nextActiveId = activeUserId === id ? (updatedProfiles.length > 0 ? updatedProfiles[0].id : null) : activeUserId;
    
    // Parent handles main state persistence, but if they chose to delete workouts we need to signal that
    // In our current architecture, workouts are in a single flat list in App.tsx
    // So we tell the parent to update the profile list, and App.tsx handles the userId mapping.
    // However, the actual workout deletion must happen in the App.tsx state.
    // For now, we update profiles. To fully delete workouts, App.tsx should filter workouts
    // when a profile is removed.
    
    onUpdate(updatedProfiles, nextActiveId);
    setShowDeleteModal(null);
    
    setToast({ message: "Profile updated", type: 'success' });
  };

  const handleExport = () => {
    try {
      const activeUser = profiles.find(p => p.id === activeUserId);
      const activeName = activeUser ? activeUser.name : 'full-backup';
      
      // Filter workouts for current profile
      const exportedWorkouts = activeUserId 
        ? workouts.filter(w => w.userId === activeUserId)
        : workouts;

      // Debug logs as requested
      console.log('Export profileId', activeUserId);
      console.log('Total workouts in state', workouts.length);
      console.log('Workouts exported', exportedWorkouts.length);

      const exportData = {
        version: 1,
        profileName: activeName,
        profiles: activeUserId ? profiles.filter(p => p.id === activeUserId) : profiles,
        activeUserId,
        customCategories,
        workouts: exportedWorkouts,
        exportedAt: new Date().toISOString()
      };

      const sanitizedName = activeName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-_]/g, '');

      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `gym-tracker_${sanitizedName}_${dateStr}.json`;

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setToast({ message: "Export bundle created", type: 'success' });
    } catch (error) {
      console.error("Export failed", error);
      setToast({ message: "Export failed", type: 'error' });
    }
  };

  const handleFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        
        // Validation: New format uses 'workouts' array, legacy used 'allWorkouts' map
        if (!data.version || !data.profiles || !Array.isArray(data.profiles)) {
          setToast({ message: "Invalid backup file structure.", type: 'error' });
          return;
        }

        if (data.version !== 1) {
          setToast({ message: `Unsupported backup version: ${data.version}`, type: 'error' });
          return;
        }

        setPendingImportData(data);
      } catch (err) {
        setToast({ message: "Failed to parse backup file.", type: 'error' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const executeImport = (mode: 'replace' | 'merge') => {
    if (!pendingImportData) return;
    onImportAll(pendingImportData, mode);
    setPendingImportData(null);
    setToast({ 
      message: mode === 'replace' ? "Data replaced successfully" : "Data merged successfully", 
      type: 'success' 
    });
  };

  const startEditing = (profile: UserProfile) => {
    setEditingId(profile.id);
    setNewName(profile.name);
    setSelectedColor(profile.color);
  };

  const getLastSessionText = (userId: string) => {
    const userWorkouts = workouts.filter(w => w.userId === userId);
    if (userWorkouts.length === 0) return "No sessions yet";
    
    const lastDate = new Date(userWorkouts[0].date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const lastDateMidnight = new Date(lastDate);
    lastDateMidnight.setHours(0, 0, 0, 0);
    
    const diffTime = now.getTime() - lastDateMidnight.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Last session: Today";
    if (diffDays === 1) return "Last session: Yesterday";
    return `Last session: ${diffDays} days ago`;
  };

  const getImportSummary = () => {
    if (!pendingImportData) return null;
    const data = pendingImportData as any;
    const profilesList = data.profiles || [];
    const activeProf = profilesList.find((p: any) => p.id === data.activeUserId) || profilesList[0];
    
    // Support both new 'workouts' array and legacy 'allWorkouts' map
    let totalWorkouts: number = 0;
    if (Array.isArray(data.workouts)) {
      totalWorkouts = data.workouts.length;
    } else if (data.allWorkouts) {
      // Fix: Cast Object.values to any[] and ensure reduce callback has an explicit return type to fix 'unknown' type assignment to totalWorkouts.
      totalWorkouts = (Object.values(data.allWorkouts) as any[]).reduce((acc: number, ws: any): number => acc + (ws?.length || 0), 0);
    }

    const hasExistingMatch = profiles.some(p => p.name.toLowerCase() === activeProf?.name?.toLowerCase());
    
    return {
      name: (activeProf?.name as string) || 'Unknown',
      count: totalWorkouts,
      hasMatch: hasExistingMatch
    };
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
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Profile Name</label>
                <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="ENTER NAME..." className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-4 text-white font-black uppercase tracking-tight focus:outline-none focus:border-emerald-500 transition-colors" />
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
                <button onClick={() => editingId ? handleRename(editingId) : handleCreate()} className="flex-[2] py-4 bg-emerald-500 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-emerald-500/20">{editingId ? 'Save Changes' : 'Create Profile'}</button>
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
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shadow-lg" style={{ backgroundColor: activeUser.color }}>
                      {activeUser.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={handleFilePicker} className="flex-1 py-3.5 bg-slate-800/80 border border-slate-700/60 hover:border-emerald-500/40 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] group">
                      <Upload size={14} className="text-emerald-400 group-hover:-translate-y-0.5 transition-transform" />
                      <span className="text-[9px] font-black text-white uppercase tracking-[0.15em]">Import Profile</span>
                    </button>
                    <button onClick={handleExport} className="flex-1 py-3.5 bg-slate-800/80 border border-slate-700/60 hover:border-emerald-500/40 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] group">
                      <Download size={14} className="text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
                      <span className="text-[9px] font-black text-white uppercase tracking-[0.15em]">Export Profile</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2 mb-2">Manage Profiles</h3>
              {profiles.map(p => (
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
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-[340px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6">
                <Layers size={32} />
              </div>
              
              <div className="mb-6">
                <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-1">Import Profile?</h2>
                <div className="bg-slate-950/50 rounded-2xl py-3 px-4 border border-slate-800/50 mt-4">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Backup Contents</p>
                  <p className="text-sm font-black text-white uppercase">Profile: {importSummary.name}</p>
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{importSummary.count} Workouts included</p>
                </div>
              </div>

              {importSummary.hasMatch && (
                <div className="flex items-start gap-2 text-left mb-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[9px] font-bold text-amber-500 uppercase tracking-tight leading-relaxed">
                    A profile named <span className="text-white">"{importSummary.name}"</span> already exists. Overwrite or Merge?
                  </p>
                </div>
              )}

              <div className="w-full space-y-3">
                <button 
                  onClick={() => executeImport('merge')}
                  className="w-full py-4 bg-emerald-500 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <Layers size={14} /> Merge Data
                </button>
                <button 
                  onClick={() => executeImport('replace')}
                  className="w-full py-4 bg-slate-800 text-slate-200 border border-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw size={14} /> Replace All
                </button>
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

      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[120] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className={`bg-slate-800 border ${toast.type === 'error' ? 'border-red-500/50 shadow-red-500/10' : 'border-slate-700 shadow-2xl'} rounded-2xl px-6 py-3 flex items-center gap-3`}>
            {toast.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-400" /> : <AlertTriangle size={16} className="text-red-400" />}
            <span className="text-[10px] font-black text-white uppercase tracking-widest">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSwitcher;