import React, { useState, useEffect } from 'react';
import { Sun, Moon, Monitor, LogOut, Info, ChevronRight, User } from 'lucide-react';
import { marked } from 'marked';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { clsx } from 'clsx';

export default function SettingsView({ user }) {
  // Internal theme state to keep it separate from the program logic
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system');
  const [changelog, setChangelog] = useState('');
  const [showLog, setShowLog] = useState(false);

  // Theme Sync
  useEffect(() => {
    const applyTheme = (t) => {
      const isDark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', isDark);
    };
    applyTheme(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Fetch Changelog only when requested
  useEffect(() => {
    if (showLog && !changelog) {
      fetch('CHANGELOG.md')
        .then(r => r.ok ? r.text() : '# No Version History Found')
        .then(setChangelog)
        .catch(() => setChangelog('# Error loading log.'));
    }
  }, [showLog, changelog]);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <h2 className="text-2xl font-black dark:text-white px-1">Settings</h2>

      {/* Appearance Section */}
      <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Appearance</h3>
        <div className="grid grid-cols-3 gap-3">
          <ThemeOption 
            active={theme === 'light'} 
            onClick={() => setTheme('light')} 
            icon={<Sun size={20}/>} 
            label="Light" 
          />
          <ThemeOption 
            active={theme === 'dark'} 
            onClick={() => setTheme('dark')} 
            icon={<Moon size={20}/>} 
            label="Dark" 
          />
          <ThemeOption 
            active={theme === 'system'} 
            onClick={() => setTheme('system')} 
            icon={<Monitor size={20}/>} 
            label="System" 
          />
        </div>
      </section>

      {/* Account Section */}
      <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Account</h3>
        {(!user || user.isAnonymous) ? (
          <button 
            onClick={() => signInWithPopup(auth, googleProvider)}
            className="w-full py-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <User size={18} /> Admin Sign-In
          </button>
        ) : (
          <div className="flex items-center justify-between">
            <div className="truncate">
              <p className="text-[10px] text-slate-400 font-black uppercase mb-0.5">Authorized As</p>
              <p className="text-sm font-bold dark:text-white truncate max-w-[200px]">{user.email}</p>
            </div>
            <button 
              onClick={() => signOut(auth)} 
              className="text-red-500 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 transition-colors"
            >
              <LogOut size={20}/>
            </button>
          </div>
        )}
      </section>

      {/* Version Info */}
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

      <div className="text-center pt-4">
        <p className="text-[9px] font-black uppercase text-slate-300 tracking-[0.4em]">© 2026 Dancer's Pointe</p>
      </div>
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