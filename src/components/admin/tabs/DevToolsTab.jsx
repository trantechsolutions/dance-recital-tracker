import { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { Check, Sparkles, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { seedDatabase, clearSeedData } from '../../../utils/seedData';

export default function DevToolsTab({ showToast, setConfirmModal }) {
  const { setOrgId } = useApp();
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedLog, setSeedLog] = useState([]);

  const handleSeedData = () => {
    setConfirmModal({
      title: 'Seed Database',
      message: 'This will create 2–4 random studios with shows and acts. Continue?',
      variant: 'warning',
      confirmLabel: 'Seed Data',
      onConfirm: async () => {
        setConfirmModal(null);
        setIsSeeding(true);
        setSeedLog([]);
        try {
          const result = await seedDatabase((msg) => setSeedLog(prev => [...prev, msg]));
          showToast(`Seeded ${result.studios} studios, ${result.shows} shows, ${result.totalActs} acts!`, 'success');
          setTimeout(() => window.location.reload(), 1500);
        } catch (err) { showToast('Seed failed: ' + err.message, 'error'); }
        finally { setIsSeeding(false); }
      },
    });
  };

  const handleClearSeedData = () => {
    setConfirmModal({
      title: 'Delete Seeded Data',
      message: 'Delete ALL seeded data and related favorites?',
      variant: 'danger',
      confirmLabel: 'Delete All',
      onConfirm: async () => {
        setConfirmModal(null);
        setIsSeeding(true);
        setSeedLog([]);
        try {
          const result = await clearSeedData((msg) => setSeedLog(prev => [...prev, msg]));
          showToast(`Cleared ${result.studios} studios, ${result.deletedActs} acts, cleaned ${result.usersUpdated} user(s)!`, 'success');
          setOrgId(null);
          setTimeout(() => window.location.reload(), 1500);
        } catch (err) { showToast('Clear failed: ' + err.message, 'error'); }
        finally { setIsSeeding(false); }
      },
    });
  };

  const handleClearCache = () => {
    setConfirmModal({
      title: 'Clear Cache',
      message: 'Clear the local cache and reload?',
      variant: 'warning',
      confirmLabel: 'Clear & Reload',
      onConfirm: () => {
        setConfirmModal(null);
        localStorage.removeItem('recitalData');
        showToast('Cache cleared!', 'success');
        window.location.reload();
      },
    });
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      <h2 className="text-2xl font-black dark:text-white">Developer Tools</h2>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-xl shrink-0"><Sparkles size={22} /></div>
          <div className="flex-1">
            <h3 className="font-black dark:text-white mb-0.5">Seed Demo Data</h3>
            <p className="text-xs text-slate-400 mb-4">Generate 2–4 random studios, each with 1–5 shows and 20–35 acts per show. Each seed is unique.</p>
            {seedLog.length > 0 && (
              <div className="mb-4 bg-slate-50 dark:bg-slate-900 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1">
                {seedLog.map((msg, i) => (
                  <div key={i} className="text-[11px] font-mono text-slate-400 flex items-center gap-2"><Check size={11} className="text-emerald-500 shrink-0" /> {msg}</div>
                ))}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={handleSeedData} disabled={isSeeding}
                className={clsx("px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95",
                  isSeeding ? "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-wait" : "bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-500/20")}>
                {isSeeding ? 'Working...' : 'Seed Data'}
              </button>
              <button onClick={handleClearSeedData} disabled={isSeeding}
                className={clsx("px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95",
                  isSeeding ? "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-wait" : "bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-500/20")}>
                Clear Seeded Data
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-xl shrink-0"><Trash2 size={22} /></div>
            <div>
              <h3 className="font-black dark:text-white mb-0.5">Clear Local Cache</h3>
              <p className="text-xs text-slate-400">Force a fresh download of all data on next load.</p>
            </div>
          </div>
          <button onClick={handleClearCache}
            className="px-5 py-2.5 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 active:scale-95 transition-all shadow-md shadow-red-500/20">
            Clear Cache
          </button>
        </div>
      </div>
    </div>
  );
}
