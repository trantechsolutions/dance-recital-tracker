import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Sun, Moon, Monitor, LogOut, Info, ChevronRight, User, Building2, AlertCircle, ShieldAlert } from 'lucide-react';
import { marked } from 'marked';
import { auth, googleProvider } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { clsx } from 'clsx';
import ConfirmModal from './ui/ConfirmModal';
import { getAuthErrorMessage } from '../utils/authErrors';
import { Link } from 'react-router-dom';

export default function SettingsView() {
  const { user, setOrgId, clearSkipLogin, isAuthorized } = useApp();

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system');
  const [changelog, setChangelog] = useState('');
  const [showLog, setShowLog] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);

  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const applyTheme = (t) => {
      const isDark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', isDark);
    };
    applyTheme(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (showLog && !changelog) {
      fetch('CHANGELOG.md')
        .then(r => r.ok ? r.text() : '# No Version History Found')
        .then(setChangelog)
        .catch(() => setChangelog('# Error loading log.'));
    }
  }, [showLog, changelog]);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setEmail('');
      setPassword('');
    } catch (err) {
      setAuthError(getAuthErrorMessage(err.code));
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = getAuthErrorMessage(err.code);
      if (msg) setAuthError(msg);
    }
  };

  const handleSignOut = async () => {
    clearSkipLogin();
    await signOut(auth);
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-10 animate-in fade-in duration-500">
      <ConfirmModal
        isOpen={!!confirmModal}
        title={confirmModal?.title}
        message={confirmModal?.message}
        variant={confirmModal?.variant}
        confirmLabel={confirmModal?.confirmLabel}
        onConfirm={confirmModal?.onConfirm}
        onCancel={() => setConfirmModal(null)}
      />

      <h2 className="text-xl sm:text-2xl font-semibold dark:text-white px-0.5">Settings</h2>

      {/* Admin Console â€” visible on mobile only (desktop uses sidebar) */}
      {isAuthorized && (
        <Link
          to="/admin"
          className="md:hidden flex items-center justify-between w-full p-4 bg-brand-600 text-white rounded-card font-bold shadow-lg shadow-brand-500/20 hover:bg-brand-700 active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <ShieldAlert size={18} />
            <span>Admin Console</span>
          </div>
          <ChevronRight size={18} className="opacity-70" />
        </Link>
      )}

      {/* Organization Section */}
      <section className="bg-white dark:bg-ink-800 p-4 sm:p-6 rounded-card sm:rounded-card border border-ink-200 dark:border-ink-700 shadow-sm">
        <h3 className="text-[10px] font-semibold uppercase text-ink-400 mb-4 tracking-widest">Organization</h3>
        <button
          onClick={() => setConfirmModal({
            title: 'Switch Studio',
            message: 'Are you sure you want to switch studios? This will clear your currently selected show.',
            variant: 'warning',
            confirmLabel: 'Switch',
            onConfirm: () => { setConfirmModal(null); if (setOrgId) setOrgId(null); },
          })}
          className="w-full p-4 bg-ink-50 dark:bg-ink-900 text-ink-700 dark:text-ink-300 rounded-card font-bold flex items-center justify-between border border-ink-200 dark:border-ink-700 hover:border-brand-500 transition-colors active:scale-95"
        >
          <div className="flex items-center gap-3">
             <Building2 size={18} className="text-brand-600" />
             <span>Switch Studio</span>
          </div>
          <ChevronRight size={18} className="text-ink-400" />
        </button>
      </section>

      {/* Account Section */}
      <section className="bg-white dark:bg-ink-800 p-4 sm:p-6 rounded-card sm:rounded-card border border-ink-200 dark:border-ink-700 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[10px] font-semibold uppercase text-ink-400 tracking-widest">Account & Sync</h3>
          {!user && (
            <span className="text-[10px] font-bold text-brand-500 bg-brand-50 dark:bg-brand-900/20 px-2 py-1 rounded-md">
              Sync Favorites
            </span>
          )}
        </div>

        {!user ? (
          <div className="space-y-4">
            {authError && (
              <div className="flex items-center gap-2 text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-card">
                <AlertCircle size={16} /> {authError}
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-3">
              <input
                type="email"
                placeholder="Email address"
                required
                className="w-full bg-ink-50 dark:bg-ink-900 p-4 rounded-card dark:text-white border-none outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                value={email} onChange={e => setEmail(e.target.value)}
              />
              <input
                type="password"
                placeholder="Password"
                required
                minLength={6}
                className="w-full bg-ink-50 dark:bg-ink-900 p-4 rounded-card dark:text-white border-none outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                value={password} onChange={e => setPassword(e.target.value)}
              />
              <button
                type="submit"
                className="w-full py-4 bg-brand-600 text-white rounded-card font-bold transition-transform active:scale-95 shadow-lg shadow-brand-500/20"
              >
                {isRegistering ? "Create Account" : "Sign In"}
              </button>
            </form>

            <div className="flex flex-col gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); }}
                className="text-xs font-bold text-ink-500 hover:text-ink-800 dark:hover:text-white"
              >
                {isRegistering ? "Already have an account? Sign In" : "Need an account? Sign Up"}
              </button>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-ink-200 dark:border-ink-700"></div>
                <span className="shrink-0 px-4 text-xs font-bold text-ink-400 uppercase">Or</span>
                <div className="flex-grow border-t border-ink-200 dark:border-ink-700"></div>
              </div>

              <button
                onClick={handleGoogleSignIn}
                className="w-full py-3 bg-ink-100 dark:bg-ink-900 text-ink-700 dark:text-white rounded-card font-bold flex items-center justify-center gap-2 hover:bg-ink-200 dark:hover:bg-ink-800 transition-colors"
              >
                <User size={18} /> Continue with Google
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="truncate pr-4">
              <p className="text-[10px] text-ink-400 font-semibold uppercase mb-0.5">Signed In As</p>
              <p className="text-sm font-bold dark:text-white truncate">{user.email}</p>
              <p className="text-xs text-emerald-500 mt-1 font-medium flex items-center gap-1">
                Favorites backing up to cloud
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded-card hover:bg-red-100 transition-colors"
              title="Sign Out"
            >
              <LogOut size={20}/>
            </button>
          </div>
        )}
      </section>

      {/* Appearance Section */}
      <section className="bg-white dark:bg-ink-800 p-4 sm:p-6 rounded-card sm:rounded-card border border-ink-200 dark:border-ink-700 shadow-sm">
        <h3 className="text-[10px] font-semibold uppercase text-ink-400 mb-4 tracking-widest">Appearance</h3>
        <div className="grid grid-cols-3 gap-3">
          <ThemeOption active={theme === 'light'} onClick={() => setTheme('light')} icon={<Sun size={20}/>} label="Light" />
          <ThemeOption active={theme === 'dark'} onClick={() => setTheme('dark')} icon={<Moon size={20}/>} label="Dark" />
          <ThemeOption active={theme === 'system'} onClick={() => setTheme('system')} icon={<Monitor size={20}/>} label="System" />
        </div>
      </section>

      {/* Version Info */}
      <section>
        <button
          onClick={() => setShowLog(!showLog)}
          className="w-full p-4 bg-white dark:bg-ink-800 border border-ink-200 dark:border-ink-700 rounded-card flex justify-between items-center shadow-sm"
        >
          <div className="flex items-center gap-3 text-ink-600 dark:text-ink-300 font-bold text-sm">
            <Info size={18} /> Application History
          </div>
          <ChevronRight size={18} className={clsx("transition-transform", showLog && "rotate-90")} />
        </button>

        {showLog && (
          <div className="mt-4 p-6 bg-white dark:bg-ink-800 rounded-card border border-ink-200 dark:border-ink-700 shadow-inner">
            <div
              className="prose prose-sm prose-pink dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: marked.parse(changelog || '') }}
            />
          </div>
        )}
      </section>
    </div>
  );
}

function ThemeOption({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex flex-col items-center gap-2 p-4 rounded-card border-2 transition-all",
        active
          ? "border-brand-600 bg-brand-50 dark:bg-brand-900/20 text-brand-600 shadow-inner"
          : "border-ink-100 dark:border-ink-700 text-ink-400 grayscale opacity-70"
      )}
    >
      {icon}
      <span className="text-[9px] font-semibold uppercase tracking-tighter">{label}</span>
    </button>
  );
}
