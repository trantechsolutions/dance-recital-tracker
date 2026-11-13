import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { marked } from 'marked';
import { ChevronRight, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { auth, googleProvider } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import ConfirmModal from './ui/ConfirmModal';
import AlertsToggle from './ui/AlertsToggle';
import { getAuthErrorMessage } from '../utils/authErrors';
import { displayName } from '../utils/names';
import { getThemePref, setThemePref, getDimDuringShow, setDimDuringShow } from '../utils/theme';
import { MULTI_STUDIO_ENABLED } from '../config';

const sectionTitle = "text-sm font-semibold text-ink-500 dark:text-ink-400 mb-2 px-0.5";
const row = "w-full min-h-[52px] flex items-center justify-between gap-3 px-4 text-left text-[15px] dark:text-white";

// Settings, trimmed to what a family changes: who they follow, how it looks,
// and their account. Admin entry only for admins and show runners.
export default function SettingsView() {
  const {
    user, setOrgId, clearSkipLogin, isAuthorized, isShowRunner, openTutorial,
    favorites, toggleFavorite, canViewFullNames,
  } = useApp();

  const [theme, setTheme] = useState(getThemePref);
  const [dim, setDim] = useState(getDimDuringShow);
  const [changelog, setChangelog] = useState('');
  const [showLog, setShowLog] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (showLog && !changelog) {
      fetch('CHANGELOG.md')
        .then(r => r.ok ? r.text() : '# No version history found')
        .then(setChangelog)
        .catch(() => setChangelog('# Could not load the version history.'));
    }
  }, [showLog, changelog]);

  const chooseTheme = (t) => { setTheme(t); setThemePref(t); };
  const toggleDim = () => { const next = !dim; setDim(next); setDimDuringShow(next); };

  const following = [...(favorites || [])].filter(f => !f.startsWith('act-'));

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isRegistering) await createUserWithEmailAndPassword(auth, email, password);
      else await signInWithEmailAndPassword(auth, email, password);
      setEmail(''); setPassword('');
    } catch (err) { setAuthError(getAuthErrorMessage(err.code)); }
  };
  const handleGoogleSignIn = async () => {
    setAuthError('');
    try { await signInWithPopup(auth, googleProvider); }
    catch (err) { const msg = getAuthErrorMessage(err.code); if (msg) setAuthError(msg); }
  };
  const handleSignOut = async () => { clearSkipLogin(); await signOut(auth); };

  const card = "rounded-card border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 divide-y divide-ink-100 dark:divide-ink-700";

  return (
    <div className="space-y-7 pb-10 animate-in fade-in">
      <ConfirmModal
        isOpen={!!confirmModal}
        title={confirmModal?.title}
        message={confirmModal?.message}
        variant={confirmModal?.variant}
        confirmLabel={confirmModal?.confirmLabel}
        onConfirm={confirmModal?.onConfirm}
        onCancel={() => setConfirmModal(null)}
      />

      <h2 className="font-display text-3xl font-medium dark:text-white px-0.5">Settings</h2>

      {/* Who you follow */}
      <section>
        <h3 className={sectionTitle}>Who you follow</h3>
        <div className="flex flex-wrap gap-2">
          {following.map(name => (
            <span key={name} className="h-9 pl-3 pr-1 rounded-pill bg-brand-50 dark:bg-brand-900/30 text-brand-800 dark:text-brand-200 text-sm font-semibold flex items-center gap-1">
              {displayName(name, canViewFullNames)}
              <button
                onClick={() => toggleFavorite(name)}
                aria-label={`Stop following ${displayName(name, canViewFullNames)}`}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-brand-100 dark:hover:bg-brand-900/50"
              >
                ×
              </button>
            </span>
          ))}
          <Link to="/search?tab=dancers" className="h-9 px-3 rounded-pill border border-dashed border-ink-400 dark:border-ink-500 text-sm flex items-center text-ink-800 dark:text-ink-200 hover:bg-ink-100 dark:hover:bg-ink-800">
            {following.length ? 'Add dancer' : 'Find your dancer'}
          </Link>
        </div>
      </section>

      {/* Look */}
      <section>
        <h3 className={sectionTitle}>Look</h3>
        <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 p-1 rounded-card bg-ink-100 dark:bg-ink-800">
          {[['light', 'Light'], ['dark', 'Dark'], ['system', 'Match phone']].map(([value, label]) => (
            <button
              key={value}
              role="radio"
              aria-checked={theme === value}
              onClick={() => chooseTheme(value)}
              className={clsx(
                "h-10 rounded-[0.45rem] text-sm transition-colors",
                theme === value ? "bg-white dark:bg-ink-700 font-semibold text-ink-900 dark:text-white shadow-sm" : "text-ink-600 dark:text-ink-300"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="mt-2 flex items-center justify-between gap-3 min-h-[52px] px-0.5 cursor-pointer">
          <span>
            <span className="block text-[15px] dark:text-white">Dim the screen during the show</span>
            <span className="block text-xs text-ink-500 dark:text-ink-400">Switches to dark while a show is live, easier on everyone in the audience.</span>
          </span>
          <input type="checkbox" checked={dim} onChange={toggleDim} className="w-5 h-5 accent-pink-600 shrink-0" />
        </label>
        <AlertsToggle />
      </section>

      {/* Account */}
      <section>
        <h3 className={sectionTitle}>Account</h3>
        {user ? (
          <div className={card}>
            <div className={row}>
              <span className="truncate">{user.email}</span>
              <span className="text-xs text-ink-500 dark:text-ink-400 shrink-0">Signed in</span>
            </div>
            <button onClick={() => openTutorial()} className={clsx(row, "hover:bg-ink-50 dark:hover:bg-ink-700/50")}>
              Show me how the app works <ChevronRight size={16} className="text-ink-400" />
            </button>
            {MULTI_STUDIO_ENABLED && (
              <button
                onClick={() => setConfirmModal({
                  title: 'Switch studio',
                  message: 'Switching studios clears the show you have open.',
                  variant: 'warning',
                  confirmLabel: 'Switch studio',
                  onConfirm: () => { setConfirmModal(null); setOrgId?.(null); },
                })}
                className={clsx(row, "hover:bg-ink-50 dark:hover:bg-ink-700/50")}
              >
                Switch studio <ChevronRight size={16} className="text-ink-400" />
              </button>
            )}
            <button onClick={handleSignOut} className={clsx(row, "text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20")}>
              Sign out
            </button>
          </div>
        ) : (
          <div className="rounded-card border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 p-4 space-y-3">
            <p className="text-sm text-ink-600 dark:text-ink-300">Sign in so your dancers and notes follow you to any phone.</p>
            {authError && (
              <p role="alert" className="flex items-center gap-2 text-sm text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-300 p-3 rounded-card">
                <AlertCircle size={16} /> {authError}
              </p>
            )}
            <button onClick={handleGoogleSignIn} className="w-full h-12 rounded-card border border-ink-800 dark:border-ink-300 font-semibold text-sm dark:text-white">
              Continue with Google
            </button>
            <form onSubmit={handleEmailAuth} className="space-y-3">
              <label className="block text-sm font-semibold dark:text-white space-y-1.5">
                <span>Email</span>
                <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full h-12 px-3 rounded-card border border-ink-300 dark:border-ink-600 bg-white dark:bg-ink-900 font-normal" />
              </label>
              <label className="block text-sm font-semibold dark:text-white space-y-1.5">
                <span>Password</span>
                <input type="password" required minLength={6} autoComplete={isRegistering ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} className="w-full h-12 px-3 rounded-card border border-ink-300 dark:border-ink-600 bg-white dark:bg-ink-900 font-normal" />
              </label>
              <button type="submit" className="w-full h-12 rounded-card bg-ink-900 dark:bg-white text-white dark:text-ink-900 font-semibold text-sm">
                {isRegistering ? 'Create account' : 'Sign in'}
              </button>
            </form>
            <button onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); }} className="text-sm underline text-ink-600 dark:text-ink-300">
              {isRegistering ? 'I already have an account' : 'New here? Create an account'}
            </button>
          </div>
        )}
      </section>

      {(isAuthorized || isShowRunner) && (
        <Link to="/admin" className="h-12 flex items-center justify-center rounded-card border border-ink-800 dark:border-ink-300 font-semibold text-sm dark:text-white hover:bg-ink-50 dark:hover:bg-ink-800">
          {isAuthorized ? 'Open admin' : 'Run a show'}
        </Link>
      )}

      {/* Version history */}
      <section>
        <button onClick={() => setShowLog(!showLog)} aria-expanded={showLog} className="text-sm text-ink-500 dark:text-ink-400 underline px-0.5">
          {showLog ? 'Hide version history' : 'Version history'}
        </button>
        {showLog && (
          <div className="mt-3 p-5 bg-white dark:bg-ink-800 rounded-card border border-ink-200 dark:border-ink-700">
            <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: marked.parse(changelog || '') }} />
          </div>
        )}
      </section>
    </div>
  );
}
