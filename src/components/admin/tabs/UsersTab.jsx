import { useState, useCallback, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { RefreshCw } from 'lucide-react';
import { db } from '../../../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

export default function UsersTab({ showToast }) {
  const { isSuperAdmin } = useApp();
  const [appUsers, setAppUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchAppUsers = useCallback(async () => {
    if (!isSuperAdmin) return;
    setLoadingUsers(true);
    try {
      const snap = await getDocs(query(collection(db, 'user_profiles'), orderBy('last_login', 'desc')));
      setAppUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { showToast(e.message, 'error'); }
    finally { setLoadingUsers(false); }
  }, [isSuperAdmin, showToast]);

  useEffect(() => { fetchAppUsers(); }, [fetchAppUsers]);

  return (
    <div className="bg-white dark:bg-ink-800 rounded-card border border-ink-200 dark:border-ink-700 overflow-hidden animate-in fade-in">
      <div className="p-6 border-b border-ink-100 dark:border-ink-700 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold dark:text-white">Users</h2>
          <p className="text-xs text-ink-400 font-bold mt-0.5">{appUsers.length} registered user{appUsers.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={fetchAppUsers} className="p-3 text-brand-600 bg-brand-50 dark:bg-brand-900/20 rounded-card hover:bg-brand-100 transition-colors">
          <RefreshCw size={18} className={loadingUsers ? 'animate-spin' : ''} />
        </button>
      </div>
      {appUsers.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-ink-50 dark:bg-ink-900/50 text-[10px] font-semibold uppercase text-ink-400">
              <tr>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Favorites</th>
                <th className="px-6 py-3 text-right">Last Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-700/50">
              {appUsers.map(u => (
                <tr key={u.id} className="text-sm hover:bg-ink-50 dark:hover:bg-ink-900/30 transition-colors">
                  <td className="px-6 py-4 font-bold dark:text-white">{u.email || 'Anonymous'}</td>
                  <td className="px-6 py-4">
                    <span className="bg-brand-100 dark:bg-brand-900/30 text-brand-600 px-2.5 py-1 rounded-full text-xs font-semibold">
                      {u.favorites?.length || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-ink-400 text-xs">
                    {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-12 text-center text-ink-400">
          {loadingUsers ? 'Loading...' : 'No users found. Click refresh to load.'}
        </div>
      )}
    </div>
  );
}
