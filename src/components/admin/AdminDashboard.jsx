// dancers-pointe-recital/src/components/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
  Save, Calendar, Users, Plus, Trash, Database, 
  AlertCircle, X, Check, Clock, GripVertical, Trash2, Tag
} from 'lucide-react';
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from '../../firebase';
import { clsx } from 'clsx';

// DND Kit Imports
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, 
  useSensor, useSensors, TouchSensor
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function AdminDashboard({ recitalData, isAuthorized, setRecitalData }) {
  const [selectedShowId, setSelectedShowId] = useState('');
  const [editData, setEditData] = useState(null);
  const [migrationStatus, setMigrationStatus] = useState({ loading: false, error: null });
  const [isAddingShow, setIsAddingShow] = useState(false);
  const [newShowForm, setNewShowForm] = useState({ date: '', time: '', label: '' });
  
  // Custom Toast State
  const [toast, setToast] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (selectedShowId && recitalData?.[selectedShowId]) {
      setEditData(JSON.parse(JSON.stringify(recitalData[selectedShowId])));
    } else {
      setEditData(null);
    }
  }, [selectedShowId, recitalData]);

  if (!isAuthorized) return <div className="p-20 text-center font-black text-slate-300 uppercase tracking-widest">Access Denied</div>;

  // Helper function to trigger toasts
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000); // Auto-dismiss after 3 seconds
  };

  const runMigration = async () => {
    setMigrationStatus({ loading: true, error: null });
    try {
      if (!recitalData) throw new Error("No data found.");
      for (const id of Object.keys(recitalData)) {
        const clean = JSON.parse(JSON.stringify(recitalData[id], (k, v) => v === undefined ? null : v));
        await setDoc(doc(db, "program_data", id), clean);
      }
      showToast("Database Synchronized successfully", "success");
      setMigrationStatus({ loading: false, error: null });
    } catch (e) { 
      setMigrationStatus({ loading: false, error: e.message }); 
      showToast(e.message, "error");
    }
  };

  const handleSave = async () => {
    if (!editData) return;
    try {
      const cleanedActs = editData.acts.map(act => ({
        ...act,
        performers: act.performers.map(p => p.trim()).filter(p => p !== "")
      }));
      const dataToSave = { ...editData, acts: cleanedActs };
      const cleanJson = JSON.parse(JSON.stringify(dataToSave, (k, v) => v === undefined ? null : v));
      await setDoc(doc(db, "program_data", editData.id), cleanJson);
      setRecitalData(prev => ({ ...prev, [editData.id]: dataToSave }));
      
      showToast("Changes saved to Firestore", "success");
    } catch (err) { 
      showToast(err.message, "error"); 
    }
  };

  const updateAct = (index, field, value) => {
    const updatedActs = [...editData.acts];
    if (field === 'performers') updatedActs[index][field] = value.split(/[,\n]/);
    else updatedActs[index][field] = value;
    setEditData({ ...editData, acts: updatedActs });
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const oldIndex = editData.acts.findIndex(a => a.number === active.id);
      const newIndex = editData.acts.findIndex(a => a.number === over.id);
      const reordered = arrayMove(editData.acts, oldIndex, newIndex).map((a, i) => ({...a, number: i + 1}));
      setEditData({ ...editData, acts: reordered });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      
      {/* Toast Notification UI */}
      {toast && (
        <div className={clsx(
          "fixed bottom-28 md:bottom-10 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl font-bold text-sm transition-all animate-in slide-in-from-bottom-5 fade-in",
          toast.type === 'error' ? "bg-red-600 text-white shadow-red-500/30" : "bg-emerald-600 text-white shadow-emerald-500/30"
        )}>
          {toast.type === 'error' ? <AlertCircle size={20} /> : <Check size={20} />}
          {toast.message}
        </div>
      )}

      <div className="flex justify-between items-center px-1">
        <h2 className="text-3xl font-black dark:text-white">Admin Console</h2>
        <div className="flex gap-3">
          <button onClick={() => setIsAddingShow(!isAddingShow)} className="p-3 rounded-2xl bg-pink-100 dark:bg-pink-900/30 text-pink-600 transition-transform active:scale-95">
            {isAddingShow ? <X size={24} /> : <Plus size={24} />}
          </button>
          {editData && !isAddingShow && (
            <button onClick={handleSave} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
              <Save size={20} /> Save Changes
            </button>
          )}
        </div>
      </div>

      {/* Cloud Migration Status */}
      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/50 p-5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-amber-600"><Database size={20} /></div>
          <div>
            <p className="text-xs font-black uppercase text-amber-800 dark:text-amber-200 tracking-widest">Database Sync</p>
            <p className="text-[10px] text-amber-600/70">Sync local cache with Firestore</p>
          </div>
        </div>
        <button onClick={runMigration} disabled={migrationStatus.loading} className="w-full sm:w-auto text-xs font-black bg-amber-600 text-white px-6 py-2.5 rounded-xl hover:bg-amber-700 transition-colors">
          {migrationStatus.loading ? "Syncing..." : "Run Migration"}
        </button>
      </div>

      {/* ... (Rest of the component remains exactly the same, starting from isAddingShow ternary) ... */}
      
      {isAddingShow ? (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-xl border-2 border-pink-500 animate-in zoom-in duration-300">
          <h3 className="text-xs font-black text-slate-400 uppercase mb-6 tracking-[0.2em]">New Performance Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Display Title</label>
              <input type="text" placeholder="e.g. 2026 Spring Recital" className="w-full bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl dark:text-white border-none mt-1 text-lg font-bold" value={newShowForm.label} onChange={e => setNewShowForm({...newShowForm, label: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Date</label>
              <input type="date" className="w-full bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl dark:text-white border-none mt-1" value={newShowForm.date} onChange={e => setNewShowForm({...newShowForm, date: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Time</label>
              <input type="time" className="w-full bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl dark:text-white border-none mt-1" value={newShowForm.time} onChange={e => setNewShowForm({...newShowForm, time: e.target.value})} />
            </div>
          </div>
          <button onClick={() => {
            const { date, time, label } = newShowForm;
            if (!date || !time || !label) {
                showToast("Please fill out all fields", "error");
                return;
            }
            const id = new Date(`${date}T${time}`).toISOString();
            setRecitalData(prev => ({ ...prev, [id]: { id, label, acts: [] } }));
            setSelectedShowId(id);
            setIsAddingShow(false);
            showToast("Performance Created", "success");
          }} className="w-full bg-pink-600 text-white p-5 rounded-2xl font-black mt-8 shadow-lg shadow-pink-500/30">
            Create Performance
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-700">
          <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Selected Show</label>
          <div className="flex gap-4">
            <select className="flex-1 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl dark:text-white font-bold border-none appearance-none" value={selectedShowId} onChange={e => setSelectedShowId(e.target.value)}>
              <option value="">-- Choose Show to Edit --</option>
              {recitalData && Object.keys(recitalData).map(k => <option key={k} value={k}>{recitalData[k].label} ({new Date(k).toLocaleDateString()})</option>)}
            </select>
            {editData && (
              <button onClick={async () => {
                // Kept window.confirm here as it's a destructive action, but swapped the success alert to a toast.
                if(window.confirm("Are you sure you want to delete this entire show? This cannot be undone.")) {
                  try {
                      await deleteDoc(doc(db, "program_data", selectedShowId));
                      const up = {...recitalData}; delete up[selectedShowId]; setRecitalData(up); setSelectedShowId('');
                      showToast("Show deleted successfully", "success");
                  } catch (err) {
                      showToast(err.message, "error");
                  }
                }
              }} className="p-4 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl hover:bg-red-100 transition-colors">
                <Trash size={24} />
              </button>
            )}
          </div>
        </div>
      )}

      {editData && (
        <div className="space-y-6">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Act List ({editData.acts.length})</h3>
            <button onClick={() => setEditData({...editData, acts: [...editData.acts, { number: editData.acts.length+1, title: "", performers: [] }]})} className="text-pink-600 text-[10px] font-black bg-pink-50 dark:bg-pink-900/20 px-5 py-2.5 rounded-xl uppercase tracking-tighter">Add Act</button>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={editData.acts.map(a => a.number)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {editData.acts.map((act, idx) => (
                  <SortableActCard 
                    key={act.number} 
                    act={act} 
                    idx={idx} 
                    updateAct={updateAct}
                    onRemove={() => {
                        setEditData({...editData, acts: editData.acts.filter((_, i) => i !== idx)});
                        showToast(`Act #${act.number} removed`, "success");
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}

function SortableActCard({ act, idx, updateAct, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: act.number });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 1, opacity: isDragging ? 0.6 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col lg:flex-row gap-6 group relative">
      <div {...attributes} {...listeners} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-slate-300 cursor-grab active:cursor-grabbing hover:text-pink-500 transition-colors">
        <GripVertical size={24} />
      </div>
      
      <div className="lg:w-1/3 pl-6 space-y-4">
        <div className="flex gap-3">
          <div className="w-14 h-12 flex items-center justify-center font-black text-xl text-pink-600 bg-slate-50 dark:bg-slate-900 rounded-2xl">{act.number}</div>
          <div className="flex-1">
            <label className="text-[8px] font-black text-slate-300 uppercase ml-1 mb-1 block">Performance Title</label>
            <input className="w-full bg-slate-50 dark:bg-slate-900 p-3 rounded-xl font-bold dark:text-white border-none outline-none focus:ring-1 focus:ring-pink-500" value={act.title} placeholder="e.g. Senior Jazz" onChange={e => updateAct(idx, 'title', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-2">
        <div className="flex justify-between items-center px-1">
          <label className="text-[8px] font-black text-slate-300 uppercase">Dancer Roster</label>
          <span className="bg-pink-100 dark:bg-pink-900/30 text-pink-600 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">{act.performers?.length || 0} Dancers</span>
        </div>
        <div className="relative">
          <Users className="absolute left-4 top-4 text-slate-300" size={18} />
          <textarea className="w-full pl-12 pr-4 py-4 text-sm dark:text-white bg-slate-50 dark:bg-slate-900 rounded-2xl border-none outline-none focus:ring-1 focus:ring-pink-500 min-h-[140px] leading-relaxed resize-none" value={act.performers?.join('\n') || ''} placeholder="Add dancers (one per line)..." onChange={e => updateAct(idx, 'performers', e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
        </div>
      </div>

      <button onClick={onRemove} className="absolute right-4 top-4 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
        <Trash2 size={20} />
      </button>
    </div>
  );
}