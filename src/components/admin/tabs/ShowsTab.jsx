import { useState, useCallback } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  Save, Calendar, Plus, Upload, X, Check,
  Database, Hash, Users, Pencil, Radio, SkipForward, SkipBack,
  Square, Play, Tv2, Download
} from 'lucide-react';
import { clsx } from 'clsx';
import Papa from 'papaparse';
import PerformerEditor from '../PerformerEditor';
import {
  saveShow, createShow, uploadActsForShow, bulkImportShows,
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

export default function ShowsTab({
  recitalData, setRecitalData, invalidateActsCache,
  currentAct, updateActNumber, toggleTracking,
  setSelectedShow, showToast, setShowNightMode,
  selectedShowId, setSelectedShowId, editData, setEditData,
  orgData,
}) {
  const { orgId } = useApp();

  const [isAddingShow, setIsAddingShow] = useState(false);
  const [newShowForm, setNewShowForm] = useState({ date: '', time: '', label: '' });
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkLog, setBulkLog] = useState([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
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

      {/* Bulk Import Panel */}
      {showBulkImport && (
        <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl border-2 border-amber-400 dark:border-amber-600 shadow-xl animate-in fade-in duration-200">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-xl shrink-0">
              <Upload size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-black dark:text-white">Bulk Import Shows & Acts</h3>
              <p className="text-xs text-slate-400 mt-0.5">Upload a single CSV to create multiple shows with all their acts at once.</p>
            </div>
            <button onClick={() => setShowBulkImport(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={18} /></button>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl mb-4">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Required CSV Format</p>
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead><tr className="text-left text-slate-400 font-black uppercase"><th className="pr-4 py-1">show</th><th className="pr-4 py-1">number</th><th className="pr-4 py-1">title</th><th className="py-1">performers</th></tr></thead>
                <tbody className="text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                  <tr><td className="pr-4 py-0.5">Saturday 2pm</td><td className="pr-4 py-0.5">1</td><td className="pr-4 py-0.5">Opening Number</td><td className="py-0.5">Emma R; Sophia C; Olivia M</td></tr>
                  <tr className="text-slate-400 dark:text-slate-500"><td className="pr-4 py-0.5">Saturday 2pm</td><td className="pr-4 py-0.5">2</td><td className="pr-4 py-0.5">Jazz Hands</td><td className="py-0.5">Lily T; Zoe G</td></tr>
                  <tr className="text-slate-400 dark:text-slate-500"><td className="pr-4 py-0.5">Sunday 4pm</td><td className="pr-4 py-0.5">1</td><td className="pr-4 py-0.5">Rise Up</td><td className="py-0.5">Natalie K; Victoria S</td></tr>
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] text-slate-400">The <strong>show</strong> column groups acts. Performers separated by semicolons.</p>
              <button onClick={downloadCsvTemplate} className="flex items-center gap-1 text-[10px] font-bold text-pink-600 hover:text-pink-700 transition-colors shrink-0 ml-3">
                <Download size={11} /> Template
              </button>
            </div>
          </div>
          {bulkLog.length > 0 && (
            <div className="mb-4 bg-slate-50 dark:bg-slate-900 rounded-xl p-3 max-h-32 overflow-y-auto space-y-1">
              {bulkLog.map((msg, i) => (
                <div key={i} className="text-[11px] font-mono text-slate-400 flex items-center gap-2"><Check size={11} className="text-emerald-500 shrink-0" /> {msg}</div>
              ))}
            </div>
          )}
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center hover:border-amber-400 transition-colors">
            <input type="file" accept=".csv" onChange={handleBulkImport} disabled={bulkImporting}
              className="mx-auto block text-sm text-slate-500 file:mr-3 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:bg-amber-500 file:text-white file:font-bold file:text-sm file:cursor-pointer disabled:opacity-50" />
            {bulkImporting && <p className="mt-3 text-xs font-bold text-amber-600 animate-pulse">Importing...</p>}
          </div>
        </div>
      )}

      {/* New Show Form */}
      {isAddingShow && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border-2 border-pink-500 shadow-xl animate-in zoom-in-95 duration-200">
          <h3 className="text-[10px] font-black text-pink-600 uppercase tracking-widest mb-4">Create New Performance</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Display Title</label>
              <input type="text" placeholder="e.g. 2026 Spring Recital — Saturday 2pm"
                className="w-full bg-slate-50 dark:bg-slate-900 p-4 rounded-xl text-slate-900 dark:text-white text-lg font-bold outline-none focus:ring-2 focus:ring-pink-500"
                value={newShowForm.label} onChange={e => setNewShowForm({ ...newShowForm, label: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Date</label>
              <input type="date" className="w-full bg-slate-50 dark:bg-slate-900 p-4 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-pink-500"
                value={newShowForm.date} onChange={e => setNewShowForm({ ...newShowForm, date: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Time</label>
              <input type="time" className="w-full bg-slate-50 dark:bg-slate-900 p-4 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-pink-500"
                value={newShowForm.time} onChange={e => setNewShowForm({ ...newShowForm, time: e.target.value })} />
            </div>
            <div className="flex items-end">
              <button onClick={handleCreateShow} className="w-full bg-pink-600 text-white p-4 rounded-xl font-black shadow-lg shadow-pink-500/20 active:scale-95 transition-transform">
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
            return (
              <button key={show.id} onClick={() => {
                const newId = isSelected ? '' : show.id;
                setSelectedShowId(newId);
                if (setSelectedShow) setSelectedShow(newId);
              }}
                className={clsx(
                  "text-left p-5 rounded-2xl border-2 transition-all group",
                  isSelected
                    ? "border-pink-500 bg-pink-50 dark:bg-pink-900/20 shadow-md"
                    : "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-pink-300 dark:hover:border-pink-700 hover:shadow-sm"
                )}>
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
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
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isAddingShow && showList.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
          <Calendar size={48} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-black dark:text-white mb-1">No Shows Yet</h3>
          <p className="text-slate-400 text-sm mb-4">Create your first performance to start adding acts.</p>
          <button onClick={() => setIsAddingShow(true)} className="inline-flex items-center gap-2 px-5 py-3 bg-pink-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-pink-500/20">
            <Plus size={16} /> Create First Show
          </button>
        </div>
      )}

      {/* Live Tracker Control */}
      {selectedShowId && editData && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in">
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className={clsx("p-2.5 rounded-xl", currentAct?.isTracking && currentAct?.number ? "bg-red-100 dark:bg-red-900/30 text-red-500" : "bg-slate-100 dark:bg-slate-900 text-slate-400")}>
                <Radio size={18} className={currentAct?.isTracking ? "animate-pulse" : ""} />
              </div>
              <div>
                <h3 className="font-black text-sm dark:text-white">Live Tracker</h3>
                <p className="text-[10px] font-bold text-slate-400">
                  {currentAct?.isTracking ? 'Broadcasting live to all viewers' : 'Not tracking — viewers see the full program'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowNightMode(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-sm transition-all active:scale-95 hover:bg-slate-700 dark:hover:bg-slate-100">
                <Tv2 size={14} /> <span className="hidden sm:inline">Show Night</span>
              </button>
              <button onClick={toggleTracking}
                className={clsx("flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95",
                  currentAct?.isTracking ? "bg-red-500 text-white shadow-md shadow-red-500/20 hover:bg-red-600" : "bg-emerald-500 text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-600")}>
                {currentAct?.isTracking ? <><Square size={14} /> Stop</> : <><Play size={14} /> Go Live</>}
              </button>
            </div>
          </div>

          {currentAct?.isTracking && (
            <div className="p-4 sm:p-5">
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-gradient-to-r from-pink-600 to-rose-600 rounded-xl p-4 text-white text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/5" />
                  <div className="relative z-10">
                    <div className="text-[9px] uppercase tracking-widest font-black opacity-70 mb-1">Now Performing</div>
                    <div className="text-4xl font-black tracking-tighter">#{currentAct.number}</div>
                    <div className="text-sm font-bold opacity-90 mt-0.5 truncate">{currentAct.title}</div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => updateActNumber(currentAct.number + 1)}
                    className="flex items-center justify-center gap-1.5 w-full px-4 py-3 bg-pink-600 text-white rounded-xl font-bold text-xs shadow-md shadow-pink-500/20 hover:bg-pink-700 active:scale-95 transition-all">
                    <SkipForward size={16} /> Next
                  </button>
                  <button onClick={() => updateActNumber(Math.max(1, currentAct.number - 1))} disabled={currentAct.number <= 1}
                    className="flex items-center justify-center gap-1.5 w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 transition-all disabled:opacity-30">
                    <SkipBack size={16} /> Prev
                  </button>
                </div>
              </div>
              {editData.acts.length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Jump to Act</p>
                  <div className="flex flex-wrap gap-1.5">
                    {editData.acts.map(act => (
                      <button key={act.number} onClick={() => updateActNumber(act.number)} title={act.title}
                        className={clsx("w-9 h-9 rounded-lg font-bold text-xs transition-all active:scale-90",
                          currentAct.number === act.number ? "bg-pink-600 text-white shadow-md shadow-pink-500/20" : "bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 hover:text-pink-600")}>
                        {act.number}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {editData.acts.length > 0 && (
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(Math.round((currentAct.number / editData.acts.length) * 100), 100)}%` }} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 shrink-0">{currentAct.number} / {editData.acts.length}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Act Editor */}
      {editData && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 sticky top-0 z-20 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 text-pink-600 rounded-xl flex items-center justify-center shrink-0"><Calendar size={18} /></div>
              <div className="min-w-0">
                <h3 className="font-black dark:text-white truncate text-sm">{editData.label}</h3>
                <p className="text-[10px] font-bold text-slate-400">{editData.acts.length} acts</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditData({ ...editData, acts: [...editData.acts, { number: editData.acts.length + 1, title: '', performers: [] }] })}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                <Plus size={14} /> Act
              </button>
              <button onClick={() => setShowUploadPanel(!showUploadPanel)}
                className={clsx("flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors",
                  showUploadPanel ? "bg-pink-100 dark:bg-pink-900/30 text-pink-600" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600")}>
                <Upload size={14} /> CSV
              </button>
              <button onClick={handleSave}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 transition-all">
                <Save size={14} /> Save
              </button>
            </div>
          </div>

          {showUploadPanel && (
            <div className="bg-amber-50 dark:bg-amber-900/10 p-5 rounded-2xl border border-amber-200 dark:border-amber-800/30 animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <Database size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-black text-sm dark:text-white mb-1">Batch Upload from CSV</h4>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Replaces all acts. Headers: <code className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded text-pink-600 text-[11px]">number, title, performers</code>
                    </p>
                    <button onClick={downloadCsvTemplate} className="flex items-center gap-1 text-[10px] font-bold text-pink-600 hover:text-pink-700 transition-colors shrink-0 ml-3">
                      <Download size={11} /> Template
                    </button>
                  </div>
                  <input type="file" accept=".csv" onChange={handleFileUpload}
                    className="text-sm text-slate-500 file:mr-3 file:py-2 file:px-5 file:rounded-xl file:border-0 file:bg-amber-500 file:text-white file:font-bold file:text-xs file:cursor-pointer" />
                </div>
                <button onClick={() => setShowUploadPanel(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={16} /></button>
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
                className="flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 transition-all">
                <Save size={20} /> Save All Changes
              </button>
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
    <div ref={setNodeRef} style={style}
      className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col lg:flex-row gap-4 group relative">
      <div {...attributes} {...listeners} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-slate-300 cursor-grab hover:text-pink-500 transition-colors">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
      </div>
      <div className="lg:w-1/3 pl-8 flex items-start gap-3">
        <div className="w-10 h-10 flex items-center justify-center font-black text-pink-600 bg-slate-50 dark:bg-slate-900 rounded-xl shrink-0 text-sm">{act.number}</div>
        <div className="flex-1">
          <label className="text-[8px] font-black text-slate-300 uppercase block mb-1">Title</label>
          <input className="w-full bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg font-bold text-sm dark:text-white border-none outline-none focus:ring-1 focus:ring-pink-500"
            value={act.title} onChange={e => updateAct(idx, 'title', e.target.value)} />
        </div>
      </div>
      <div className="flex-1" onKeyDown={e => e.stopPropagation()}>
        <label className="text-[8px] font-black text-slate-300 uppercase block mb-1.5">Dancers</label>
        <PerformerEditor performers={act.performers || []} onChange={(newPerformers) => updateAct(idx, 'performers', newPerformers)} />
      </div>
      <button onClick={onRemove} className="absolute right-3 top-3 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      </button>
    </div>
  );
}
