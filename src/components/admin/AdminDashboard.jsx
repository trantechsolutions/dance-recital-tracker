import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Save, Calendar, Plus, Trash2, Database,
  AlertCircle, X, Check, GripVertical, Building2, Shield, User as UserIcon, RefreshCw, Sparkles
} from 'lucide-react';
import { db } from '../../firebase';
import { seedDatabase, clearSeedData } from '../../utils/seedData';
import { collection, doc, getDoc, getDocs, setDoc, query, where, orderBy, writeBatch } from 'firebase/firestore';
import { clsx } from 'clsx';
import Papa from 'papaparse';

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
  const { isSuperAdmin, orgId, setOrgId } = useApp();

  const [selectedShowId, setSelectedShowId] = useState('');
  const [editData, setEditData] = useState(null);

  // Organization State
  const [orgData, setOrgData] = useState({ name: '', admins: [] });
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [newOrgForm, setNewOrgForm] = useState({ id: '', name: '', adminEmail: '' });
  const [newOrgAdminEmail, setNewOrgAdminEmail] = useState('');

  // UI State
  const [isAddingShow, setIsAddingShow] = useState(false);
  const [newShowForm, setNewShowForm] = useState({ date: '', time: '', label: '' });
  const [toast, setToast] = useState(null);

  // Users Table State
  const [appUsers, setAppUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [isSeeding, setIsSeeding] = useState(false);
  const [seedLog, setSeedLog] = useState([]);
  const [activeAdminTab, setActiveAdminTab] = useState(orgId ? 'shows' : 'studio');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const fetchOrg = async () => {
      if (!orgId) return;
      const snap = await getDoc(doc(db, 'organizations', orgId));
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

  // --- BATCH UPLOAD LOGIC ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !selectedShowId) {
      return showToast("Please select a performance first", "error");
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const newActs = results.data.map((row, index) => ({
            show_id: selectedShowId,
            number: parseInt(row.number) || index + 1,
            title: row.title || "Untitled Act",
            performers: row.performers ? row.performers.split(';').map(p => p.trim()) : []
          }));

          // Delete existing acts for this show
          const existingActs = await getDocs(query(collection(db, 'acts'), where('show_id', '==', selectedShowId)));
          const batch = writeBatch(db);
          existingActs.docs.forEach(d => batch.delete(d.ref));

          // Insert new acts
          newActs.forEach(act => {
            const actRef = doc(collection(db, 'acts'));
            batch.set(actRef, act);
          });
          await batch.commit();

          showToast(`Successfully uploaded ${newActs.length} acts!`, "success");

          // Refresh local state
          setRecitalData(prev => ({
            ...prev,
            [selectedShowId]: {
              ...prev[selectedShowId],
              acts: newActs.map(a => ({ number: a.number, title: a.title, performers: a.performers }))
            }
          }));
        } catch (err) {
          showToast(err.message, "error");
        }
      }
    });
  };

  // --- ORG MANAGEMENT FUNCTIONS ---
  const handleCreateOrg = async () => {
    if (!newOrgForm.id || !newOrgForm.name) return showToast("ID and Name required", "error");
    try {
      const formattedId = newOrgForm.id.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const admins = newOrgForm.adminEmail ? [newOrgForm.adminEmail] : [];

      await setDoc(doc(db, 'organizations', formattedId), {
        name: newOrgForm.name,
        admins
      });

      showToast("Studio Created Successfully!", "success");
      setIsCreatingOrg(false);
      setNewOrgForm({ id: '', name: '', adminEmail: '' });
      if (setOrgId) setOrgId(formattedId);
    } catch (e) { showToast(e.message, "error"); }
  };

  const handleClearCache = () => {
    if (window.confirm("Are you sure you want to clear the local cache? This will force a fresh download of all recital data.")) {
      localStorage.removeItem('recitalData');
      showToast("Cache cleared successfully!", "success");
      // Optionally, you can reload the page to ensure the cache is fully cleared
      window.location.reload();
    }
  };

  const handleSeedData = async () => {
    if (!window.confirm("This will create 2–4 random studios, each with 1–5 shows and 20–35 acts per show. Continue?")) return;
    setIsSeeding(true);
    setSeedLog([]);
    try {
      const result = await seedDatabase((msg) => {
        setSeedLog(prev => [...prev, msg]);
      });
      showToast(`Seeded ${result.studios} studios, ${result.shows} shows, ${result.totalActs} acts!`, "success");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      showToast("Seed failed: " + err.message, "error");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearSeedData = async () => {
    if (!window.confirm("This will delete ALL seeded studios, shows, acts, and remove related favorites from all users. Continue?")) return;
    setIsSeeding(true);
    setSeedLog([]);
    try {
      const result = await clearSeedData((msg) => {
        setSeedLog(prev => [...prev, msg]);
      });
      showToast(`Cleared ${result.studios} studios, ${result.deletedActs} acts, and cleaned ${result.usersUpdated} user(s)!`, "success");
      setOrgId(null);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      showToast("Clear failed: " + err.message, "error");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleUpdateOrgAdmins = async (newAdmins) => {
    try {
      await setDoc(doc(db, 'organizations', orgId), { admins: newAdmins }, { merge: true });
      setOrgData({ ...orgData, admins: newAdmins });
      showToast("Studio admins updated", "success");
    } catch (e) { showToast(e.message, "error"); }
  };

  // --- USER DIRECTORY LOGIC ---
  const fetchAppUsers = async () => {
    if (!isSuperAdmin) return;
    setLoadingUsers(true);
    try {
      const snap = await getDocs(query(collection(db, 'user_profiles'), orderBy('last_login', 'desc')));
      setAppUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { showToast(e.message, 'error'); }
    finally { setLoadingUsers(false); }
  };

  useEffect(() => {
    if (activeAdminTab === 'users' && appUsers.length === 0) fetchAppUsers();
  }, [activeAdminTab]);

  // --- SHOW MANAGEMENT FUNCTIONS ---
  const handleSave = async () => {
    if (!editData) return;
    try {
      const cleanedActs = editData.acts.map(act => ({
        ...act,
        performers: act.performers.map(p => p.trim()).filter(p => p !== "")
      }));

      // 1. Upsert the show record
      await setDoc(doc(db, 'shows', editData.id), {
        org_id: orgId,
        label: editData.label
      });

      // 2. Replace all acts: delete existing, then insert new
      const existingActs = await getDocs(query(collection(db, 'acts'), where('show_id', '==', editData.id)));
      const batch = writeBatch(db);
      existingActs.docs.forEach(d => batch.delete(d.ref));

      if (cleanedActs.length > 0) {
        cleanedActs.forEach(act => {
          const actRef = doc(collection(db, 'acts'));
          batch.set(actRef, {
            show_id: editData.id,
            number: act.number,
            title: act.title,
            performers: act.performers
          });
        });
      }
      await batch.commit();

      const dataToSave = { ...editData, acts: cleanedActs };
      setRecitalData(prev => ({ ...prev, [editData.id]: dataToSave }));
      showToast("Changes saved", "success");
    } catch (err) { showToast(err.message, "error"); }
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
          toast.type === 'error' ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
        )}>
          {toast.type === 'error' ? <AlertCircle size={20} /> : <Check size={20} />}
          {toast.message}
        </div>
      )}

      {/* --- RESPONSIVE TAB NAVIGATION --- */}
      {isSuperAdmin && (
        <div className="flex flex-col sm:flex-row gap-2 p-2 bg-slate-200 dark:bg-slate-800 rounded-[2rem] sm:rounded-2xl">
          <button onClick={() => setActiveAdminTab('shows')} className={clsx("flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-[1.5rem] font-bold text-sm transition-all", activeAdminTab === 'shows' ? "bg-white dark:bg-slate-700 text-pink-600 shadow-md" : "text-slate-500")}>
            <Calendar size={18} /> Manage Shows
          </button>
          <button onClick={() => setActiveAdminTab('upload')} className={clsx("flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-[1.5rem] font-bold text-sm transition-all", activeAdminTab === 'upload' ? "bg-white dark:bg-slate-700 text-pink-600 shadow-md" : "text-slate-500")}>
            <Database size={18} /> Batch Upload
          </button>
          <button onClick={() => setActiveAdminTab('studio')} className={clsx("flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-[1.5rem] font-bold text-sm transition-all", activeAdminTab === 'studio' ? "bg-white dark:bg-slate-700 text-pink-600 shadow-md" : "text-slate-500")}>
            <Building2 size={18} /> Studio Settings
          </button>
          <button onClick={() => setActiveAdminTab('users')} className={clsx("flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-[1.5rem] font-bold text-sm transition-all", activeAdminTab === 'users' ? "bg-white dark:bg-slate-700 text-pink-600 shadow-md" : "text-slate-500")}>
            <UserIcon size={18} /> Users
          </button>
        </div>
      )}

      {/* --- TAB CONTENT: BATCH UPLOAD --- */}
      {activeAdminTab === 'upload' && isSuperAdmin && (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 animate-in fade-in">
          <h3 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest">Batch Upload Acts</h3>
          <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl mb-6">
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">1. Select Target Performance</label>
            <select className="w-full bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 font-bold dark:text-white" value={selectedShowId} onChange={e => setSelectedShowId(e.target.value)}>
              <option value="">-- Choose Show --</option>
              {recitalData && Object.keys(recitalData).map(k => <option key={k} value={k}>{recitalData[k].label}</option>)}
            </select>
          </div>
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-12 text-center hover:border-pink-500 transition-colors">
            <input type="file" accept=".csv" onChange={handleFileUpload} className="mx-auto block text-sm text-slate-500 file:mr-4 file:py-2 file:px-6 file:rounded-full file:border-0 file:bg-pink-600 file:text-white file:font-bold" />
            <p className="mt-4 text-xs text-slate-400 font-medium">Headers: number, title, performers (split by ;)</p>
          </div>
        </div>
      )}

      {/* --- STUDIO SETTINGS TAB --- */}
      {activeAdminTab === 'studio' && isSuperAdmin && (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 relative overflow-hidden animate-in fade-in">
          <Building2 size={120} className="absolute -right-10 -top-10 text-slate-100 dark:text-slate-900/50 opacity-50" />
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black dark:text-white">{orgData.name || orgId || "Studio Setup"}</h3>
              <div className="flex gap-3">
                <button onClick={handleClearCache} className="bg-red-500 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase">
                  Clear Cache
                </button>
                <button onClick={() => setIsCreatingOrg(!isCreatingOrg)} className="bg-pink-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase">
                  {isCreatingOrg ? "Cancel" : "+ New Studio"}
                </button>
              </div>
            </div>

            {isCreatingOrg ? (
              <div className="space-y-4 bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                <input
                  type="text"
                  placeholder="Studio Name"
                  className="w-full p-4 rounded-xl border-none outline-none focus:ring-2 focus:ring-pink-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm transition-colors"
                  value={newOrgForm.name}
                  onChange={e => setNewOrgForm({...newOrgForm, name: e.target.value})}
                />
                <input
                  type="text"
                  placeholder="database-id"
                  className="w-full p-4 rounded-xl border-none outline-none focus:ring-2 focus:ring-pink-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm transition-colors"
                  value={newOrgForm.id}
                  onChange={e => setNewOrgForm({...newOrgForm, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')})}
                />
                <button
                  onClick={handleCreateOrg}
                  className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 p-4 rounded-xl font-black shadow-md active:scale-95 transition-all mt-2"
                >
                  Create Studio
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Shield size={16} className="text-slate-400" />
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Authorized Administrators</label>
                </div>

                <div className="space-y-2">
                  {(orgData.admins || []).map(email => (
                    <div key={email} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-sm dark:text-white ml-2">{email}</span>
                      <button
                        onClick={() => handleUpdateOrgAdmins(orgData.admins.filter(e => e !== email))}
                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 mt-4">
                  <input
                    type="email"
                    placeholder="Add admin email..."
                    className="flex-1 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl dark:text-white border border-slate-200 dark:border-slate-700 outline-none focus:border-pink-500 text-sm"
                    value={newOrgAdminEmail}
                    onChange={e => setNewOrgAdminEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newOrgAdminEmail.trim()) { handleUpdateOrgAdmins([...(orgData.admins || []), newOrgAdminEmail.trim()]); setNewOrgAdminEmail(''); }}}
                  />
                  <button
                    onClick={() => { if (newOrgAdminEmail.trim()) { handleUpdateOrgAdmins([...(orgData.admins || []), newOrgAdminEmail.trim()]); setNewOrgAdminEmail(''); }}}
                    className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white px-5 rounded-xl font-bold text-sm hover:bg-slate-300 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Seed Demo Data Section */}
          <div className="mt-6 p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-xl shrink-0">
                <Sparkles size={24} />
              </div>
              <div className="flex-1">
                <h4 className="font-black dark:text-white mb-1">Seed Demo Data</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Generate 2–4 random studios, each with 1–5 shows and 20–35 acts per show, with randomized dancer names and act titles. Each seed is unique.
                </p>
                {seedLog.length > 0 && (
                  <div className="mb-3 space-y-1">
                    {seedLog.map((msg, i) => (
                      <div key={i} className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
                        <Check size={12} className="text-emerald-500 shrink-0" /> {msg}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={handleSeedData}
                    disabled={isSeeding}
                    className={clsx(
                      "px-6 py-3 rounded-xl font-bold text-sm transition-all active:scale-95",
                      isSeeding
                        ? "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-wait"
                        : "bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-500/20"
                    )}
                  >
                    {isSeeding ? 'Working...' : 'Seed Demo Data'}
                  </button>
                  <button
                    onClick={handleClearSeedData}
                    disabled={isSeeding}
                    className={clsx(
                      "px-6 py-3 rounded-xl font-bold text-sm transition-all active:scale-95",
                      isSeeding
                        ? "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-wait"
                        : "bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-500/20"
                    )}
                  >
                    Clear Demo Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT: USER DIRECTORY --- */}
      {activeAdminTab === 'users' && isSuperAdmin && (
        <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in">
          <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <h3 className="text-2xl font-black dark:text-white">User Directory</h3>
            <button onClick={fetchAppUsers} className="p-3 text-pink-600 bg-pink-50 rounded-xl"><RefreshCw size={20} className={loadingUsers ? "animate-spin" : ""} /></button>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase text-slate-400">
              <tr><th className="px-8 py-4">User</th><th className="px-8 py-4">Favorites</th><th className="px-8 py-4 text-right">Login</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {appUsers.map(u => (
                <tr key={u.id} className="text-sm">
                  <td className="px-8 py-4 font-bold dark:text-white">{u.email || "Anonymous"}</td>
                  <td className="px-8 py-4"><span className="bg-pink-100 text-pink-600 px-3 py-1 rounded-full text-xs font-black">{u.favorites?.length || 0}</span></td>
                  <td className="px-8 py-4 text-right text-slate-400">{u.last_login ? new Date(u.last_login).toLocaleDateString() : "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- TAB CONTENT: MANAGE SHOWS --- */}
      {activeAdminTab === 'shows' && (
        <div className="space-y-8 animate-in fade-in">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-black dark:text-white">Performances</h2>
            <div className="flex gap-3">
              <button onClick={() => setIsAddingShow(!isAddingShow)} className="p-4 bg-pink-100 text-pink-600 rounded-2xl">{isAddingShow ? <X size={24} /> : <Plus size={24} />}</button>
              {editData && <button onClick={handleSave} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-emerald-500/20"><Save size={20} /> Save</button>}
            </div>
          </div>

          {isAddingShow ? (
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-xl border-2 border-pink-500 animate-in zoom-in duration-300">
              <h3 className="text-xs font-black text-slate-400 uppercase mb-6 tracking-[0.2em]">New Performance Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Display Title</label>
                  <input
                    type="text"
                    placeholder="e.g. 2026 Spring Recital"
                    className="w-full bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl text-slate-900 dark:text-white border-none mt-1 text-lg font-bold outline-none focus:ring-2 focus:ring-pink-500 transition-colors"
                    value={newShowForm.label}
                    onChange={e => setNewShowForm({...newShowForm, label: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Date</label>
                  <input
                    type="date"
                    className="w-full bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl text-slate-900 dark:text-white border-none mt-1 outline-none focus:ring-2 focus:ring-pink-500 transition-colors"
                    value={newShowForm.date}
                    onChange={e => setNewShowForm({...newShowForm, date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Time</label>
                  <input
                    type="time"
                    className="w-full bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl text-slate-900 dark:text-white border-none mt-1 outline-none focus:ring-2 focus:ring-pink-500 transition-colors"
                    value={newShowForm.time}
                    onChange={e => setNewShowForm({...newShowForm, time: e.target.value})}
                  />
                </div>
              </div>
              <button
                onClick={async () => {
                  const { date, time, label } = newShowForm;
                  if (!date || !time || !label) return showToast("Please fill out all fields", "error");

                  const id = new Date(`${date}T${time}`).toISOString();

                  // Initialize the new show locally
                  setRecitalData(prev => ({ ...prev, [id]: { id, label, acts: [] } }));

                  // Select the new show and close the form
                  setSelectedShowId(id);
                  setIsAddingShow(false);

                  // Reset form fields
                  setNewShowForm({ date: '', time: '', label: '' });
                  showToast("Performance Created locally! Add acts and hit Save.", "success");
                }}
                className="w-full bg-pink-600 text-white p-5 rounded-2xl font-black mt-8 shadow-lg shadow-pink-500/30 active:scale-95 transition-transform"
              >
                Create Performance
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700">
              <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Selected Show</label>
              <select
                className="w-full bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl font-bold dark:text-white border-none appearance-none outline-none focus:ring-2 focus:ring-pink-500"
                value={selectedShowId}
                onChange={e => setSelectedShowId(e.target.value)}
              >
                <option value="">-- Choose Performance --</option>
                {recitalData && Object.keys(recitalData).map(k => (
                  <option key={k} value={k}>{recitalData[k].label}</option>
                ))}
              </select>
            </div>
          )}

          {editData && (
            <div className="space-y-6">
              <div className="flex justify-between items-center px-1">
                <h3 className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Act List ({editData.acts.length})</h3>
                <button onClick={() => setEditData({...editData, acts: [...editData.acts, { number: editData.acts.length+1, title: "", performers: [] }]})} className="text-pink-600 font-black bg-pink-50 px-5 py-2.5 rounded-xl text-xs uppercase">Add Act</button>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={editData.acts.map(a => a.number)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-4">
                    {editData.acts.map((act, idx) => (
                      <SortableActCard key={act.number} act={act} idx={idx} updateAct={updateAct} onRemove={() => setEditData({...editData, acts: editData.acts.filter((_, i) => i !== idx)})} />
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
    <div ref={setNodeRef} style={style} className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col lg:flex-row gap-6 group relative">
      <div {...attributes} {...listeners} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 text-slate-300 cursor-grab hover:text-pink-500"><GripVertical size={24} /></div>
      <div className="lg:w-1/3 pl-8 space-y-4">
        <div className="flex gap-3">
          <div className="w-12 h-12 flex items-center justify-center font-black text-lg text-pink-600 bg-slate-50 dark:bg-slate-900 rounded-2xl">{act.number}</div>
          <div className="flex-1">
            <label className="text-[8px] font-black text-slate-300 uppercase block mb-1">Act Title</label>
            <input className="w-full bg-slate-50 dark:bg-slate-900 p-3 rounded-xl font-bold dark:text-white border-none outline-none focus:ring-1 focus:ring-pink-500" value={act.title} onChange={e => updateAct(idx, 'title', e.target.value)} />
          </div>
        </div>
      </div>
      <div className="flex-1">
        <label className="text-[8px] font-black text-slate-300 uppercase block mb-1">Dancers</label>
        <textarea className="w-full p-4 text-sm dark:text-white bg-slate-50 dark:bg-slate-900 rounded-2xl border-none outline-none focus:ring-1 focus:ring-pink-500 min-h-[120px] resize-none" value={act.performers?.join('\n') || ''} onChange={e => updateAct(idx, 'performers', e.target.value)} onKeyDown={e => e.stopPropagation()} />
      </div>
      <button onClick={onRemove} className="absolute right-4 top-4 p-2 text-slate-300 hover:text-red-500 transition-opacity"><Trash2 size={20} /></button>
    </div>
  );
}
