import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Save, Calendar, Plus, Trash2, Database, Upload,
  AlertCircle, X, Check, GripVertical, Building2, Shield,
  User as UserIcon, RefreshCw, Sparkles, ChevronRight, Hash, Users, Pencil
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
  const [allOrgs, setAllOrgs] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [newOrgForm, setNewOrgForm] = useState({ id: '', name: '', adminEmail: '' });
  const [newOrgAdminEmail, setNewOrgAdminEmail] = useState('');

  // UI State
  const [isAddingShow, setIsAddingShow] = useState(false);
  const [newShowForm, setNewShowForm] = useState({ date: '', time: '', label: '' });
  const [toast, setToast] = useState(null);
  const [showUploadPanel, setShowUploadPanel] = useState(false);

  // Users Table State
  const [appUsers, setAppUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Seed State
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedLog, setSeedLog] = useState([]);

  const [activeAdminTab, setActiveAdminTab] = useState(orgId ? 'shows' : 'studio');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Data Fetching ────────────────────────────────────────────────

  useEffect(() => {
    const fetchOrg = async () => {
      if (!orgId) return;
      const snap = await getDoc(doc(db, 'organizations', orgId));
      if (snap.exists()) setOrgData(snap.data());
    };
    fetchOrg();
  }, [orgId]);

  const fetchAllOrgs = async () => {
    setLoadingOrgs(true);
    try {
      const snap = await getDocs(collection(db, 'organizations'));
      setAllOrgs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { showToast(e.message, 'error'); }
    finally { setLoadingOrgs(false); }
  };

  useEffect(() => {
    if (activeAdminTab === 'studio' && isSuperAdmin && allOrgs.length === 0) fetchAllOrgs();
  }, [activeAdminTab]);

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

  // ── Show Management ──────────────────────────────────────────────

  const handleSave = async () => {
    if (!editData) return;
    try {
      const cleanedActs = editData.acts.map(act => ({
        ...act,
        performers: act.performers.map(p => p.trim()).filter(p => p !== "")
      }));

      await setDoc(doc(db, 'shows', editData.id), {
        org_id: orgId,
        label: editData.label
      });

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

  const handleCreateShow = async () => {
    const { date, time, label } = newShowForm;
    if (!date || !time || !label) return showToast("Please fill out all fields", "error");

    const id = new Date(`${date}T${time}`).toISOString();
    setRecitalData(prev => ({ ...prev, [id]: { id, label, acts: [] } }));
    setSelectedShowId(id);
    setIsAddingShow(false);
    setNewShowForm({ date: '', time: '', label: '' });
    showToast("Performance created! Add acts and hit Save.", "success");
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
      const reordered = arrayMove(editData.acts, oldIndex, newIndex).map((a, i) => ({ ...a, number: i + 1 }));
      setEditData({ ...editData, acts: reordered });
    }
  };

  // ── Single-Show CSV Upload (inline in act editor) ─────────────

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

          const existingActs = await getDocs(query(collection(db, 'acts'), where('show_id', '==', selectedShowId)));
          const batch = writeBatch(db);
          existingActs.docs.forEach(d => batch.delete(d.ref));
          newActs.forEach(act => {
            const actRef = doc(collection(db, 'acts'));
            batch.set(actRef, act);
          });
          await batch.commit();

          showToast(`Uploaded ${newActs.length} acts!`, "success");
          setRecitalData(prev => ({
            ...prev,
            [selectedShowId]: {
              ...prev[selectedShowId],
              acts: newActs.map(a => ({ number: a.number, title: a.title, performers: a.performers }))
            }
          }));
          setShowUploadPanel(false);
        } catch (err) {
          showToast(err.message, "error");
        }
      }
    });
  };

  // ── Bulk Import (multiple shows + acts from one CSV) ───────────

  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkLog, setBulkLog] = useState([]);

  const handleBulkImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!orgId) return showToast("Select a studio first", "error");

    setBulkImporting(true);
    setBulkLog([]);
    const log = (msg) => setBulkLog(prev => [...prev, msg]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data;
          if (rows.length === 0) throw new Error("CSV is empty");

          // Group rows by show name
          const showMap = {};
          for (const row of rows) {
            const showName = (row.show || '').trim();
            if (!showName) continue;
            if (!showMap[showName]) showMap[showName] = [];
            showMap[showName].push({
              number: parseInt(row.number) || (showMap[showName].length + 1),
              title: (row.title || '').trim() || 'Untitled Act',
              performers: row.performers ? row.performers.split(';').map(p => p.trim()).filter(Boolean) : [],
            });
          }

          const showNames = Object.keys(showMap);
          if (showNames.length === 0) throw new Error('No valid rows found. Make sure your CSV has a "show" column.');

          log(`Found ${showNames.length} show(s) with ${rows.length} total rows`);

          let totalActs = 0;
          const newRecitalData = { ...recitalData };

          for (const showName of showNames) {
            // Create a unique show ID from the name
            const showId = `${orgId}-${showName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now()}`;
            const acts = showMap[showName];

            log(`Creating "${showName}" (${acts.length} acts)...`);

            // Save the show document
            await setDoc(doc(db, 'shows', showId), {
              org_id: orgId,
              label: showName,
            });

            // Batch write acts (chunks of 400 for Firestore limit)
            for (let i = 0; i < acts.length; i += 400) {
              const chunk = acts.slice(i, i + 400);
              const batch = writeBatch(db);
              for (const act of chunk) {
                const actRef = doc(collection(db, 'acts'));
                batch.set(actRef, {
                  show_id: showId,
                  number: act.number,
                  title: act.title,
                  performers: act.performers,
                });
              }
              await batch.commit();
            }

            // Initialize show status
            await setDoc(doc(db, 'show_status', showId), {
              show_id: showId,
              org_id: orgId,
              current_act_number: 1,
              is_tracking: false,
              updated_at: new Date().toISOString(),
            });

            // Update local state
            newRecitalData[showId] = {
              id: showId,
              label: showName,
              acts: acts.map(a => ({ number: a.number, title: a.title, performers: a.performers })),
            };

            totalActs += acts.length;
          }

          setRecitalData(newRecitalData);
          log(`Done! Created ${showNames.length} shows with ${totalActs} acts.`);
          showToast(`Imported ${showNames.length} shows, ${totalActs} acts!`, "success");
        } catch (err) {
          log(`Error: ${err.message}`);
          showToast("Import failed: " + err.message, "error");
        } finally {
          setBulkImporting(false);
          // Reset file input so re-uploading same file triggers onChange
          e.target.value = '';
        }
      },
      error: (err) => {
        showToast("Failed to parse CSV: " + err.message, "error");
        setBulkImporting(false);
      }
    });
  };

  // ── Org Management ───────────────────────────────────────────────

  const handleCreateOrg = async () => {
    if (!newOrgForm.id || !newOrgForm.name) return showToast("ID and Name required", "error");
    try {
      const formattedId = newOrgForm.id.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const admins = newOrgForm.adminEmail ? [newOrgForm.adminEmail] : [];
      await setDoc(doc(db, 'organizations', formattedId), { name: newOrgForm.name, admins });
      showToast("Studio Created!", "success");
      setIsCreatingOrg(false);
      setNewOrgForm({ id: '', name: '', adminEmail: '' });
      if (setOrgId) setOrgId(formattedId);
    } catch (e) { showToast(e.message, "error"); }
  };

  const handleUpdateOrgAdmins = async (newAdmins) => {
    try {
      await setDoc(doc(db, 'organizations', orgId), { admins: newAdmins }, { merge: true });
      setOrgData({ ...orgData, admins: newAdmins });
      showToast("Admins updated", "success");
    } catch (e) { showToast(e.message, "error"); }
  };

  // ── Seed & Tools ─────────────────────────────────────────────────

  const handleClearCache = () => {
    if (window.confirm("Clear the local cache and reload?")) {
      localStorage.removeItem('recitalData');
      showToast("Cache cleared!", "success");
      window.location.reload();
    }
  };

  const handleSeedData = async () => {
    if (!window.confirm("This will create 2–4 random studios with shows and acts. Continue?")) return;
    setIsSeeding(true);
    setSeedLog([]);
    try {
      const result = await seedDatabase((msg) => setSeedLog(prev => [...prev, msg]));
      showToast(`Seeded ${result.studios} studios, ${result.shows} shows, ${result.totalActs} acts!`, "success");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) { showToast("Seed failed: " + err.message, "error"); }
    finally { setIsSeeding(false); }
  };

  const handleClearSeedData = async () => {
    if (!window.confirm("Delete ALL seeded data and related favorites?")) return;
    setIsSeeding(true);
    setSeedLog([]);
    try {
      const result = await clearSeedData((msg) => setSeedLog(prev => [...prev, msg]));
      showToast(`Cleared ${result.studios} studios, ${result.deletedActs} acts, cleaned ${result.usersUpdated} user(s)!`, "success");
      setOrgId(null);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) { showToast("Clear failed: " + err.message, "error"); }
    finally { setIsSeeding(false); }
  };

  // ── Users ────────────────────────────────────────────────────────

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

  // ── Computed ─────────────────────────────────────────────────────

  const showList = recitalData ? Object.entries(recitalData).map(([id, data]) => ({ id, ...data })) : [];

  // ════════════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative pb-20">

      {/* Toast */}
      {toast && (
        <div className={clsx(
          "fixed bottom-28 md:bottom-10 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl font-bold text-sm animate-in slide-in-from-bottom-5 fade-in",
          toast.type === 'error' ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
        )}>
          {toast.type === 'error' ? <AlertCircle size={20} /> : <Check size={20} />}
          {toast.message}
        </div>
      )}

      {/* ── TAB NAVIGATION ────────────────────────────────────── */}
      {isSuperAdmin && (
        <div className="flex gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-x-auto">
          {[
            { key: 'shows', icon: <Calendar size={16} />, label: 'Shows & Acts' },
            { key: 'studio', icon: <Building2 size={16} />, label: 'Studio' },
            { key: 'users', icon: <UserIcon size={16} />, label: 'Users' },
            { key: 'tools', icon: <Sparkles size={16} />, label: 'Dev Tools' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveAdminTab(tab.key)}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap",
                activeAdminTab === tab.key
                  ? "bg-white dark:bg-slate-700 text-pink-600 shadow-sm"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              )}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB: SHOWS & ACTS
          ══════════════════════════════════════════════════════════ */}
      {activeAdminTab === 'shows' && (
        <div className="space-y-6 animate-in fade-in">

          {/* ── Header ── */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black dark:text-white">Shows & Acts</h2>
              <p className="text-xs text-slate-400 font-bold mt-0.5">
                {showList.length} performance{showList.length !== 1 ? 's' : ''} for {orgData.name || orgId || 'this studio'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowBulkImport(!showBulkImport); setIsAddingShow(false); }}
                className={clsx(
                  "flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95",
                  showBulkImport
                    ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                )}
              >
                <Upload size={16} /> <span className="hidden sm:inline">Bulk Import</span>
              </button>
              <button
                onClick={() => { setIsAddingShow(!isAddingShow); setSelectedShowId(''); setShowBulkImport(false); }}
                className={clsx(
                  "flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95",
                  isAddingShow
                    ? "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    : "bg-pink-600 text-white shadow-lg shadow-pink-500/20"
                )}
              >
                {isAddingShow ? <><X size={18} /> Cancel</> : <><Plus size={18} /> New Show</>}
              </button>
            </div>
          </div>

          {/* ── Bulk Import Panel ── */}
          {showBulkImport && (
            <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl border-2 border-amber-400 dark:border-amber-600 shadow-xl animate-in fade-in duration-200">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-xl shrink-0">
                  <Upload size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="font-black dark:text-white">Bulk Import Shows & Acts</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Upload a single CSV to create multiple shows with all their acts at once.
                  </p>
                </div>
                <button onClick={() => setShowBulkImport(false)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X size={18} />
                </button>
              </div>

              {/* CSV Format Guide */}
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl mb-4">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Required CSV Format</p>
                <div className="overflow-x-auto">
                  <table className="text-xs w-full">
                    <thead>
                      <tr className="text-left text-slate-400 font-black uppercase">
                        <th className="pr-4 py-1">show</th>
                        <th className="pr-4 py-1">number</th>
                        <th className="pr-4 py-1">title</th>
                        <th className="py-1">performers</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                      <tr>
                        <td className="pr-4 py-0.5">Saturday 2pm</td>
                        <td className="pr-4 py-0.5">1</td>
                        <td className="pr-4 py-0.5">Opening Number</td>
                        <td className="py-0.5">Emma R; Sophia C; Olivia M</td>
                      </tr>
                      <tr className="text-slate-400 dark:text-slate-500">
                        <td className="pr-4 py-0.5">Saturday 2pm</td>
                        <td className="pr-4 py-0.5">2</td>
                        <td className="pr-4 py-0.5">Jazz Hands</td>
                        <td className="py-0.5">Lily T; Zoe G</td>
                      </tr>
                      <tr className="text-slate-400 dark:text-slate-500">
                        <td className="pr-4 py-0.5">Sunday 4pm</td>
                        <td className="pr-4 py-0.5">1</td>
                        <td className="pr-4 py-0.5">Rise Up</td>
                        <td className="py-0.5">Natalie K; Victoria S</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">
                  The <strong>show</strong> column groups acts into separate performances. Performers are separated by semicolons.
                </p>
              </div>

              {/* Progress log */}
              {bulkLog.length > 0 && (
                <div className="mb-4 bg-slate-50 dark:bg-slate-900 rounded-xl p-3 max-h-32 overflow-y-auto space-y-1">
                  {bulkLog.map((msg, i) => (
                    <div key={i} className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
                      <Check size={11} className="text-emerald-500 shrink-0" /> {msg}
                    </div>
                  ))}
                </div>
              )}

              {/* Upload input */}
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center hover:border-amber-400 transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleBulkImport}
                  disabled={bulkImporting}
                  className="mx-auto block text-sm text-slate-500 file:mr-3 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:bg-amber-500 file:text-white file:font-bold file:text-sm file:cursor-pointer disabled:opacity-50"
                />
                {bulkImporting && (
                  <p className="mt-3 text-xs font-bold text-amber-600 animate-pulse">Importing...</p>
                )}
              </div>
            </div>
          )}

          {/* ── New Show Form ── */}
          {isAddingShow && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border-2 border-pink-500 shadow-xl animate-in zoom-in-95 duration-200">
              <h3 className="text-[10px] font-black text-pink-600 uppercase tracking-widest mb-4">Create New Performance</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Display Title</label>
                  <input
                    type="text"
                    placeholder="e.g. 2026 Spring Recital — Saturday 2pm"
                    className="w-full bg-slate-50 dark:bg-slate-900 p-4 rounded-xl text-slate-900 dark:text-white text-lg font-bold outline-none focus:ring-2 focus:ring-pink-500"
                    value={newShowForm.label}
                    onChange={e => setNewShowForm({ ...newShowForm, label: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Date</label>
                  <input
                    type="date"
                    className="w-full bg-slate-50 dark:bg-slate-900 p-4 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-pink-500"
                    value={newShowForm.date}
                    onChange={e => setNewShowForm({ ...newShowForm, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Time</label>
                  <input
                    type="time"
                    className="w-full bg-slate-50 dark:bg-slate-900 p-4 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-pink-500"
                    value={newShowForm.time}
                    onChange={e => setNewShowForm({ ...newShowForm, time: e.target.value })}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleCreateShow}
                    className="w-full bg-pink-600 text-white p-4 rounded-xl font-black shadow-lg shadow-pink-500/20 active:scale-95 transition-transform"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Show Cards Grid ── */}
          {!isAddingShow && showList.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {showList.map(show => {
                const isSelected = selectedShowId === show.id;
                return (
                  <button
                    key={show.id}
                    onClick={() => setSelectedShowId(isSelected ? '' : show.id)}
                    className={clsx(
                      "text-left p-5 rounded-2xl border-2 transition-all group",
                      isSelected
                        ? "border-pink-500 bg-pink-50 dark:bg-pink-900/20 shadow-md"
                        : "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-pink-300 dark:hover:border-pink-700 hover:shadow-sm"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <div className={clsx(
                          "font-black truncate",
                          isSelected ? "text-pink-600" : "dark:text-white"
                        )}>
                          {show.label}
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 font-bold">
                          <span className="flex items-center gap-1">
                            <Hash size={12} /> {show.acts?.length || 0} acts
                          </span>
                          <span className="flex items-center gap-1">
                            <Users size={12} /> {new Set(show.acts?.flatMap(a => a.performers || [])).size} dancers
                          </span>
                        </div>
                      </div>
                      <div className={clsx(
                        "p-2 rounded-xl transition-colors shrink-0",
                        isSelected ? "bg-pink-600 text-white" : "bg-slate-50 dark:bg-slate-900 text-slate-300 group-hover:text-pink-500"
                      )}>
                        <Pencil size={16} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Empty State ── */}
          {!isAddingShow && showList.length === 0 && (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
              <Calendar size={48} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
              <h3 className="text-lg font-black dark:text-white mb-1">No Shows Yet</h3>
              <p className="text-slate-400 text-sm mb-4">Create your first performance to start adding acts.</p>
              <button
                onClick={() => setIsAddingShow(true)}
                className="inline-flex items-center gap-2 px-5 py-3 bg-pink-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-pink-500/20"
              >
                <Plus size={16} /> Create First Show
              </button>
            </div>
          )}

          {/* ── Act Editor (shown when a show is selected) ── */}
          {editData && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">

              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 text-pink-600 rounded-xl flex items-center justify-center shrink-0">
                    <Calendar size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black dark:text-white truncate text-sm">{editData.label}</h3>
                    <p className="text-[10px] font-bold text-slate-400">{editData.acts.length} acts</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditData({ ...editData, acts: [...editData.acts, { number: editData.acts.length + 1, title: "", performers: [] }] })}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    <Plus size={14} /> Act
                  </button>
                  <button
                    onClick={() => setShowUploadPanel(!showUploadPanel)}
                    className={clsx(
                      "flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors",
                      showUploadPanel
                        ? "bg-pink-100 dark:bg-pink-900/30 text-pink-600"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                    )}
                  >
                    <Upload size={14} /> CSV
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 transition-all"
                  >
                    <Save size={14} /> Save
                  </button>
                </div>
              </div>

              {/* CSV Upload Panel (inline) */}
              {showUploadPanel && (
                <div className="bg-amber-50 dark:bg-amber-900/10 p-5 rounded-2xl border border-amber-200 dark:border-amber-800/30 animate-in fade-in duration-200">
                  <div className="flex items-start gap-3">
                    <Database size={20} className="text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-black text-sm dark:text-white mb-1">Batch Upload from CSV</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                        This will replace all existing acts. Headers: <code className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded text-pink-600 text-[11px]">number, title, performers</code> (performers split by ;)
                      </p>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="text-sm text-slate-500 file:mr-3 file:py-2 file:px-5 file:rounded-xl file:border-0 file:bg-amber-500 file:text-white file:font-bold file:text-xs file:cursor-pointer"
                      />
                    </div>
                    <button onClick={() => setShowUploadPanel(false)} className="text-slate-400 hover:text-slate-600 p-1">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Sortable Act List */}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={editData.acts.map(a => a.number)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {editData.acts.map((act, idx) => (
                      <SortableActCard
                        key={act.number}
                        act={act}
                        idx={idx}
                        updateAct={updateAct}
                        onRemove={() => {
                          const filtered = editData.acts.filter((_, i) => i !== idx).map((a, i) => ({ ...a, number: i + 1 }));
                          setEditData({ ...editData, acts: filtered });
                        }}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {/* Bottom Save Bar */}
              {editData.acts.length > 5 && (
                <div className="flex justify-end">
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 transition-all"
                  >
                    <Save size={20} /> Save All Changes
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB: STUDIO
          ══════════════════════════════════════════════════════════ */}
      {activeAdminTab === 'studio' && isSuperAdmin && (
        <div className="space-y-6 animate-in fade-in">

          {/* ── Header ── */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black dark:text-white">Studio Management</h2>
              <p className="text-xs text-slate-400 font-bold mt-0.5">
                {orgId ? (orgData.name || orgId) : 'Select or create a studio'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchAllOrgs}
                className="p-2.5 text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl hover:text-pink-600 transition-colors"
                title="Refresh studio list"
              >
                <RefreshCw size={16} className={loadingOrgs ? "animate-spin" : ""} />
              </button>
              <button
                onClick={() => setIsCreatingOrg(!isCreatingOrg)}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95",
                  isCreatingOrg
                    ? "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    : "bg-pink-600 text-white shadow-md shadow-pink-500/20"
                )}
              >
                {isCreatingOrg ? <><X size={16} /> Cancel</> : <><Plus size={16} /> New Studio</>}
              </button>
            </div>
          </div>

          {/* ── Create New Studio Form ── */}
          {isCreatingOrg && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border-2 border-pink-500 shadow-xl animate-in zoom-in-95 duration-200">
              <h3 className="text-[10px] font-black text-pink-600 uppercase tracking-widest mb-4">New Studio Details</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Studio Name (e.g. Starlight Dance Academy)"
                  className="w-full p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold"
                  value={newOrgForm.name}
                  onChange={e => setNewOrgForm({ ...newOrgForm, name: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="database-id (auto-formatted)"
                  className="w-full p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-mono"
                  value={newOrgForm.id}
                  onChange={e => setNewOrgForm({ ...newOrgForm, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                />
                <button
                  onClick={async () => {
                    await handleCreateOrg();
                    fetchAllOrgs();
                  }}
                  className="w-full bg-pink-600 text-white p-3.5 rounded-xl font-black shadow-md active:scale-95 transition-all text-sm"
                >
                  Create Studio
                </button>
              </div>
            </div>
          )}

          {/* ── Studio Selector Grid ── */}
          {!isCreatingOrg && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allOrgs.map(org => {
                const isSelected = orgId === org.id;
                return (
                  <button
                    key={org.id}
                    onClick={() => {
                      setOrgId(org.id);
                      setOrgData(org);
                      setSelectedShowId('');
                    }}
                    className={clsx(
                      "text-left p-5 rounded-2xl border-2 transition-all group",
                      isSelected
                        ? "border-pink-500 bg-pink-50 dark:bg-pink-900/20 shadow-md"
                        : "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-pink-300 dark:hover:border-pink-700 hover:shadow-sm"
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <div className="min-w-0 flex-1">
                        <div className={clsx(
                          "font-black truncate",
                          isSelected ? "text-pink-600" : "dark:text-white"
                        )}>
                          {org.name || org.id}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono text-slate-400">{org.id}</span>
                          <span className="text-[10px] text-slate-300">•</span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {org.admins?.length || 0} admin{(org.admins?.length || 0) !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="p-1.5 bg-pink-600 text-white rounded-lg shrink-0">
                          <Check size={14} />
                        </div>
                      )}
                      {!isSelected && (
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-pink-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}

              {allOrgs.length === 0 && !loadingOrgs && (
                <div className="sm:col-span-2 text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                  <Building2 size={40} className="mx-auto text-slate-200 dark:text-slate-700 mb-3" />
                  <p className="text-slate-400 font-bold mb-1">No studios found</p>
                  <p className="text-slate-300 text-sm">Create one to get started.</p>
                </div>
              )}

              {loadingOrgs && (
                <div className="sm:col-span-2 text-center py-12 text-slate-400">
                  <RefreshCw size={24} className="mx-auto animate-spin mb-2" />
                  <p className="text-xs font-bold">Loading studios...</p>
                </div>
              )}
            </div>
          )}

          {/* ── Selected Studio Details ── */}
          {orgId && !isCreatingOrg && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 relative overflow-hidden">
              <Building2 size={80} className="absolute -right-4 -top-4 text-slate-100 dark:text-slate-900/50 opacity-40" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <Shield size={14} className="text-slate-400" />
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Administrators for {orgData.name || orgId}
                  </label>
                </div>

                <div className="space-y-2 mb-3">
                  {(orgData.admins || []).map(email => (
                    <div key={email} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-sm dark:text-white ml-2">{email}</span>
                      <button
                        onClick={() => handleUpdateOrgAdmins(orgData.admins.filter(e => e !== email))}
                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {(orgData.admins || []).length === 0 && (
                    <p className="text-xs text-slate-400 py-2">No admins configured yet.</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Add admin email..."
                    className="flex-1 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl dark:text-white border border-slate-200 dark:border-slate-700 outline-none focus:border-pink-500 text-sm"
                    value={newOrgAdminEmail}
                    onChange={e => setNewOrgAdminEmail(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newOrgAdminEmail.trim()) {
                        handleUpdateOrgAdmins([...(orgData.admins || []), newOrgAdminEmail.trim()]);
                        setNewOrgAdminEmail('');
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (newOrgAdminEmail.trim()) {
                        handleUpdateOrgAdmins([...(orgData.admins || []), newOrgAdminEmail.trim()]);
                        setNewOrgAdminEmail('');
                      }
                    }}
                    className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white px-5 rounded-xl font-bold text-sm hover:bg-slate-300 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB: USERS
          ══════════════════════════════════════════════════════════ */}
      {activeAdminTab === 'users' && isSuperAdmin && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black dark:text-white">Users</h2>
              <p className="text-xs text-slate-400 font-bold mt-0.5">{appUsers.length} registered user{appUsers.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={fetchAppUsers} className="p-3 text-pink-600 bg-pink-50 dark:bg-pink-900/20 rounded-xl hover:bg-pink-100 transition-colors">
              <RefreshCw size={18} className={loadingUsers ? "animate-spin" : ""} />
            </button>
          </div>
          {appUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase text-slate-400">
                  <tr>
                    <th className="px-6 py-3">User</th>
                    <th className="px-6 py-3">Favorites</th>
                    <th className="px-6 py-3 text-right">Last Login</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {appUsers.map(u => (
                    <tr key={u.id} className="text-sm hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="px-6 py-4 font-bold dark:text-white">{u.email || "Anonymous"}</td>
                      <td className="px-6 py-4">
                        <span className="bg-pink-100 dark:bg-pink-900/30 text-pink-600 px-2.5 py-1 rounded-full text-xs font-black">
                          {u.favorites?.length || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 text-xs">
                        {u.last_login ? new Date(u.last_login).toLocaleDateString() : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400">
              {loadingUsers ? 'Loading...' : 'No users found. Click refresh to load.'}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB: DEV TOOLS
          ══════════════════════════════════════════════════════════ */}
      {activeAdminTab === 'tools' && isSuperAdmin && (
        <div className="space-y-4 animate-in fade-in">
          <h2 className="text-2xl font-black dark:text-white">Developer Tools</h2>

          {/* Seed Demo Data */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-xl shrink-0">
                <Sparkles size={22} />
              </div>
              <div className="flex-1">
                <h3 className="font-black dark:text-white mb-0.5">Seed Demo Data</h3>
                <p className="text-xs text-slate-400 mb-4">
                  Generate 2–4 random studios, each with 1–5 shows and 20–35 acts per show. Each seed is unique.
                </p>

                {seedLog.length > 0 && (
                  <div className="mb-4 bg-slate-50 dark:bg-slate-900 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1">
                    {seedLog.map((msg, i) => (
                      <div key={i} className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
                        <Check size={11} className="text-emerald-500 shrink-0" /> {msg}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleSeedData}
                    disabled={isSeeding}
                    className={clsx(
                      "px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95",
                      isSeeding ? "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-wait" : "bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-500/20"
                    )}
                  >
                    {isSeeding ? 'Working...' : 'Seed Data'}
                  </button>
                  <button
                    onClick={handleClearSeedData}
                    disabled={isSeeding}
                    className={clsx(
                      "px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95",
                      isSeeding ? "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-wait" : "bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-500/20"
                    )}
                  >
                    Clear Seeded Data
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Cache */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-xl shrink-0">
                  <Trash2 size={22} />
                </div>
                <div>
                  <h3 className="font-black dark:text-white mb-0.5">Clear Local Cache</h3>
                  <p className="text-xs text-slate-400">Force a fresh download of all data on next load.</p>
                </div>
              </div>
              <button
                onClick={handleClearCache}
                className="px-5 py-2.5 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 active:scale-95 transition-all shadow-md shadow-red-500/20"
              >
                Clear Cache
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sortable Act Card ──────────────────────────────────────────────

function SortableActCard({ act, idx, updateAct, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: act.number });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col lg:flex-row gap-4 group relative"
    >
      {/* Drag Handle */}
      <div {...attributes} {...listeners} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-slate-300 cursor-grab hover:text-pink-500 transition-colors">
        <GripVertical size={20} />
      </div>

      {/* Left: Number + Title */}
      <div className="lg:w-1/3 pl-8 flex items-start gap-3">
        <div className="w-10 h-10 flex items-center justify-center font-black text-pink-600 bg-slate-50 dark:bg-slate-900 rounded-xl shrink-0 text-sm">
          {act.number}
        </div>
        <div className="flex-1">
          <label className="text-[8px] font-black text-slate-300 uppercase block mb-1">Title</label>
          <input
            className="w-full bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg font-bold text-sm dark:text-white border-none outline-none focus:ring-1 focus:ring-pink-500"
            value={act.title}
            onChange={e => updateAct(idx, 'title', e.target.value)}
          />
        </div>
      </div>

      {/* Right: Performers */}
      <div className="flex-1">
        <label className="text-[8px] font-black text-slate-300 uppercase block mb-1">Dancers (one per line or comma-separated)</label>
        <textarea
          className="w-full p-3 text-sm dark:text-white bg-slate-50 dark:bg-slate-900 rounded-lg border-none outline-none focus:ring-1 focus:ring-pink-500 min-h-[80px] resize-none"
          value={act.performers?.join('\n') || ''}
          onChange={e => updateAct(idx, 'performers', e.target.value)}
          onKeyDown={e => e.stopPropagation()}
        />
      </div>

      {/* Delete */}
      <button
        onClick={onRemove}
        className="absolute right-3 top-3 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
