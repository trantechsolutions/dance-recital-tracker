import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AlertCircle, Check, Calendar, User as UserIcon, Sparkles, HelpCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { db, coll } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import ConfirmModal from '../ui/ConfirmModal';
import PromptModal from '../ui/PromptModal';
import LiveShowController from './LiveShowController';
import WorkspaceTab from './tabs/WorkspaceTab';
import UsersTab from './tabs/UsersTab';
import DevToolsTab from './tabs/DevToolsTab';

export default function AdminDashboard({
  recitalData, setRecitalData, invalidateActsCache,
  currentAct, updateActNumber, toggleTracking,
  selectedShow, setSelectedShow,
}) {
  const { isSuperAdmin, orgId, openTutorial } = useApp();

  const [activeAdminTab, setActiveAdminTab] = useState('workspace');
  const [showNightMode, setShowNightMode] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [promptModal, setPromptModal] = useState(null);
  const [orgData, setOrgData] = useState({ name: '', admins: [] });

  // Shared state lifted for ShowsTab ↔ AdminDashboard (LiveShowController needs editData)
  const [selectedShowId, setSelectedShowId] = useState('');
  const [editData, setEditData] = useState(null);

  useEffect(() => {
    const fetchOrg = async () => {
      if (!orgId) return;
      const snap = await getDoc(doc(db, coll('organizations'), orgId));
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

  const tabs = [
    { key: 'workspace', icon: <Calendar size={16} />, label: 'Shows & Acts', superOnly: false },
    { key: 'users', icon: <UserIcon size={16} />, label: 'Users', superOnly: true },
    { key: 'tools', icon: <Sparkles size={16} />, label: 'Dev Tools', superOnly: true },
  ].filter(tab => !tab.superOnly || isSuperAdmin);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative pb-20">
      {showNightMode && editData && (
        <LiveShowController
          showData={editData}
          currentAct={currentAct}
          updateActNumber={updateActNumber}
          toggleTracking={toggleTracking}
          onClose={() => setShowNightMode(false)}
        />
      )}

      {toast && (
        <div className={clsx(
          "fixed bottom-28 md:bottom-10 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-card shadow-2xl font-bold text-sm animate-in slide-in-from-bottom-5 fade-in",
          toast.type === 'error' ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
        )}>
          {toast.type === 'error' ? <AlertCircle size={20} /> : <Check size={20} />}
          {toast.message}
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmModal}
        title={confirmModal?.title}
        message={confirmModal?.message}
        variant={confirmModal?.variant}
        confirmLabel={confirmModal?.confirmLabel}
        onConfirm={confirmModal?.onConfirm}
        onCancel={() => setConfirmModal(null)}
      />

      <PromptModal
        isOpen={!!promptModal}
        title={promptModal?.title}
        message={promptModal?.message}
        placeholder={promptModal?.placeholder}
        confirmLabel="Delete"
        onConfirm={promptModal?.onConfirm ?? (() => setPromptModal(null))}
        onCancel={() => setPromptModal(null)}
      />

      {/* Tab Navigation + admin help */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1.5 p-1.5 bg-ink-100 dark:bg-ink-800 rounded-card overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveAdminTab(tab.key)}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-card font-bold text-sm transition-all whitespace-nowrap",
                activeAdminTab === tab.key
                  ? "bg-white dark:bg-ink-700 text-brand-600 shadow-sm"
                  : "text-ink-400 hover:text-ink-600 dark:hover:text-ink-300"
              )}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => openTutorial('admin')}
          title="How to use the admin console"
          aria-label="How to use the admin console"
          className="shrink-0 w-11 h-11 flex items-center justify-center rounded-card bg-ink-100 dark:bg-ink-800 text-ink-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
        >
          <HelpCircle size={20} />
        </button>
      </div>

      {activeAdminTab === 'workspace' && (
        <WorkspaceTab
          recitalData={recitalData}
          setRecitalData={setRecitalData}
          invalidateActsCache={invalidateActsCache}
          currentAct={currentAct}
          updateActNumber={updateActNumber}
          toggleTracking={toggleTracking}
          setSelectedShow={setSelectedShow}
          showToast={showToast}
          setShowNightMode={setShowNightMode}
          selectedShowId={selectedShowId}
          setSelectedShowId={setSelectedShowId}
          editData={editData}
          setEditData={setEditData}
          orgData={orgData}
          setOrgData={setOrgData}
          setPromptModal={setPromptModal}
        />
      )}

      {activeAdminTab === 'users' && isSuperAdmin && (
        <UsersTab showToast={showToast} />
      )}

      {activeAdminTab === 'tools' && isSuperAdmin && (
        <DevToolsTab showToast={showToast} setConfirmModal={setConfirmModal} />
      )}
    </div>
  );
}
