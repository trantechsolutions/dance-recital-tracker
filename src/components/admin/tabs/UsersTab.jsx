import { useState, useCallback, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { RefreshCw, Eye, EyeOff, X, Plus, ShieldCheck } from 'lucide-react';
import { db, coll } from '../../../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { addNameAccessEmail, removeNameAccessEmail } from '../../../services/nameAccessService';

export default function UsersTab({ showToast }) {
  // nameAccessEmails comes from the live allowlist subscription in AppContext.
  const { isSuperAdmin, nameAccessEmails } = useApp();
  const [appUsers, setAppUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  const fetchAppUsers = useCallback(async () => {
    if (!isSuperAdmin) return;
    setLoadingUsers(true);
    try {
      const snap = await getDocs(query(collection(db, coll('user_profiles')), orderBy('last_login', 'desc')));
      setAppUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { showToast(e.message, 'error'); }
    finally { setLoadingUsers(false); }
  }, [isSuperAdmin, showToast]);

  useEffect(() => { fetchAppUsers(); }, [fetchAppUsers]);

  const access = new Set(nameAccessEmails);
  const hasAccess = (email) => !!email && access.has(email.toLowerCase());

  const grant = async (email) => {
    try { await addNameAccessEmail(email); showToast(`${email} can now see full names`, 'success'); }
    catch (e) { showToast(e.message, 'error'); }
  };
  const revoke = async (email) => {
    try { await removeNameAccessEmail(email); showToast(`Removed full-name access for ${email}`, 'success'); }
    catch (e) { showToast(e.message, 'error'); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('Enter a valid email address', 'error'); return; }
    if (access.has(email)) { showToast('That email already has access', 'info'); setNewEmail(''); return; }
    await grant(email);
    setNewEmail('');
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* --- Full-name access allowlist --- */}
      <div className="bg-white dark:bg-ink-800 rounded-card border border-ink-200 dark:border-ink-700 overflow-hidden">
        <div className="p-6 border-b border-ink-100 dark:border-ink-700">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-brand-600" />
            <h2 className="text-2xl font-semibold dark:text-white">Full-Name Access</h2>
          </div>
          <p className="text-xs text-ink-400 font-bold mt-1">
            Everyone else sees first name + last initial. Admins always see full names.
            Listed emails see un-redacted names once signed in.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="name@example.com"
              className="flex-1 bg-ink-50 dark:bg-ink-900 border border-ink-200 dark:border-ink-700 rounded-card px-4 py-2.5 text-sm dark:text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-card font-bold text-sm hover:bg-brand-700 transition-colors shrink-0"
            >
              <Plus size={16} /> Add
            </button>
          </form>

          {nameAccessEmails.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {nameAccessEmails.map((email) => (
                <span key={email} className="inline-flex items-center gap-1.5 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 pl-3 pr-1.5 py-1.5 rounded-full text-xs font-bold">
                  {email}
                  <button
                    onClick={() => revoke(email)}
                    aria-label={`Remove ${email}`}
                    className="p-0.5 rounded-full hover:bg-brand-200/60 dark:hover:bg-brand-800/60 transition-colors"
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-400">No emails added yet — only admins can see full names.</p>
          )}
        </div>
      </div>

      {/* --- Registered users --- */}
      <div className="bg-white dark:bg-ink-800 rounded-card border border-ink-200 dark:border-ink-700 overflow-hidden">
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
                  <th className="px-6 py-3">Last Login</th>
                  <th className="px-6 py-3 text-right">Full Names</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 dark:divide-ink-700/50">
                {appUsers.map(u => {
                  const allowed = hasAccess(u.email);
                  return (
                    <tr key={u.id} className="text-sm hover:bg-ink-50 dark:hover:bg-ink-900/30 transition-colors">
                      <td className="px-6 py-4 font-bold dark:text-white">{u.email || 'Anonymous'}</td>
                      <td className="px-6 py-4">
                        <span className="bg-brand-100 dark:bg-brand-900/30 text-brand-600 px-2.5 py-1 rounded-full text-xs font-semibold">
                          {u.favorites?.length || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-ink-400 text-xs">
                        {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {u.email ? (
                          <button
                            onClick={() => (allowed ? revoke(u.email) : grant(u.email))}
                            className={
                              allowed
                                ? "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-card text-xs font-bold bg-brand-600 text-white hover:bg-brand-700 transition-colors"
                                : "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-card text-xs font-bold bg-ink-100 dark:bg-ink-700 text-ink-500 dark:text-ink-300 hover:text-brand-600 transition-colors"
                            }
                          >
                            {allowed ? <><Eye size={14} /> Full</> : <><EyeOff size={14} /> Redacted</>}
                          </button>
                        ) : (
                          <span className="text-ink-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-ink-400">
            {loadingUsers ? 'Loading...' : 'No users found. Click refresh to load.'}
          </div>
        )}
      </div>
    </div>
  );
}
