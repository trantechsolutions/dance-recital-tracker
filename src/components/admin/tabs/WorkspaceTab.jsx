import { useState, useCallback, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  Save, Calendar, Plus, Upload, X, Check,
  Database, Hash, Users, Pencil, Radio, SkipForward, SkipBack,
  Square, Play, Tv2, Download, Building2, Shield, RefreshCw,
  Trash2, ChevronDown, ChevronRight, Settings
} from 'lucide-react';
import { clsx } from 'clsx';
import Papa from 'papaparse';
import PerformerEditor from '../PerformerEditor';
import {
  saveShow, createShow, uploadActsForShow, bulkImportShows,
  createOrg, updateOrgAdmins, deleteStudio, deleteShow,
} from '../../../services/showService';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, TouchSensor
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { db, coll } from '../../../firebase';
import { collection, getDocs } from 'firebase/firestore';

function formatShowDate(id) {
  try {
    const d = new Date(id);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch { return null; }
}

function validateCsvRow(row, fallbackNumber) {
  const title = (row.title || '').trim().slice(0, 200) || 'Untitled Act';
  const number = parseInt(row.number) || fallbackNumber;
  if (number < 1 || number > 9999) return { error: `Row ${fallbackNumber}: invalid act number "${row.number}"` };
  const performers = row.performers
    ? row.performers.split(';').map(p => p.trim().slice(0, 100)).filter(Boolean).slice(0, 50)
    : [];
  return { act: { number, title, performers } };
}

function downloadCsvTemplate() {
  const template = [
    'show,number,title,performers',
    'Saturday 2pm,1,Opening Number,Emma R; Sophia C; Olivia M',
    'Saturday 2pm,2,Jazz Hands,Lily T; Zoe G',
    'Sunday 4pm,1,Rise Up,Natalie K; Victoria S',
  ].join('\n');
  const url = URL.createObjectURL(new Blob([template], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'recital-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// â”€â”€â”€ Studio Context Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StudioContextBar({ allOrgs, loadingOrgs, fetchAllOrgs, onCreateOrg, showToast }) {
  const { orgId, setOrgId, orgName } = useApp();
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({ id: '', name: '', adminEmail: '' });

  const selectedOrg = allOrgs.find(o => o.id === orgId);
  const displayName = orgName || selectedOrg?.name || orgId || 'Select Studio';

  const handleCreate = async () => {
    if (!form.id || !form.name) return showToast('ID and Name required', 'error');
    try {
      const formattedId = form.id.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const admins = form.adminEmail ? [form.adminEmail] : [];
      await createOrg(formattedId, form.name, admins);
      showToast('Studio created!', 'success');
      setIsCreating(false);
      setForm({ id: '', name: '', adminEmail: '' });
      setOpen(false);
      if (setOrgId) setOrgId(formattedId);
      await fetchAllOrgs();
    } catch (e) { showToast(e.message, 'error'); }
  };

  return (
    <div className="relative">
      {/* Context Pill */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setOpen(!open); setIsCreating(false); }}
          className={clsx(
            "flex items-center gap-2.5 px-4 py-2.5 rounded-card border-2 font-bold text-sm transition-all",
            open
              ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600"
              : orgId
                ? "border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 text-ink-700 dark:text-white hover:border-brand-300"
                : "border-dashed border-ink-300 dark:border-ink-600 bg-ink-50 dark:bg-ink-800/50 text-ink-400 hover:border-brand-400"
          )}
        >
          <Building2 size={15} className={orgId ? "text-brand-500" : "text-ink-400"} />
          <span className="max-w-[180px] truncate">{displayName}</span>
          <ChevronDown size={14} className={clsx("transition-transform", open && "rotate-180")} />
        </button>
        {loadingOrgs && <RefreshCw size={14} className="text-ink-400 animate-spin" />}
      </div>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-ink-800 rounded-card border border-ink-200 dark:border-ink-700 shadow-xl z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="p-3 border-b border-ink-100 dark:border-ink-700 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">Switch Studio</span>
            <button
              onClick={() => { setIsCreating(!isCreating); }}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-card font-bold text-xs transition-all",
                isCreating
                  ? "bg-ink-100 dark:bg-ink-700 text-ink-500"
                  : "bg-brand-600 text-white shadow-sm shadow-brand-500/20"
              )}
            >
              {isCreating ? <><X size={12} /> Cancel</> : <><Plus size={12} /> New</>}
            </button>
          </div>

          {isCreating ? (
            <div className="p-4 space-y-3">
              <input
                type="text"
                placeholder="Studio Name"
                className="w-full p-3 rounded-card bg-ink-50 dark:bg-ink-900 text-ink-900 dark:text-white text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500"
                value={form.name}
                onChange={e => {
                  const name = e.target.value;
                  const slug = name.toLowerCase().trim().replace(/[''']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                  setForm({ ...form, name, id: slug });
                }}
              />
              <div className="relative">
                <input
                  type="text"
                  placeholder="database-id"
                  className="w-full p-3 pr-10 rounded-card bg-ink-50 dark:bg-ink-900 text-ink-900 dark:text-white text-xs font-mono outline-none focus:ring-2 focus:ring-brand-500"
                  value={form.id}
                  onChange={e => setForm({ ...form, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[8px] font-semibold uppercase tracking-wider text-ink-400">ID</span>
              </div>
              <button
                onClick={handleCreate}
                className="w-full bg-brand-600 text-white p-3 rounded-card font-semibold text-sm shadow-md active:scale-95 transition-all"
              >
                Create Studio
              </button>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto p-2 space-y-1">
              {loadingOrgs ? (
                <div className="py-6 text-center text-ink-400 text-xs font-bold">
                  <RefreshCw size={16} className="animate-spin mx-auto mb-2" />Loading...
                </div>
              ) : allOrgs.length === 0 ? (
                <div className="py-6 text-center text-ink-400 text-xs">No studios found.</div>
              ) : (
                allOrgs.map(org => {
                  const isSelected = orgId === org.id;
                  return (
                    <button
                      key={org.id}
                      onClick={() => { setOrgId(org.id); setOpen(false); }}
                      className={clsx(
                        "w-full text-left px-3 py-2.5 rounded-card transition-all flex items-center justify-between group",
                        isSelected
                          ? "bg-brand-50 dark:bg-brand-900/20 text-brand-600"
                          : "hover:bg-ink-50 dark:hover:bg-ink-700 text-ink-700 dark:text-ink-200"
                      )}
                    >
                      <div>
                        <div className="font-bold text-sm">{org.name || org.id}</div>
                        <div className="text-[10px] font-mono text-ink-400">{org.id}</div>
                      </div>
                      {isSelected
                        ? <Check size={14} className="text-brand-500 shrink-0" />
                        : <ChevronRight size={14} className="text-ink-300 group-hover:text-brand-400 shrink-0 transition-colors" />
                      }
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* Overlay to close dropdown */}
      {open && <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />}
    </div>
  );
}

// â”€â”€â”€ Manage Studio Accordion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ManageStudioAccordion({ orgData, setOrgData, showToast, setPromptModal, setSelectedShow, fetchAllOrgs }) {
  const { orgId, setOrgId } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteLog, setDeleteLog] = useState([]);

  if (!orgId) return null;

  const handleUpdateAdmins = async (newAdmins) => {
    try {
      await updateOrgAdmins(orgId, newAdmins);
      setOrgData({ ...orgData, admins: newAdmins });
      showToast('Admins updated', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleDeleteStudio = async (targetOrgId) => {
    setIsDeleting(true);
    setDeleteLog([]);
    const log = (msg) => setDeleteLog(prev => [...prev, msg]);
    try {
      const { totalActs, showCount } = await deleteStudio(targetOrgId, log);
      log(`Done! Removed studio "${targetOrgId}" and all related data.`);
      showToast(`Studio deleted with ${totalActs} acts across ${showCount} shows`, 'success');
      if (orgId === targetOrgId) {
        setOrgId(null);
        setOrgData({ name: '', admins: [] });
        if (setSelectedShow) setSelectedShow('');
      }
      await fetchAllOrgs();
    } catch (err) {
      log(`Error: ${err.message}`);
      showToast('Delete failed: ' + err.message, 'error');
    } finally { setIsDeleting(false); }
  };

  return (
    <div className="bg-white dark:bg-ink-800 rounded-card border border-ink-200 dark:border-ink-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-ink-50 dark:hover:bg-ink-700/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Settings size={15} className="text-ink-400" />
          <span className="font-bold text-sm text-ink-600 dark:text-ink-300">
            Manage Studio
          </span>
          <span className="text-[10px] font-mono text-ink-400 bg-ink-100 dark:bg-ink-700 px-2 py-0.5 rounded-md">
            {orgData.name || orgId}
          </span>
        </div>
        <ChevronDown size={16} className={clsx("text-ink-400 transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="border-t border-ink-100 dark:border-ink-700 p-5 space-y-5 animate-in fade-in duration-200">
          {/* Admins Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield size={13} className="text-ink-400" />
              <label className="text-[10px] font-semibold uppercase text-ink-400 tracking-widest">
                Administrators
              </label>
            </div>
            <div className="space-y-2 mb-3">
              {(orgData.admins || []).map(email => (
                <div key={email} className="flex justify-between items-center bg-ink-50 dark:bg-ink-900 p-3 rounded-card border border-ink-100 dark:border-ink-800">
                  <span className="font-bold text-sm dark:text-white">{email}</span>
                  <button
                    onClick={() => handleUpdateAdmins(orgData.admins.filter(e => e !== email))}
                    className="text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-lg transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
              {(orgData.admins || []).length === 0 && (
                <p className="text-xs text-ink-400 py-1">No admins configured.</p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Add admin email..."
                className="flex-1 bg-ink-50 dark:bg-ink-900 p-3 rounded-card dark:text-white border border-ink-200 dark:border-ink-700 outline-none focus:border-brand-500 text-sm"
                value={newAdminEmail}
                onChange={e => setNewAdminEmail(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newAdminEmail.trim()) {
                    handleUpdateAdmins([...(orgData.admins || []), newAdminEmail.trim()]);
                    setNewAdminEmail('');
                  }
                }}
              />
              <button
                onClick={() => {
                  if (newAdminEmail.trim()) {
                    handleUpdateAdmins([...(orgData.admins || []), newAdminEmail.trim()]);
                    setNewAdminEmail('');
                  }
                }}
                className="bg-ink-200 dark:bg-ink-700 text-ink-700 dark:text-white px-5 rounded-card font-bold text-sm hover:bg-ink-300 transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="p-4 rounded-card border-2 border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-card shrink-0">
                <Trash2 size={16} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-600 dark:text-red-400 text-sm mb-0.5">Danger Zone</h3>
                <p className="text-xs text-ink-400 mb-3">
                  Permanently delete <strong className="text-ink-600 dark:text-ink-300">{orgData.name || orgId}</strong> and all its shows, acts, and data. Cannot be undone.
                </p>
                {deleteLog.length > 0 && (
                  <div className="mb-3 bg-red-50 dark:bg-red-900/10 rounded-card p-3 max-h-28 overflow-y-auto space-y-1">
                    {deleteLog.map((msg, i) => (
                      <div key={i} className="text-[11px] font-mono text-ink-400 flex items-center gap-2">
                        <Check size={10} className="text-red-400 shrink-0" /> {msg}
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => {
                    const name = orgData.name || orgId;
                    setPromptModal({
                      title: 'Delete Studio',
                      message: `Type "${name}" to confirm permanent deletion.`,
                      placeholder: name,
                      onConfirm: (input) => {
                        setPromptModal(null);
                        if (input === name) handleDeleteStudio(orgId);
                        else showToast("Name didn't match. Deletion cancelled.", 'error');
                      },
                    });
                  }}
                  disabled={isDeleting}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-card font-bold text-xs transition-all active:scale-95",
                    isDeleting
                      ? "bg-ink-200 dark:bg-ink-700 text-ink-400 cursor-wait"
                      : "bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-500/20"
                  )}
                >
                  <Trash2 size={13} />
                  {isDeleting ? 'Deleting...' : 'Delete Entire Studio'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ WorkspaceTab (main export) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function WorkspaceTab({
  recitalData, setRecitalData, invalidateActsCache,
  currentAct, updateActNumber, toggleTracking,
  setSelectedShow, showToast, setShowNightMode,
  selectedShowId, setSelectedShowId, editData, setEditData,
  orgData, setOrgData,
  setPromptModal,
}) {
  const { orgId } = useApp();

  // Studio list state (previously owned by StudioTab)
  const [allOrgs, setAllOrgs] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  const [isAddingShow, setIsAddingShow] = useState(false);
  const [newShowForm, setNewShowForm] = useState({ date: '', time: '', label: '' });
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkLog, setBulkLog] = useState([]);
  const [deletingShowId, setDeletingShowId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchAllOrgs = useCallback(async () => {
    setLoadingOrgs(true);
    try {
      const snap = await getDocs(collection(db, coll('organizations')));
      setAllOrgs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { showToast(e.message, 'error'); }
    finally { setLoadingOrgs(false); }
  }, [showToast]);

  useEffect(() => { fetchAllOrgs(); }, [fetchAllOrgs]);

  const showList = recitalData ? Object.entries(recitalData).map(([id, data]) => ({ id, ...data })) : [];

  const handleSave = async () => {
    if (!editData) return;
    try {
      const cleanedActs = editData.acts.map(act => ({
        ...act,
        performers: act.performers.map(p => p.trim()).filter(p => p !== '')
      }));
      await saveShow(orgId, editData.id, editData.label, cleanedActs);
      invalidateActsCache(editData.id);
      setRecitalData(prev => ({ ...prev, [editData.id]: { ...editData, acts: cleanedActs } }));
      showToast('Changes saved', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleCreateShow = async () => {
    const { date, time, label } = newShowForm;
    if (!date || !time || !label) return showToast('Please fill out all fields', 'error');
    const id = new Date(`${date}T${time}`).toISOString();
    try {
      await createShow(orgId, id, label);
      setRecitalData(prev => ({ ...prev, [id]: { id, label, acts: [] } }));
      setSelectedShowId(id);
      setIsAddingShow(false);
      setNewShowForm({ date: '', time: '', label: '' });
      showToast('Performance created! Add acts and hit Save.', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleDeleteShow = async (show) => {
    setDeletingShowId(show.id);
    try {
      const { actCount, usersUpdated } = await deleteShow(orgId, show.id);
      invalidateActsCache(show.id);
      setRecitalData(prev => {
        const next = { ...prev };
        delete next[show.id];
        return next;
      });
      if (selectedShowId === show.id) {
        setSelectedShowId('');
        if (setSelectedShow) setSelectedShow('');
      }
      showToast(`Deleted "${show.label}" (${actCount} act${actCount !== 1 ? 's' : ''}, cleaned ${usersUpdated} schedule${usersUpdated !== 1 ? 's' : ''})`, 'success');
    } catch (err) {
      showToast('Delete failed: ' + err.message, 'error');
    } finally {
      setDeletingShowId(null);
    }
  };

  const promptDeleteShow = (show) => {
    setPromptModal({
      title: 'Delete Show',
      message: `Type "${show.label}" to confirm permanent deletion of this show and all its acts. This cannot be undone.`,
      placeholder: show.label,
      onConfirm: (input) => {
        setPromptModal(null);
        if (input === show.label) handleDeleteShow(show);
        else showToast("Name didn't match. Deletion cancelled.", 'error');
      },
    });
  };

  const updateAct = (index, field, value) => {
    const updatedActs = [...editData.acts];
    if (field === 'performers' && typeof value === 'string') {
      updatedActs[index][field] = value.split(/[,\n]/).map(p => p.trim()).filter(Boolean);
    } else {
      updatedActs[index][field] = value;
    }
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

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !selectedShowId) return showToast('Please select a performance first', 'error');
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          if (!results.data.length) throw new Error('CSV has no data rows');
          const validated = [];
          for (let i = 0; i < results.data.length; i++) {
            const { act, error } = validateCsvRow(results.data[i], i + 1);
            if (error) throw new Error(error);
            validated.push(act);
          }
          const savedActs = await uploadActsForShow(selectedShowId, validated);
          invalidateActsCache(selectedShowId);
          showToast(`Uploaded ${savedActs.length} acts!`, 'success');
          setRecitalData(prev => ({ ...prev, [selectedShowId]: { ...prev[selectedShowId], acts: savedActs } }));
          setShowUploadPanel(false);
        } catch (err) { showToast(err.message, 'error'); }
      }
    });
  };

  const handleBulkImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!orgId) return showToast('Select a studio first', 'error');
    setBulkImporting(true);
    setBulkLog([]);
    const log = (msg) => setBulkLog(prev => [...prev, msg]);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data;
          if (rows.length === 0) throw new Error('CSV is empty');
          const showMap = {};
          for (let i = 0; i < rows.length; i++) {
            const showName = (rows[i].show || '').trim().slice(0, 200);
            if (!showName) continue;
            if (!showMap[showName]) showMap[showName] = [];
            const { act, error } = validateCsvRow(rows[i], showMap[showName].length + 1);
            if (error) throw new Error(error);
            showMap[showName].push(act);
          }
          const showNames = Object.keys(showMap);
          if (showNames.length === 0) throw new Error('No valid rows found. Make sure your CSV has a "show" column.');
          log(`Found ${showNames.length} show(s) with ${rows.length} total rows`);
          const { newRecitalData, totalActs } = await bulkImportShows(orgId, showMap, recitalData, log);
          setRecitalData(newRecitalData);
          log(`Done! Created ${showNames.length} shows with ${totalActs} acts.`);
          showToast(`Imported ${showNames.length} shows, ${totalActs} acts!`, 'success');
        } catch (err) {
          log(`Error: ${err.message}`);
          showToast('Import failed: ' + err.message, 'error');
        } finally {
          setBulkImporting(false);
          e.target.value = '';
        }
      },
      error: (err) => {
        showToast('Failed to parse CSV: ' + err.message, 'error');
        setBulkImporting(false);
      }
    });
  };

  return (
    <div className="space-y-5 animate-in fade-in">

      {/* â”€â”€ Studio Context Bar â”€â”€ */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <StudioContextBar
          allOrgs={allOrgs}
          loadingOrgs={loadingOrgs}
          fetchAllOrgs={fetchAllOrgs}
          showToast={showToast}
        />
        {orgId && (
          <p className="text-xs text-ink-400 font-bold">
            {showList.length} performance{showList.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* â”€â”€ No studio selected prompt â”€â”€ */}
      {!orgId && (
        <div className="text-center py-16 bg-white dark:bg-ink-800 rounded-card border-2 border-dashed border-ink-200 dark:border-ink-700 animate-in fade-in">
          <Building2 size={48} className="mx-auto text-ink-200 dark:text-ink-700 mb-4" />
          <h3 className="text-lg font-semibold dark:text-white mb-1">No Studio Selected</h3>
          <p className="text-ink-400 text-sm mb-4">Use the studio picker above to select or create a studio.</p>
        </div>
      )}

      {/* â”€â”€ Shows & Acts Workspace â”€â”€ */}
      {orgId && (
        <div className="space-y-4">
          {/* Shows Header */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold dark:text-white">Shows & Acts</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowBulkImport(!showBulkImport); setIsAddingShow(false); }}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2.5 rounded-card font-bold text-sm transition-all active:scale-95",
                  showBulkImport
                    ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                    : "bg-ink-100 dark:bg-ink-700 text-ink-600 dark:text-ink-300 hover:bg-ink-200 dark:hover:bg-ink-600"
                )}
              >
                <Upload size={15} /> <span className="hidden sm:inline">Bulk Import</span>
              </button>
              <button
                onClick={() => { setIsAddingShow(!isAddingShow); setSelectedShowId(''); setShowBulkImport(false); }}
                className={clsx(
                  "flex items-center gap-2 px-5 py-2.5 rounded-card font-bold text-sm transition-all active:scale-95",
                  isAddingShow
                    ? "bg-ink-200 dark:bg-ink-700 text-ink-600 dark:text-ink-300"
                    : "bg-brand-600 text-white shadow-lg shadow-brand-500/20"
                )}
              >
                {isAddingShow ? <><X size={17} /> Cancel</> : <><Plus size={17} /> New Show</>}
              </button>
            </div>
          </div>

          {/* Bulk Import Panel */}
          {showBulkImport && (
            <div className="bg-white dark:bg-ink-800 p-5 sm:p-6 rounded-card border-2 border-amber-400 dark:border-amber-600 shadow-xl animate-in fade-in duration-200">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-card shrink-0"><Upload size={20} /></div>
                <div className="flex-1">
                  <h3 className="font-semibold dark:text-white">Bulk Import Shows & Acts</h3>
                  <p className="text-xs text-ink-400 mt-0.5">Upload a single CSV to create multiple shows at once.</p>
                </div>
                <button onClick={() => setShowBulkImport(false)} className="text-ink-400 hover:text-ink-600 p-1"><X size={18} /></button>
              </div>
              <div className="bg-ink-50 dark:bg-ink-900 p-4 rounded-card mb-4">
                <p className="text-[10px] font-semibold uppercase text-ink-400 tracking-widest mb-2">Required CSV Format</p>
                <div className="overflow-x-auto">
                  <table className="text-xs w-full">
                    <thead><tr className="text-left text-ink-400 font-semibold uppercase"><th className="pr-4 py-1">show</th><th className="pr-4 py-1">number</th><th className="pr-4 py-1">title</th><th className="py-1">performers</th></tr></thead>
                    <tbody className="text-ink-600 dark:text-ink-300 font-mono text-[11px]">
                      <tr><td className="pr-4 py-0.5">Saturday 2pm</td><td className="pr-4 py-0.5">1</td><td className="pr-4 py-0.5">Opening Number</td><td className="py-0.5">Emma R; Sophia C</td></tr>
                      <tr className="text-ink-400 dark:text-ink-500"><td className="pr-4 py-0.5">Sunday 4pm</td><td className="pr-4 py-0.5">1</td><td className="pr-4 py-0.5">Rise Up</td><td className="py-0.5">Natalie K; Victoria S</td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[10px] text-ink-400">The <strong>show</strong> column groups acts. Performers separated by semicolons.</p>
                  <button onClick={downloadCsvTemplate} className="flex items-center gap-1 text-[10px] font-bold text-brand-600 hover:text-brand-700 shrink-0 ml-3">
                    <Download size={11} /> Template
                  </button>
                </div>
              </div>
              {bulkLog.length > 0 && (
                <div className="mb-4 bg-ink-50 dark:bg-ink-900 rounded-card p-3 max-h-32 overflow-y-auto space-y-1">
                  {bulkLog.map((msg, i) => (
                    <div key={i} className="text-[11px] font-mono text-ink-400 flex items-center gap-2"><Check size={11} className="text-emerald-500 shrink-0" /> {msg}</div>
                  ))}
                </div>
              )}
              <div className="border-2 border-dashed border-ink-200 dark:border-ink-700 rounded-card p-6 text-center hover:border-amber-400 transition-colors">
                <input type="file" accept=".csv" onChange={handleBulkImport} disabled={bulkImporting}
                  className="mx-auto block text-sm text-ink-500 file:mr-3 file:py-2.5 file:px-6 file:rounded-card file:border-0 file:bg-amber-500 file:text-white file:font-bold file:text-sm file:cursor-pointer disabled:opacity-50" />
                {bulkImporting && <p className="mt-3 text-xs font-bold text-amber-600 animate-pulse">Importing...</p>}
              </div>
            </div>
          )}

          {/* New Show Form */}
          {isAddingShow && (
            <div className="bg-white dark:bg-ink-800 p-6 rounded-card border-2 border-brand-500 shadow-xl animate-in zoom-in-95 duration-200">
              <h3 className="text-[10px] font-semibold text-brand-600 uppercase tracking-widest mb-4">Create New Performance</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-3">
                  <label className="text-[10px] font-semibold text-ink-400 uppercase mb-1 block">Display Title</label>
                  <input type="text" placeholder="e.g. 2026 Spring Recital â€” Saturday 2pm"
                    className="w-full bg-ink-50 dark:bg-ink-900 p-4 rounded-card text-ink-900 dark:text-white text-lg font-bold outline-none focus:ring-2 focus:ring-brand-500"
                    value={newShowForm.label} onChange={e => setNewShowForm({ ...newShowForm, label: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-ink-400 uppercase mb-1 block">Date</label>
                  <input type="date" className="w-full bg-ink-50 dark:bg-ink-900 p-4 rounded-card text-ink-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                    value={newShowForm.date} onChange={e => setNewShowForm({ ...newShowForm, date: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-ink-400 uppercase mb-1 block">Time</label>
                  <input type="time" className="w-full bg-ink-50 dark:bg-ink-900 p-4 rounded-card text-ink-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                    value={newShowForm.time} onChange={e => setNewShowForm({ ...newShowForm, time: e.target.value })} />
                </div>
                <div className="flex items-end">
                  <button onClick={handleCreateShow} className="w-full bg-brand-600 text-white p-4 rounded-card font-semibold shadow-lg shadow-brand-500/20 active:scale-95 transition-transform">
                    Create
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Show Cards Grid */}
          {!isAddingShow && showList.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {showList.map(show => {
                const isSelected = selectedShowId === show.id;
                const isDeleting = deletingShowId === show.id;
                return (
                  <div key={show.id} className="relative group">
                    <button onClick={() => {
                      const newId = isSelected ? '' : show.id;
                      setSelectedShowId(newId);
                      if (setSelectedShow) setSelectedShow(newId);
                    }}
                      disabled={isDeleting}
                      className={clsx(
                        "w-full text-left p-5 rounded-2xl border-2 transition-all",
                        isDeleting && "opacity-50 pointer-events-none",
                        isSelected
                          ? "border-pink-500 bg-pink-50 dark:bg-pink-900/20 shadow-md"
                          : "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-pink-300 dark:hover:border-pink-700 hover:shadow-sm"
                      )}>
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1 pr-8">
                          <div className={clsx("font-black truncate", isSelected ? "text-pink-600" : "dark:text-white")}>{show.label}</div>
                          {formatShowDate(show.id) && (
                            <div className="text-[10px] font-bold text-slate-400 mt-0.5 flex items-center gap-1"><Calendar size={10} /> {formatShowDate(show.id)}</div>
                          )}
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 font-bold">
                            <span className="flex items-center gap-1"><Hash size={12} /> {show.acts?.length || 0} acts</span>
                            <span className="flex items-center gap-1"><Users size={12} /> {new Set(show.acts?.flatMap(a => a.performers || [])).size} dancers</span>
                          </div>
                        </div>
                        <div className={clsx("p-2 rounded-xl transition-colors shrink-0", isSelected ? "bg-pink-600 text-white" : "bg-slate-50 dark:bg-slate-900 text-slate-300 group-hover:text-pink-500")}>
                          <Pencil size={16} />
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); promptDeleteShow(show); }}
                      disabled={isDeleting}
                      title="Delete show"
                      aria-label={`Delete ${show.label}`}
                      className="absolute bottom-3 right-3 p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors z-10 disabled:opacity-50 disabled:cursor-wait"
                    >
                      {isDeleting
                        ? <RefreshCw size={16} className="animate-spin" />
                        : <Trash2 size={16} />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty Shows State */}
          {!isAddingShow && showList.length === 0 && (
            <div className="text-center py-14 bg-white dark:bg-ink-800 rounded-card border-2 border-dashed border-ink-200 dark:border-ink-700">
              <Calendar size={44} className="mx-auto text-ink-200 dark:text-ink-700 mb-4" />
              <h3 className="text-lg font-semibold dark:text-white mb-1">No Shows Yet</h3>
              <p className="text-ink-400 text-sm mb-4">Create your first performance to start adding acts.</p>
              <button onClick={() => setIsAddingShow(true)} className="inline-flex items-center gap-2 px-5 py-3 bg-brand-600 text-white rounded-card font-bold text-sm shadow-lg shadow-brand-500/20">
                <Plus size={16} /> Create First Show
              </button>
            </div>
          )}

          {/* Live Tracker Control */}
          {selectedShowId && editData && (
            <div className="bg-white dark:bg-ink-800 rounded-card border border-ink-200 dark:border-ink-700 overflow-hidden animate-in fade-in">
              <div className="p-4 sm:p-5 flex items-center justify-between border-b border-ink-100 dark:border-ink-700">
                <div className="flex items-center gap-3">
                  <div className={clsx("p-2.5 rounded-card", currentAct?.isTracking && currentAct?.number ? "bg-red-100 dark:bg-red-900/30 text-red-500" : "bg-ink-100 dark:bg-ink-900 text-ink-400")}>
                    <Radio size={18} className={currentAct?.isTracking ? "animate-pulse" : ""} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm dark:text-white">Live Tracker</h3>
                    <p className="text-[10px] font-bold text-ink-400">
                      {currentAct?.isTracking ? 'Broadcasting live to all viewers' : 'Not tracking â€” viewers see the full program'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowNightMode(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-ink-900 dark:bg-white text-white dark:text-ink-900 rounded-card font-bold text-sm transition-all active:scale-95 hover:bg-ink-700 dark:hover:bg-ink-100">
                    <Tv2 size={14} /> <span className="hidden sm:inline">Show Night</span>
                  </button>
                  <button onClick={toggleTracking}
                    className={clsx("flex items-center gap-2 px-4 py-2.5 rounded-card font-bold text-sm transition-all active:scale-95",
                      currentAct?.isTracking ? "bg-red-500 text-white shadow-md shadow-red-500/20 hover:bg-red-600" : "bg-emerald-500 text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-600")}>
                    {currentAct?.isTracking ? <><Square size={14} /> Stop</> : <><Play size={14} /> Go Live</>}
                  </button>
                </div>
              </div>

              {currentAct?.isTracking && (
                <div className="p-4 sm:p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-gradient-to-r from-brand-600 to-brand-600 rounded-card p-4 text-white text-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-white/5" />
                      <div className="relative z-10">
                        <div className="text-[9px] uppercase tracking-widest font-semibold opacity-70 mb-1">Now Performing</div>
                        <div className="text-4xl font-semibold tracking-tighter">#{currentAct.number}</div>
                        <div className="text-sm font-bold opacity-90 mt-0.5 truncate">{currentAct.title}</div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => updateActNumber(currentAct.number + 1)}
                        className="flex items-center justify-center gap-1.5 w-full px-4 py-3 bg-brand-600 text-white rounded-card font-bold text-xs shadow-md shadow-brand-500/20 hover:bg-brand-700 active:scale-95 transition-all">
                        <SkipForward size={16} /> Next
                      </button>
                      <button onClick={() => updateActNumber(Math.max(1, currentAct.number - 1))} disabled={currentAct.number <= 1}
                        className="flex items-center justify-center gap-1.5 w-full px-4 py-3 bg-ink-100 dark:bg-ink-700 text-ink-600 dark:text-ink-300 rounded-card font-bold text-xs hover:bg-ink-200 dark:hover:bg-ink-600 active:scale-95 transition-all disabled:opacity-30">
                        <SkipBack size={16} /> Prev
                      </button>
                    </div>
                  </div>
                  {editData.acts.length > 0 && (
                    <div className="mt-4">
                      <p className="text-[10px] font-semibold uppercase text-ink-400 tracking-widest mb-2">Jump to Act</p>
                      <div className="flex flex-wrap gap-1.5">
                        {editData.acts.map(act => (
                          <button key={act.number} onClick={() => updateActNumber(act.number)} title={act.title}
                            className={clsx("w-9 h-9 rounded-lg font-bold text-xs transition-all active:scale-90",
                              currentAct.number === act.number ? "bg-brand-600 text-white shadow-md shadow-brand-500/20" : "bg-ink-50 dark:bg-ink-900 text-ink-500 dark:text-ink-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-600")}>
                            {act.number}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {editData.acts.length > 0 && (
                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-ink-100 dark:bg-ink-900 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-brand-500 to-brand-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(Math.round((currentAct.number / editData.acts.length) * 100), 100)}%` }} />
                      </div>
                      <span className="text-[11px] font-bold text-ink-400 shrink-0">{currentAct.number} / {editData.acts.length}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Act Editor */}
          {editData && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-ink-800 p-4 rounded-card border border-ink-100 dark:border-ink-700 sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 text-brand-600 rounded-card flex items-center justify-center shrink-0"><Calendar size={18} /></div>
                  <div className="min-w-0">
                    <h3 className="font-semibold dark:text-white truncate text-sm">{editData.label}</h3>
                    <p className="text-[10px] font-bold text-ink-400">{editData.acts.length} acts</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditData({ ...editData, acts: [...editData.acts, { number: editData.acts.length + 1, title: '', performers: [] }] })}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-ink-100 dark:bg-ink-700 text-ink-600 dark:text-ink-300 rounded-card font-bold text-xs hover:bg-ink-200 dark:hover:bg-ink-600 transition-colors">
                    <Plus size={14} /> Act
                  </button>
                  <button onClick={() => setShowUploadPanel(!showUploadPanel)}
                    className={clsx("flex items-center gap-1.5 px-4 py-2.5 rounded-card font-bold text-xs transition-colors",
                      showUploadPanel ? "bg-brand-100 dark:bg-brand-900/30 text-brand-600" : "bg-ink-100 dark:bg-ink-700 text-ink-600 dark:text-ink-300 hover:bg-ink-200 dark:hover:bg-ink-600")}>
                    <Upload size={14} /> CSV
                  </button>
                  <button onClick={handleSave}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 text-white rounded-card font-bold text-xs shadow-md shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 transition-all">
                    <Save size={14} /> Save
                  </button>
                </div>
              </div>

              {showUploadPanel && (
                <div className="bg-amber-50 dark:bg-amber-900/10 p-5 rounded-card border border-amber-200 dark:border-amber-800/30 animate-in fade-in duration-200">
                  <div className="flex items-start gap-3">
                    <Database size={20} className="text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm dark:text-white mb-1">Batch Upload from CSV</h4>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-ink-500 dark:text-ink-400">
                          Replaces all acts. Headers: <code className="bg-white dark:bg-ink-800 px-1.5 py-0.5 rounded text-brand-600 text-[11px]">number, title, performers</code>
                        </p>
                        <button onClick={downloadCsvTemplate} className="flex items-center gap-1 text-[10px] font-bold text-brand-600 hover:text-brand-700 shrink-0 ml-3">
                          <Download size={11} /> Template
                        </button>
                      </div>
                      <input type="file" accept=".csv" onChange={handleFileUpload}
                        className="text-sm text-ink-500 file:mr-3 file:py-2 file:px-5 file:rounded-card file:border-0 file:bg-amber-500 file:text-white file:font-bold file:text-xs file:cursor-pointer" />
                    </div>
                    <button onClick={() => setShowUploadPanel(false)} className="text-ink-400 hover:text-ink-600 p-1"><X size={16} /></button>
                  </div>
                </div>
              )}

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={editData.acts.map(a => a.number)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {editData.acts.map((act, idx) => (
                      <SortableActCard key={act.number} act={act} idx={idx} updateAct={updateAct}
                        onRemove={() => {
                          const filtered = editData.acts.filter((_, i) => i !== idx).map((a, i) => ({ ...a, number: i + 1 }));
                          setEditData({ ...editData, acts: filtered });
                        }} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {editData.acts.length > 5 && (
                <div className="flex justify-end">
                  <button onClick={handleSave}
                    className="flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-card font-semibold shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 transition-all">
                    <Save size={20} /> Save All Changes
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* â”€â”€ Manage Studio Accordion (super admin only, collapsed) â”€â”€ */}
      {orgId && (
        <ManageStudioAccordion
          orgData={orgData}
          setOrgData={setOrgData}
          showToast={showToast}
          setPromptModal={setPromptModal}
          setSelectedShow={setSelectedShow}
          fetchAllOrgs={fetchAllOrgs}
        />
      )}
    </div>
  );
}

function SortableActCard({ act, idx, updateAct, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: act.number });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 1, opacity: isDragging ? 0.6 : 1 };
  return (
    <div ref={setNodeRef} style={style}
      className="bg-white dark:bg-ink-800 p-5 rounded-card border border-ink-100 dark:border-ink-700 shadow-sm flex flex-col lg:flex-row gap-4 group relative">
      <div {...attributes} {...listeners} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-ink-300 cursor-grab hover:text-brand-500 transition-colors">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
      </div>
      <div className="lg:w-1/3 pl-8 flex items-start gap-3">
        <div className="w-10 h-10 flex items-center justify-center font-semibold text-brand-600 bg-ink-50 dark:bg-ink-900 rounded-card shrink-0 text-sm">{act.number}</div>
        <div className="flex-1">
          <label className="text-[8px] font-semibold text-ink-300 uppercase block mb-1">Title</label>
          <input className="w-full bg-ink-50 dark:bg-ink-900 p-2.5 rounded-lg font-bold text-sm dark:text-white border-none outline-none focus:ring-1 focus:ring-brand-500"
            value={act.title} onChange={e => updateAct(idx, 'title', e.target.value)} />
        </div>
      </div>
      <div className="flex-1" onKeyDown={e => e.stopPropagation()}>
        <label className="text-[8px] font-semibold text-ink-300 uppercase block mb-1.5">Dancers</label>
        <PerformerEditor performers={act.performers || []} onChange={(newPerformers) => updateAct(idx, 'performers', newPerformers)} />
      </div>
      <button onClick={onRemove} className="absolute right-3 top-3 p-2 text-ink-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      </button>
    </div>
  );
}
