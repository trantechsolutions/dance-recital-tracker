import React, { useState, useEffect } from 'react';
import { Sun, Moon, Monitor, LogOut, Info, ChevronRight, User, Building2, AlertCircle } from 'lucide-react';
import { marked } from 'marked';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { clsx } from 'clsx';

export default function SettingsView({ user, setOrgId }) {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system');
  const [changelog, setChangelog] = useState('');
  const [showLog, setShowLog] = useState(false);

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
      setAuthError(err.message.replace('Firebase: ', ''));
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <h2 className="text-2xl font-black dark:text-white px-1">Settings</h2>

      {/* Organization Section */}
      <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Organization</h3>
        <button 
          onClick={() => {
            if(window.confirm("Are you sure you want to switch studios? This will clear your currently selected show.")) {
              if (setOrgId) setOrgId(null);
            }
          }}
          className="w-full p-4 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl font-bold flex items-center justify-between border border-slate-200 dark:border-slate-700 hover:border-pink-500 transition-colors active:scale-95"
        >
          <div className="flex items-center gap-3">
             <Building2 size={18} className="text-pink-600" />
             <span>Switch Studio</span>
          </div>
          <ChevronRight size={18} className="text-slate-400" />
        </button>
      </section>

      {/* Account Section (Now with Email/Password) */}
      <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Account & Sync</h3>
          {!user && (
            <span className="text-[10px] font-bold text-pink-500 bg-pink-50 dark:bg-pink-900/20 px-2 py-1 rounded-md">
              Sync Favorites
            </span>
          )}
        </div>

        {(!user || user.isAnonymous) ? (
          <div className="space-y-4">
            {authError && (
              <div className="flex items-center gap-2 text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
                <AlertCircle size={16} /> {authError}
              </div>
            )}
            
            <form onSubmit={handleEmailAuth} className="space-y-3">
              <input 
                type="email" 
                placeholder="Email address" 
                required
                className="w-full bg-slate-50 dark:bg-slate-900 p-4 rounded-xl dark:text-white border-none outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                value={email} onChange={e => setEmail(e.target.value)}
              />
              <input 
                type="password" 
                placeholder="Password" 
                required
                minLength={6}
                className="w-full bg-slate-50 dark:bg-slate-900 p-4 rounded-xl dark:text-white border-none outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                value={password} onChange={e => setPassword(e.target.value)}
              />
              <button 
                type="submit"
                className="w-full py-4 bg-pink-600 text-white rounded-xl font-bold transition-transform active:scale-95 shadow-lg shadow-pink-500/20"
              >
                {isRegistering ? "Create Account" : "Sign In"}
              </button>
            </form>

            <div className="flex flex-col gap-3 pt-2">
              <button 
                type="button"
                onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); }}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
              >
                {isRegistering ? "Already have an account? Sign In" : "Need an account? Sign Up"}
              </button>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                <span className="shrink-0 px-4 text-xs font-bold text-slate-400 uppercase">Or</span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
              </div>

              <button 
                onClick={() => signInWithPopup(auth, googleProvider)}
                className="w-full py-3 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <User size={18} /> Continue with Google
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="truncate pr-4">
              <p className="text-[10px] text-slate-400 font-black uppercase mb-0.5">Signed In As</p>
              <p className="text-sm font-bold dark:text-white truncate">{user.email}</p>
              <p className="text-xs text-emerald-500 mt-1 font-medium flex items-center gap-1">
                Favorites backing up to cloud
              </p>
            </div>
            <button 
              onClick={() => {
                localStorage.removeItem('hasSkippedLogin'); // <--- Clear the flag
                signOut(auth);
              }} 
              className="text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 transition-colors"
              title="Sign Out"
            >
              <LogOut size={20}/>
            </button>
          </div>
        )}
      </section>

      {/* Appearance Section */}
      <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Appearance</h3>
        <div className="grid grid-cols-3 gap-3">
          <ThemeOption active={theme === 'light'} onClick={() => setTheme('light')} icon={<Sun size={20}/>} label="Light" />
          <ThemeOption active={theme === 'dark'} onClick={() => setTheme('dark')} icon={<Moon size={20}/>} label="Dark" />
          <ThemeOption active={theme === 'system'} onClick={() => setTheme('system')} icon={<Monitor size={20}/>} label="System" />
        </div>
      </section>

      {/* ... Version Info remains the same ... */}
      <section>
        <button 
          onClick={() => setShowLog(!showLog)}
          className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex justify-between items-center shadow-sm"
        >
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 font-bold text-sm">
            <Info size={18} /> Application History
          </div>
          <ChevronRight size={18} className={clsx("transition-transform", showLog && "rotate-90")} />
        </button>
        
        {showLog && (
          <div className="mt-4 p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
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
        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
        active 
          ? "border-pink-600 bg-pink-50 dark:bg-pink-900/20 text-pink-600 shadow-inner" 
          : "border-slate-100 dark:border-slate-700 text-slate-400 grayscale opacity-70"
      )}
    >
      {icon}
      <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
    </button>
  );
}