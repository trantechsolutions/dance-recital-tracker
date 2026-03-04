import React, { useState, useEffect } from 'react';
import { 
  Save, Calendar, Users, ListPlus, Trash, Database, 
  AlertCircle, X, Check, Clock, GripVertical, Trash2 
} from 'lucide-react';
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from '../../firebase';
import { generateMockData } from '../../utils/mockData';

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

  if (!isAuthorized) return <div className="p-12 text-center text-slate-400 font-bold">Access Denied</div>;

  // --- MIGRATION LOGIC (The button you lost) ---
  const runMigration = async () => {
    setMigrationStatus({ loading: true, error: null });
    try {
      const mockData = generateMockData(); // Use the function above
      
      for (const key in mockData) {
        const show = mockData[key];
        await setDoc(doc(db, "program_data", show.id), show);
      }
      
      alert("300+ Dancers and 70 Acts successfully migrated to Firestore!");
      setMigrationStatus({ loading: false, error: null });
    } catch (e) {
      setMigrationStatus({ loading: false, error: e.message });
    }
  };

  // --- Show Logic ---
  const handleConfirmAddShow = () => {
    const { date, time, label } = newShowForm;
    if (!date || !time || !label) return alert("Fill all fields.");
    const id = new Date(`${date}T${time}`).toISOString();
    const newShow = { id, label, acts: [] };
    setRecitalData(prev => ({ ...prev, [id]: newShow }));
    setSelectedShowId(id);
    setIsAddingShow(false);
    setNewShowForm({ date: '', time: '', label: '' });
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
      alert("Saved to cloud!");
    } catch (err) { alert(err.message); }
  };

  // --- DND Reorder Logic ---
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = editData.acts.findIndex(a => a.number === active.id);
      const newIndex = editData.acts.findIndex(a => a.number === over.id);
      const reordered = arrayMove(editData.acts, oldIndex, newIndex).map((a, i) => ({...a, number: i + 1}));
      setEditData({ ...editData, acts: reordered });
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex justify-between items-center px-1">
        <h2 className="text-2xl font-black text-pink-600">Admin Panel</h2>
        <div className="flex gap-2">
          <button onClick={() => setIsAddingShow(!isAddingShow)} className="p-2.5 rounded-xl bg-pink-100 text-pink-600">
            {isAddingShow ? <X size={22} /> : <Calendar size={22} />}
          </button>
          {editData && !isAddingShow && (
            <button onClick={handleSave} className="bg-emerald-600 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg">
              <Save size={18} /> Save
            </button>
          )}
        </div>
      </div>

      {/* --- RE-ADDED CLOUD SYNC SECTION --- */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-bold text-xs">
            <Database size={16} /> Database Migration
          </div>
          <button 
            onClick={runMigration} 
            disabled={migrationStatus.loading} 
            className="text-[10px] font-black bg-amber-600 text-white px-4 py-2 rounded-lg"
          >
            {migrationStatus.loading ? "Processing..." : "Run Migration"}
          </button>
        </div>
        {migrationStatus.error && (
          <p className="mt-2 text-[10px] text-red-600 font-bold flex items-center gap-1">
            <AlertCircle size={12} /> {migrationStatus.error}
          </p>
        )}
      </div>

      {isAddingShow ? (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border-2 border-pink-500">
          <h3 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Create New Show</h3>
          <div className="space-y-4">
            <input type="text" placeholder="Show Label" className="w-full bg-slate-50 dark:bg-slate-900 p-3 rounded-xl dark:text-white border-none" value={newShowForm.label} onChange={e => setNewShowForm({...newShowForm, label: e.target.value})} />
            <div className="grid grid-cols-2 gap-3">
              <input type="date" className="w-full bg-slate-50 dark:bg-slate-900 p-3 rounded-xl dark:text-white border-none" value={newShowForm.date} onChange={e => setNewShowForm({...newShowForm, date: e.target.value})} />
              <input type="time" className="w-full bg-slate-50 dark:bg-slate-900 p-3 rounded-xl dark:text-white border-none" value={newShowForm.time} onChange={e => setNewShowForm({...newShowForm, time: e.target.value})} />
            </div>
            <button onClick={handleConfirmAddShow} className="w-full bg-pink-600 text-white p-4 rounded-xl font-black">
               Create Show
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <select className="w-full bg-slate-50 dark:bg-slate-900 p-3 rounded-xl dark:text-white font-bold text-sm border-none" value={selectedShowId} onChange={e => setSelectedShowId(e.target.value)}>
            <option value="">-- Choose Show to Edit --</option>
            {recitalData && Object.keys(recitalData).map(k => <option key={k} value={k}>{recitalData[k].label} ({new Date(k).toLocaleDateString()})</option>)}
          </select>
        </div>
      )}

      {editData && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-black text-slate-500 uppercase text-[10px]">Acts ({editData.acts.length})</h3>
            <button onClick={() => setEditData({...editData, acts: [...editData.acts, { number: editData.acts.length+1, title: "", performers: [] }]})} className="text-pink-600 text-[10px] font-black bg-pink-50 px-4 py-2 rounded-lg uppercase">Add Act</button>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={editData.acts.map(a => a.number)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {editData.acts.map((act, idx) => (
                  <SortableActCard 
                    key={act.number} 
                    act={act} 
                    idx={idx} 
                    updateAct={(i, f, v) => {
                      const updated = [...editData.acts];
                      if (f === 'performers') updated[i][f] = v.split(',');
                      else updated[i][f] = v;
                      setEditData({...editData, acts: updated});
                    }}
                    onRemove={() => setEditData({...editData, acts: editData.acts.filter((_, i) => i !== idx)})}
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
    <div ref={setNodeRef} style={style} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border flex gap-3 items-start group">
      <div {...attributes} {...listeners} className="mt-3 p-2 text-slate-300 cursor-grab active:cursor-grabbing">
        <GripVertical size={20} />
      </div>
      <div className="flex-1 space-y-3">
        <div className="flex gap-3">
          <div className="w-12 h-10 flex items-center justify-center font-black text-pink-600 bg-slate-50 dark:bg-slate-900 rounded-xl">{act.number}</div>
          <input className="flex-1 p-2 font-bold dark:text-white bg-transparent outline-none" value={act.title} placeholder="Act Title" onChange={e => updateAct(idx, 'title', e.target.value)} />
        </div>
        <div>
          <label className="text-[8px] font-black text-slate-300 uppercase mb-1 ml-1 flex justify-between">
            Performer List 
            <span className="normal-case font-medium opacity-50">One per line or comma separated</span>
          </label>
          <div className="relative">
            <Users className="absolute left-4 top-3 text-slate-300" size={16} />
            <textarea 
              className="w-full pl-11 pr-4 py-3 text-sm dark:text-white bg-slate-50 dark:bg-slate-900 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 border-none min-h-[100px] resize-y"
              value={act.performers?.join('\n') || ''} 
              placeholder="Jane Doe&#10;John Smith&#10;..." 
              onChange={e => updateAct(idx, 'performers', e.target.value)} 
              onKeyDown={(e) => e.stopPropagation()} 
            />
          </div>
        </div>
      </div>
      <button onClick={onRemove} className="mt-3 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
        <Trash2 size={18} />
      </button>
    </div>
  );
}