import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { auth, authorizedUsers } from './firebase'; 
import { useLiveTracker } from './hooks/useLiveTracker';
import { clsx } from 'clsx';

// Icons
import { 
  List, Search, Users, Settings, ShieldAlert, 
  Calendar, ChevronRight 
} from 'lucide-react';

// Components
import ProgramView from './components/program/ProgramView';
import SearchActView from './components/search/SearchActView';
import SearchDancerView from './components/search/SearchDancerView';
import SettingsView from './components/SettingsView';
import AdminDashboard from './components/admin/AdminDashboard';
import StickyHeader from './components/ui/StickyHeader';
import NavButton from './components/ui/NavButton';
import LiveTrackerHero from './components/program/LiveTrackerHero';

export default function App() {
  const [activeTab, setActiveTab] = useState('program');
  const [selectedShow, setSelectedShow] = useState('');
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [favorites, setFavorites] = useState(new Set());

  const { 
    recitalData, 
    currentAct, 
    loading, 
    setRecitalData, 
    updateActNumber, 
    toggleTracking 
  } = useLiveTracker(selectedShow);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthorized(u && authorizedUsers.includes(u.email));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('favorites');
    if (stored) {
      try { setFavorites(new Set(JSON.parse(stored))); } 
      catch (e) { console.error("Favorites parse error", e); }
    }
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'system';
    const applyTheme = (t) => {
      const isDark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', isDark);
    };
    applyTheme(savedTheme);

    // Optional: Listen for system theme changes if set to 'system'
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (localStorage.getItem('theme') === 'system' || !localStorage.getItem('theme')) {
        applyTheme('system');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleFavorite = (name) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      localStorage.setItem('favorites', JSON.stringify(Array.from(next)));
      return next;
    });
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin"></div>
        <div className="text-pink-600 font-bold animate-pulse tracking-widest uppercase text-[10px]">Syncing Cloud</div>
      </div>
    </div>
  );

  const renderContent = () => {
    const showData = selectedShow ? recitalData?.[selectedShow] : null;
    const props = { 
      showData, currentAct, isAuthorized, favorites, toggleFavorite,
      onUpdate: updateActNumber, onToggle: toggleTracking 
    };

    switch (activeTab) {
      case 'program': return <ProgramView {...props} />;
      case 'searchActs': return <SearchActView {...props} />;
      case 'searchDancers': return <SearchDancerView {...props} />;
      case 'admin': return <AdminDashboard recitalData={recitalData} isAuthorized={isAuthorized} setRecitalData={setRecitalData} />;
      case 'settings': return <SettingsView user={user} />;
      default: return <ProgramView {...props} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 flex flex-col md:flex-row">
      
      {/* --- DESKTOP SIDEBAR --- */}
      <nav className="hidden md:flex md:w-72 md:flex-col md:fixed md:h-full bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 p-8 z-50">
        <div className="mb-12">
          <h1 className="text-3xl font-black text-pink-600 tracking-tighter leading-none">Dancer Recital</h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-3">Tracker</p>
        </div>
        
        <div className="space-y-2 flex-1">
          <SidebarLink active={activeTab === 'program'} onClick={() => setActiveTab('program')} icon={<List size={20}/>} label="Program View" />
          <SidebarLink active={activeTab === 'searchActs'} onClick={() => setActiveTab('searchActs')} icon={<Search size={20}/>} label="Search Acts" />
          <SidebarLink active={activeTab === 'searchDancers'} onClick={() => setActiveTab('searchDancers')} icon={<Users size={20}/>} label="Dancer Search" />
          {isAuthorized && (
            <SidebarLink active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={<ShieldAlert size={20}/>} label="Admin Console" />
          )}
        </div>

        <SidebarLink active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={20}/>} label="App Settings" />
      </nav>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 md:ml-72 min-h-screen pb-28 md:pb-12">
        <StickyHeader currentAct={currentAct} isAuthorized={isAuthorized} onUpdate={updateActNumber} />
        
        <div className="max-w-4xl mx-auto px-4 md:px-12 pt-8">
          <header className="md:hidden text-center mb-8">
            <h1 className="text-4xl font-black text-pink-600 tracking-tight">Dancer's Pointe</h1>
          </header>

          {/* Responsive Show Selector */}
          {activeTab !== 'admin' && activeTab !== 'settings' && (
            <div className="mb-8 max-w-2xl mx-auto md:mx-0">
               <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-5">
                  <div className="shrink-0 p-4 bg-pink-50 dark:bg-pink-900/20 rounded-2xl text-pink-600">
                    <Calendar size={28} />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-1 tracking-widest">Select Performance</label>
                    <select 
                      className="w-full bg-transparent dark:text-white text-slate-900 font-black text-lg outline-none cursor-pointer appearance-none"
                      value={selectedShow}
                      onChange={e => setSelectedShow(e.target.value)}
                    >
                      <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">-- Choose Show --</option>
                      {recitalData && Object.keys(recitalData).map(k => (
                        <option 
                          key={k} 
                          value={k} 
                          className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                          {recitalData[k].label}
                        </option>
                      ))}
                    </select>
                  </div>
               </div>
            </div>
          )}

          <main className="animate-in fade-in slide-in-from-bottom-2 duration-700">
            {selectedShow && activeTab !== 'settings' && activeTab !== 'admin' && (
              <LiveTrackerHero currentAct={currentAct} isAuthorized={isAuthorized} onUpdate={updateActNumber} onToggle={toggleTracking} />
            )}
            {renderContent()}
          </main>
        </div>
      </div>

      {/* --- MOBILE BOTTOM NAV --- */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 flex justify-around h-24 items-center px-4 z-40">
        <NavButton active={activeTab === 'program'} onClick={() => setActiveTab('program')} icon={<List/>} label="Program" />
        <NavButton active={activeTab === 'searchActs'} onClick={() => setActiveTab('searchActs')} icon={<Search/>} label="Acts" />
        <NavButton active={activeTab === 'searchDancers'} onClick={() => setActiveTab('searchDancers')} icon={<Users/>} label="Dancers" />
        {isAuthorized && <NavButton active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={<ShieldAlert/>} label="Admin" />}
        <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings/>} label="Setup" />
      </nav>
    </div>
  );
}

function SidebarLink({ active, onClick, icon, label }) {
  return (
    <button 
      onClick={onClick}
      className={clsx(
        "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 font-bold text-sm",
        active 
          ? "bg-pink-600 text-white shadow-xl shadow-pink-500/20 translate-x-1" 
          : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white"
      )}
    >
      {icon}
      {label}
    </button>
  );
}