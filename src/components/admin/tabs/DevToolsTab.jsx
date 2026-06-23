import { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { Check, Link2, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { seedDatabase, clearSeedData } from '../../../utils/seedData';
import { findOrphanedShows, relinkShows } from '../../../services/showService';

export default function DevToolsTab({ showToast, setConfirmModal }) {
  const { setOrgId, orgId, orgName } = useApp();
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedLog, setSeedLog] = useState([]);
  const [orphans, setOrphans] = useState(null); // null = not scanned yet
  const [scanning, setScanning] = useState(false);
  const [relinkingKey, setRelinkingKey] = useState(null);

  const handleScanOrphans = async () => {
    setScanning(true);
    try {
      setOrphans(await findOrphanedShows());
    } catch (err) { showToast('Scan failed: ' + err.message, 'error'); }
    finally { setScanning(false); }
  };

  const handleRelink = (orphanOrgId, shows) => {
    setConfirmModal({
      title: 'Relink Shows',
      message: `Move ${shows.length} show${shows.length !== 1 ? 's' : ''} from "${orphanOrgId}" to "${orgName || orgId}"? Acts and favorites follow automatically.`,
      variant: 'warning',
      confirmLabel: 'Relink',
      onConfirm: async () => {
        setConfirmModal(null);
        setRelinkingKey(orphanOrgId);
        try {
          await relinkShows(shows.map(s => s.id), orgId);
          showToast(`Relinked ${shows.length} show${shows.length !== 1 ? 's' : ''} to ${orgName || orgId}`, 'success');
          await handleScanOrphans();
        } catch (err) { showToast('Relink failed: ' + err.message, 'error'); }
        finally { setRelinkingKey(null); }
      },
    });
  };

  const handleSeedData = () => {
    setConfirmModal({
      title: 'Seed Database',
      message: 'This will create 2â€“4 random studios with shows and acts. Continue?',
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
      <h2 className="text-2xl font-semibold dark:text-white">Developer Tools</h2>

      <div className="bg-white dark:bg-ink-800 p-6 rounded-card border border-ink-200 dark:border-ink-700">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-card shrink-0"><Sparkles size={22} /></div>
          <div className="flex-1">
            <h3 className="font-semibold dark:text-white mb-0.5">Seed Demo Data</h3>
            <p className="text-xs text-ink-400 mb-4">Generate 2â€“4 random studios, each with 1â€“5 shows and 20â€“35 acts per show. Each seed is unique.</p>
            {seedLog.length > 0 && (
              <div className="mb-4 bg-ink-50 dark:bg-ink-900 rounded-card p-3 max-h-40 overflow-y-auto space-y-1">
                {seedLog.map((msg, i) => (
                  <div key={i} className="text-[11px] font-mono text-ink-400 flex items-center gap-2"><Check size={11} className="text-emerald-500 shrink-0" /> {msg}</div>
                ))}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={handleSeedData} disabled={isSeeding}
                className={clsx("px-5 py-2.5 rounded-card font-bold text-sm transition-all active:scale-95",
                  isSeeding ? "bg-ink-200 dark:bg-ink-700 text-ink-400 cursor-wait" : "bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-500/20")}>
                {isSeeding ? 'Working...' : 'Seed Data'}
              </button>
              <button onClick={handleClearSeedData} disabled={isSeeding}
                className={clsx("px-5 py-2.5 rounded-card font-bold text-sm transition-all active:scale-95",
                  isSeeding ? "bg-ink-200 dark:bg-ink-700 text-ink-400 cursor-wait" : "bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-500/20")}>
                Clear Seeded Data
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-ink-800 p-6 rounded-card border border-ink-200 dark:border-ink-700">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-sky-100 dark:bg-sky-900/30 text-sky-600 rounded-card shrink-0"><Link2 size={22} /></div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold dark:text-white mb-0.5">Repair Orphaned Shows</h3>
            <p className="text-xs text-ink-400 mb-4">
              Find shows pointing at a studio id that no longer exists (e.g. after a studio was deleted and recreated) and relink them to the current studio.
            </p>

            {orphans !== null && Object.keys(orphans).length === 0 && (
              <p className="text-xs font-bold text-emerald-500 mb-4 flex items-center gap-1.5">
                <Check size={13} /> No orphaned shows found.
              </p>
            )}

            {orphans !== null && Object.entries(orphans).map(([orphanOrgId, shows]) => (
              <div key={orphanOrgId} className="mb-3 bg-ink-50 dark:bg-ink-900 rounded-card p-4 border border-ink-100 dark:border-ink-800">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <span className="text-xs font-mono font-bold text-ink-600 dark:text-ink-300 truncate">{orphanOrgId}</span>
                  <button
                    onClick={() => handleRelink(orphanOrgId, shows)}
                    disabled={!orgId || relinkingKey !== null}
                    className={clsx(
                      "px-4 py-2 rounded-card font-bold text-xs transition-all active:scale-95",
                      relinkingKey === orphanOrgId
                        ? "bg-ink-200 dark:bg-ink-700 text-ink-400 cursor-wait"
                        : "bg-sky-600 text-white hover:bg-sky-700 shadow-md shadow-sky-500/20 disabled:opacity-40"
                    )}
                  >
                    {relinkingKey === orphanOrgId ? 'Relinking...' : `Relink ${shows.length} → ${orgName || orgId || 'current studio'}`}
                  </button>
                </div>
                <ul className="space-y-1">
                  {shows.map(s => (
                    <li key={s.id} className="text-[11px] font-mono text-ink-400 truncate">{s.label}</li>
                  ))}
                </ul>
              </div>
            ))}

            <button
              onClick={handleScanOrphans}
              disabled={scanning}
              className={clsx(
                "flex items-center gap-2 px-5 py-2.5 rounded-card font-bold text-sm transition-all active:scale-95",
                scanning ? "bg-ink-200 dark:bg-ink-700 text-ink-400 cursor-wait" : "bg-sky-600 text-white hover:bg-sky-700 shadow-md shadow-sky-500/20"
              )}
            >
              {scanning ? <><RefreshCw size={14} className="animate-spin" /> Scanning...</> : <><RefreshCw size={14} /> {orphans === null ? 'Scan for Orphans' : 'Rescan'}</>}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-ink-800 p-6 rounded-card border border-ink-200 dark:border-ink-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-card shrink-0"><Trash2 size={22} /></div>
            <div>
              <h3 className="font-semibold dark:text-white mb-0.5">Clear Local Cache</h3>
              <p className="text-xs text-ink-400">Force a fresh download of all data on next load.</p>
            </div>
          </div>
          <button onClick={handleClearCache}
            className="px-5 py-2.5 bg-red-500 text-white rounded-card font-bold text-sm hover:bg-red-600 active:scale-95 transition-all shadow-md shadow-red-500/20">
            Clear Cache
          </button>
        </div>
      </div>
    </div>
  );
}
