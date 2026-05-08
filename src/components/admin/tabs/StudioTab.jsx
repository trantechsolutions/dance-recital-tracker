import { useState, useCallback } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  Plus, X, Check, ChevronRight, Building2, Shield,
  RefreshCw, Trash2
} from 'lucide-react';
import { clsx } from 'clsx';
import { db } from '../../../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { createOrg, updateOrgAdmins, deleteStudio } from '../../../services/showService';

export default function StudioTab({ showToast, setConfirmModal, setPromptModal, setSelectedShow }) {
  const { orgId, setOrgId } = useApp();

  const [orgData, setOrgData] = useState({ name: '', admins: [] });
  const [allOrgs, setAllOrgs] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [newOrgForm, setNewOrgForm] = useState({ id: '', name: '', adminEmail: '' });
  const [newOrgAdminEmail, setNewOrgAdminEmail] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteLog, setDeleteLog] = useState([]);

  const fetchAllOrgs = useCallback(async () => {
    setLoadingOrgs(true);
    try {
      const snap = await getDocs(collection(db, 'organizations'));
      setAllOrgs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { showToast(e.message, 'error'); }
    finally { setLoadingOrgs(false); }
  }, [showToast]);

  // Auto-load on first render
  useState(() => { fetchAllOrgs(); });

  const handleCreateOrg = async () => {
    if (!newOrgForm.id || !newOrgForm.name) return showToast('ID and Name required', 'error');
    try {
      const formattedId = newOrgForm.id.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const admins = newOrgForm.adminEmail ? [newOrgForm.adminEmail] : [];
      await createOrg(formattedId, newOrgForm.name, admins);
      showToast('Studio Created!', 'success');
      setIsCreatingOrg(false);
      setNewOrgForm({ id: '', name: '', adminEmail: '' });
      if (setOrgId) setOrgId(formattedId);
      fetchAllOrgs();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleUpdateOrgAdmins = async (newAdmins) => {
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
      setAllOrgs(prev => prev.filter(o => o.id !== targetOrgId));
    } catch (err) {
      log(`Error: ${err.message}`);
      showToast('Delete failed: ' + err.message, 'error');
    } finally { setIsDeleting(false); }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black dark:text-white">Studio Management</h2>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            {orgId ? (orgData.name || orgId) : 'Select or create a studio'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAllOrgs} className="p-2.5 text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl hover:text-pink-600 transition-colors" title="Refresh studio list">
            <RefreshCw size={16} className={loadingOrgs ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setIsCreatingOrg(!isCreatingOrg)}
            className={clsx("flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95",
              isCreatingOrg ? "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300" : "bg-pink-600 text-white shadow-md shadow-pink-500/20")}>
            {isCreatingOrg ? <><X size={16} /> Cancel</> : <><Plus size={16} /> New Studio</>}
          </button>
        </div>
      </div>

      {isCreatingOrg && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border-2 border-pink-500 shadow-xl animate-in zoom-in-95 duration-200">
          <h3 className="text-[10px] font-black text-pink-600 uppercase tracking-widest mb-4">New Studio Details</h3>
          <div className="space-y-3">
            <input type="text" placeholder="Studio Name (e.g. Starlight Dance Academy)"
              className="w-full p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold"
              value={newOrgForm.name}
              onChange={e => {
                const name = e.target.value;
                const slug = name.toLowerCase().trim().replace(/[''']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                setNewOrgForm({ ...newOrgForm, name, id: slug });
              }} />
            <div className="relative">
              <input type="text" placeholder="database-id (auto-generated)"
                className="w-full p-3.5 pr-20 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-mono"
                value={newOrgForm.id}
                onChange={e => setNewOrgForm({ ...newOrgForm, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md pointer-events-none">
                ID
              </span>
            </div>
            <button onClick={handleCreateOrg}
              className="w-full bg-pink-600 text-white p-3.5 rounded-xl font-black shadow-md active:scale-95 transition-all text-sm">
              Create Studio
            </button>
          </div>
        </div>
      )}

      {!isCreatingOrg && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {allOrgs.map(org => {
            const isSelected = orgId === org.id;
            return (
              <button key={org.id} onClick={() => { setOrgId(org.id); setOrgData(org); }}
                className={clsx("text-left p-5 rounded-2xl border-2 transition-all group",
                  isSelected ? "border-pink-500 bg-pink-50 dark:bg-pink-900/20 shadow-md" : "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-pink-300 dark:hover:border-pink-700 hover:shadow-sm")}>
                <div className="flex justify-between items-center">
                  <div className="min-w-0 flex-1">
                    <div className={clsx("font-black truncate", isSelected ? "text-pink-600" : "dark:text-white")}>{org.name || org.id}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono text-slate-400">{org.id}</span>
                      <span className="text-[10px] text-slate-300">•</span>
                      <span className="text-[10px] font-bold text-slate-400">{org.admins?.length || 0} admin{(org.admins?.length || 0) !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  {isSelected ? (
                    <div className="p-1.5 bg-pink-600 text-white rounded-lg shrink-0"><Check size={14} /></div>
                  ) : (
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
                  <button onClick={() => handleUpdateOrgAdmins(orgData.admins.filter(e => e !== email))}
                    className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"><X size={14} /></button>
                </div>
              ))}
              {(orgData.admins || []).length === 0 && <p className="text-xs text-slate-400 py-2">No admins configured yet.</p>}
            </div>
            <div className="flex gap-2">
              <input type="email" placeholder="Add admin email..."
                className="flex-1 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl dark:text-white border border-slate-200 dark:border-slate-700 outline-none focus:border-pink-500 text-sm"
                value={newOrgAdminEmail} onChange={e => setNewOrgAdminEmail(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newOrgAdminEmail.trim()) {
                    handleUpdateOrgAdmins([...(orgData.admins || []), newOrgAdminEmail.trim()]);
                    setNewOrgAdminEmail('');
                  }
                }} />
              <button onClick={() => {
                if (newOrgAdminEmail.trim()) {
                  handleUpdateOrgAdmins([...(orgData.admins || []), newOrgAdminEmail.trim()]);
                  setNewOrgAdminEmail('');
                }
              }} className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white px-5 rounded-xl font-bold text-sm hover:bg-slate-300 transition-colors">
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {orgId && !isCreatingOrg && (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border-2 border-red-200 dark:border-red-900/50">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-xl shrink-0"><Trash2 size={20} /></div>
            <div className="flex-1">
              <h3 className="font-black text-red-600 dark:text-red-400 mb-0.5">Danger Zone</h3>
              <p className="text-xs text-slate-400 mb-4">
                Permanently delete <strong className="text-slate-600 dark:text-slate-300">{orgData.name || orgId}</strong> and all its shows, acts, show statuses, and related user favorites. This action cannot be undone.
              </p>
              {deleteLog.length > 0 && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/10 rounded-xl p-3 max-h-32 overflow-y-auto space-y-1">
                  {deleteLog.map((msg, i) => (
                    <div key={i} className="text-[11px] font-mono text-slate-400 flex items-center gap-2"><Check size={11} className="text-red-400 shrink-0" /> {msg}</div>
                  ))}
                </div>
              )}
              <button
                onClick={() => {
                  const name = orgData.name || orgId;
                  setPromptModal({
                    title: 'Delete Studio',
                    message: `Type "${name}" to confirm permanent deletion of this studio and all its data.`,
                    placeholder: name,
                    onConfirm: (input) => {
                      setPromptModal(null);
                      if (input === name) {
                        handleDeleteStudio(orgId);
                      } else {
                        showToast("Name didn't match. Deletion cancelled.", 'error');
                      }
                    },
                  });
                }}
                disabled={isDeleting}
                className={clsx("flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95",
                  isDeleting ? "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-wait" : "bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-500/20")}>
                <Trash2 size={14} />
                {isDeleting ? 'Deleting...' : 'Delete Entire Studio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
