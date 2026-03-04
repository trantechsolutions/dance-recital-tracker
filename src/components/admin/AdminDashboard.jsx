import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Save, Calendar, Users, Plus, Trash2, Database, 
  AlertCircle, X, Check, GripVertical, Building2, Shield, User as UserIcon, RefreshCw
} from 'lucide-react';
import { doc, setDoc, deleteDoc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { db, DB_PREFIX } from '../../firebase';
import { clsx } from 'clsx';
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

export default function AdminDashboard({ recitalData, setRecitalData }) {
  const { user, isSuperAdmin, orgId, setOrgId } = useApp(); // Pulled from context!

  const [selectedShowId, setSelectedShowId] = useState('');
  const [editData, setEditData] = useState(null);
  
  // Organization State
  const [orgData, setOrgData] = useState({ name: '', admins: [] });
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [newOrgForm, setNewOrgForm] = useState({ id: '', name: '', adminEmail: '' });
  const [newOrgAdminEmail, setNewOrgAdminEmail] = useState('');

  // UI State
  const [migrationStatus, setMigrationStatus] = useState({ loading: false, error: null });
  const [isAddingShow, setIsAddingShow] = useState(false);
  const [newShowForm, setNewShowForm] = useState({ date: '', time: '', label: '' });
  const [toast, setToast] = useState(null);

  // Users Table State
  const [appUsers, setAppUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState(orgId ? 'shows' : 'studio');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const fetchOrg = async () => {
      if (!orgId) return;
      const snap = await getDoc(doc(db, `${DB_PREFIX}organizations`, orgId));
      if (snap.exists()) setOrgData(snap.data());
    };
    fetchOrg();
  }, [orgId]);

  useEffect(() => {
    if (selectedShowId && recitalData?.[selectedShowId]) {
      setEditData(JSON.parse(JSON.stringify(recitalData[selectedShowId])));
    } else {
      setEditData(null);
    }
  }, [selectedShowId, recitalData]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- ORG MANAGEMENT FUNCTIONS ---
  const handleCreateOrg = async () => {
    if (!newOrgForm.id || !newOrgForm.name) return showToast("ID and Name required", "error");
    try {
      const formattedId = newOrgForm.id.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const admins = newOrgForm.adminEmail ? [newOrgForm.adminEmail] : [];
      
      await setDoc(doc(db, `${DB_PREFIX}organizations`, formattedId), { name: newOrgForm.name, admins });
      
      showToast("Studio Created Successfully!", "success");
      setIsCreatingOrg(false);
      setNewOrgForm({ id: '', name: '', adminEmail: '' });
      
      if (setOrgId) setOrgId(formattedId); 
    } catch (e) { showToast(e.message, "error"); }
  };

  const handleUpdateOrgAdmins = async (newAdmins) => {
    try {
      await updateDoc(doc(db, `${DB_PREFIX}organizations`, orgId), { admins: newAdmins });
      setOrgData({ ...orgData, admins: newAdmins });
      showToast("Studio admins updated", "success");
    } catch (e) { showToast(e.message, "error"); }
  };

  // --- FETCH ALL USERS ---
  const fetchAppUsers = async () => {
    if (!isSuperAdmin) return;
    setLoadingUsers(true);
    try {
      const snap = await getDocs(collection(db, `${DB_PREFIX}users`));
      const usersList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      usersList.sort((a, b) => new Date(b.lastLogin || 0) - new Date(a.lastLogin || 0));
      setAppUsers(usersList);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeAdminTab === 'users' && appUsers.length === 0) {
      fetchAppUsers();
    }
  }, [activeAdminTab]);

  // --- SHOW MANAGEMENT FUNCTIONS ---
  const handleSave = async () => {
    if (!editData) return;
    try {
      const cleanedActs = editData.acts.map(act => ({
        ...act,
        performers: act.performers.map(p => p.trim()).filter(p => p !== "")
      }));
      const dataToSave = { ...editData, acts: cleanedActs };
      const cleanJson = JSON.parse(JSON.stringify(dataToSave, (k, v) => v === undefined ? null : v));
      
      await setDoc(doc(db, `${DB_PREFIX}organizations/${orgId}/shows`, editData.id), cleanJson);
      setRecitalData(prev => ({ ...prev, [editData.id]: dataToSave }));
      
      showToast("Changes saved to Firestore", "success");
    } catch (err) { showToast(err.message, "error"); }
  };

  const runMigration = async () => {
    setMigrationStatus({ loading: true, error: null });
    try {
      const mockData = generateMockData();
      const newRecitalData = {};
      for (const key of Object.keys(mockData)) {
        const show = mockData[key];
        const clean = JSON.parse(JSON.stringify(show, (k, v) => v === undefined ? null : v));
        await setDoc(doc(db, `${DB_PREFIX}organizations/${orgId}/shows`, show.id), clean);
        newRecitalData[show.id] = clean;
      }
      setRecitalData(newRecitalData);
      showToast("Mock Data Synchronized!", "success");
      setMigrationStatus({ loading: false, error: null });
    } catch (e) { 
      setMigrationStatus({ loading: false, error: e.message }); 
      showToast(e.message, "error");
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
    <div className="space-y-8 animate-in fade-in duration-500 relative pb-20">
      
      {toast && (
        <div className={clsx(
          "fixed bottom-28 md:bottom-10 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl font-bold text-sm transition-all animate-in slide-in-from-bottom-5 fade-in",
          toast.type === 'error' ? "bg-red-600 text-white shadow-red-500/30" : "bg-emerald-600 text-white shadow-emerald-500/30"
        )}>
          {toast.type === 'error' ? <AlertCircle size={20} /> : <Check size={20} />}
          {toast.message}
        </div>
      )}

      {/* --- SUPER ADMIN NAVIGATION --- */}
      {isSuperAdmin && (
        <div className="flex gap-2 p-1 bg-slate-200 dark:bg-slate-800 rounded-2xl overflow-x-auto hide-scrollbar">
          <button onClick={() => setActiveAdminTab('shows')} className={clsx("flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all", activeAdminTab === 'shows' ? "bg-white dark:bg-slate-700 text-pink-600 shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-white")}>
            <Calendar size={18} /> Manage Shows
          </button>
          <button onClick={() => setActiveAdminTab('studio')} className={clsx("flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all", activeAdminTab === 'studio' ? "bg-white dark:bg-slate-700 text-pink-600 shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-white")}>
            <Building2 size={18} /> Studio Settings
          </button>
          <button onClick={() => setActiveAdminTab('users')} className={clsx("flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all", activeAdminTab === 'users' ? "bg-white dark:bg-slate-700 text-pink-600 shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-white")}>
            <UserIcon size={18} /> Registered Users
          </button>
        </div>
      )}

      {/* --- STUDIO SETTINGS TAB --- */}
      {activeAdminTab === 'studio' && isSuperAdmin && (
        <div className="bg-slate-50 dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden animate-in fade-in">
          <Building2 size={120} className="absolute -right-10 -top-10 text-slate-200 dark:text-slate-800 opacity-50 pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h3 className="text-[10px] font-black uppercase text-pink-600 dark:text-pink-500 tracking-[0.2em] mb-1">Global Organization Settings</h3>
                <h4 className="text-2xl font-black dark:text-white">{orgData.name || orgId || "No Studio Selected"}</h4>
              </div>
              <button
                onClick={() => setIsCreatingOrg(!isCreatingOrg)}
                className="px-5 py-2.5 bg-pink-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-transform active:scale-95 shadow-lg shadow-pink-500/30"
              >
                {isCreatingOrg ? "Cancel" : "+ Create New Studio"}
              </button>
            </div>

            {isCreatingOrg ? (
              <div className="space-y-4 animate-in zoom-in duration-300 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-pink-200 dark:border-pink-900">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Studio Display Name</label>
                  <input type="text" placeholder="e.g. Center Stage Academy" className="w-full bg-slate-50 dark:bg-slate-900 p-4 rounded-xl dark:text-white border-none font-bold outline-none focus:ring-2 focus:ring-pink-500" value={newOrgForm.name} onChange={e => setNewOrgForm({...newOrgForm, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Database ID</label>
                    <input type="text" placeholder="center-stage-26" className="w-full bg-slate-50 dark:bg-slate-900 p-4 rounded-xl dark:text-white border-none font-bold outline-none focus:ring-2 focus:ring-pink-500 lowercase" value={newOrgForm.id} onChange={e => setNewOrgForm({...newOrgForm, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Owner Email</label>
                    <input type="email" placeholder="owner@studio.com" className="w-full bg-slate-50 dark:bg-slate-900 p-4 rounded-xl dark:text-white border-none font-bold outline-none focus:ring-2 focus:ring-pink-500" value={newOrgForm.adminEmail} onChange={e => setNewOrgForm({...newOrgForm, adminEmail: e.target.value})} />
                  </div>
                </div>
                <button onClick={handleCreateOrg} className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 p-4 rounded-xl font-black active:scale-95 transition-transform mt-2">
                  Initialize Studio
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-w-2xl">
                <div className="flex items-center gap-2 px-1">
                  <Shield size={16} className="text-slate-400" />
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Studio Administrators</label>
                </div>
                {(orgData.admins || []).map(email => (
                  <div key={email} className="flex justify-between items-center bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <span className="text-sm font-bold dark:text-white ml-2">{email}</span>
                    <button onClick={() => handleUpdateOrgAdmins((orgData.admins || []).filter(e => e !== email))} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                ))}
                {orgId && (
                  <div className="flex gap-2 mt-2">
                    <input type="email" placeholder="Add teacher@studio.com" className="flex-1 bg-white dark:bg-slate-800 p-3 rounded-xl dark:text-white border border-slate-200 dark:border-slate-700 outline-none focus:border-pink-500 text-sm shadow-sm" value={newOrgAdminEmail} onChange={e => setNewOrgAdminEmail(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newOrgAdminEmail.trim()) { handleUpdateOrgAdmins([...(orgData.admins || []), newOrgAdminEmail.trim()]); setNewOrgAdminEmail(''); }}} />
                    <button onClick={() => { if (newOrgAdminEmail.trim()) { handleUpdateOrgAdmins([...(orgData.admins || []), newOrgAdminEmail.trim()]); setNewOrgAdminEmail(''); }}} className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white px-5 rounded-xl font-bold text-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                      Add
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- USERS TAB --- */}
      {activeAdminTab === 'users' && isSuperAdmin && (
        <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in fade-in">
          <div className="p-6 md:p-8 flex justify-between items-center border-b border-slate-100 dark:border-slate-700">
            <div>
              <h3 className="text-2xl font-black dark:text-white">User Directory</h3>
              <p className="text-sm font-medium text-slate-400 mt-1">Total Registered Accounts: {appUsers.length}</p>
            </div>
            <button onClick={fetchAppUsers} className="p-3 bg-pink-50 dark:bg-pink-900/20 text-pink-600 rounded-xl hover:bg-pink-100 dark:hover:bg-pink-900/40 transition-colors">
              <RefreshCw size={20} className={clsx(loadingUsers && "animate-spin")} />
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Account / Email</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Favorites Saved</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Last Login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {appUsers.map(appUser => (
                  <tr key={appUser.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold dark:text-white">{appUser.email || "Anonymous Account"}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{appUser.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center justify-center bg-pink-100 dark:bg-pink-900/30 text-pink-600 font-black text-xs px-3 py-1 rounded-full">
                        {appUser.favorites?.length || 0} Dancers
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-slate-500 dark:text-slate-400">
                      {appUser.lastLogin ? new Date(appUser.lastLogin).toLocaleDateString() : "Unknown"}
                    </td>
                  </tr>
                ))}
                {appUsers.length === 0 && !loadingUsers && (
                  <tr>
                    <td colSpan="3" className="px-6 py-12 text-center text-slate-400 font-medium">
                      No users have registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- SHOWS TAB --- */}
      {activeAdminTab === 'shows' && (
        <div className="space-y-8 animate-in fade-in">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-3xl font-black dark:text-white">Performances</h2>
            <div className="flex gap-3">
              <button onClick={() => setIsAddingShow(!isAddingShow)} className="p-3 rounded-2xl bg-pink-100 dark:bg-pink-900/30 text-pink-600 transition-transform active:scale-95">
                {isAddingShow ? <X size={24} /> : <Plus size={24} />}
              </button>
              {editData && !isAddingShow && (
                <button onClick={handleSave} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
                  <Save size={20} /> Save
                </button>
              )}
            </div>
          </div>

          {isSuperAdmin && !editData && !isAddingShow && (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/50 p-5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-amber-600"><Database size={20} /></div>
                <div>
                  <p className="text-xs font-black uppercase text-amber-800 dark:text-amber-200 tracking-widest">Database Sync</p>
                  <p className="text-[10px] text-amber-600/70">Inject mock data into this studio</p>
                </div>
              </div>
              <button onClick={runMigration} disabled={migrationStatus.loading} className="w-full sm:w-auto text-xs font-black bg-amber-600 text-white px-6 py-2.5 rounded-xl hover:bg-amber-700 transition-colors">
                {migrationStatus.loading ? "Syncing..." : "Inject Mock Data"}
              </button>
            </div>
          )}

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
                if (!date || !time || !label) return showToast("Please fill out all fields", "error");
                const id = new Date(`${date}T${time}`).toISOString();
                setRecitalData(prev => ({ ...prev, [id]: { id, label, acts: [] } }));
                setSelectedShowId(id);
                setIsAddingShow(false);
                showToast("Performance Created", "success");
              }} className="w-full bg-pink-600 text-white p-5 rounded-2xl font-black mt-8 shadow-lg shadow-pink-500/30 active:scale-95 transition-transform">
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
                    if(window.confirm("Delete this entire show? This cannot be undone.")) {
                      try {
                          await deleteDoc(doc(db, `${DB_PREFIX}organizations/${orgId}/shows`, selectedShowId));
                          const up = {...recitalData}; delete up[selectedShowId]; setRecitalData(up); setSelectedShowId('');
                          showToast("Show deleted", "success");
                      } catch (err) { showToast(err.message, "error"); }
                    }
                  }} className="p-4 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl hover:bg-red-100 transition-colors">
                    <Trash2 size={24} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* --- ACT EDITOR --- */}
          {editData && (
            <div className="space-y-6 pt-6 border-t border-slate-200 dark:border-slate-700">
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