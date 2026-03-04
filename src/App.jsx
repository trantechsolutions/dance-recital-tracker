import React, { useState, useEffect } from 'react';
import { useApp } from './context/AppContext';
import { useLiveTracker } from './hooks/useLiveTracker';
import { clsx } from 'clsx';

// Icons
import { 
  List, Search, Users, Settings, ShieldAlert, 
  Calendar, Building2, LogOut, User
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
import StudioSelector from './components/StudioSelector';
import LoginScreen from './components/LoginScreen';
import ShowSelector from './components/ui/ShowSelector';

export default function App() {
  const [activeTab, setActiveTab] = useState('program');
  const [selectedShow, setSelectedShow] = useState('');

  // 💥 BOOM. Pull everything from our new global state!
  const { 
    user, isAuthorized, isSuperAdmin, isAuthChecking, 
    hasSkippedLogin, skipLogin, favorites, toggleFavorite, 
    orgId, setOrgId 
  } = useApp();

  const { 
    recitalData, currentAct, loading, 
    setRecitalData, updateActNumber, toggleTracking 
  } = useLiveTracker(orgId, selectedShow);

  // Theme Restoration (Strictly DOM manipulation, so it stays here)
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'system';
    const applyTheme = (t) => {
      const isDark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', isDark);
    };
    applyTheme(savedTheme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (localStorage.getItem('theme') === 'system' || !localStorage.getItem('theme')) {
        applyTheme('system');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // --- UI WATERFALL ---

  if (isAuthChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin"></div>
          <div className="text-pink-600 font-bold animate-pulse tracking-widest uppercase text-[10px]">Loading</div>
        </div>
      </div>
    );
  }

  if (!user && !hasSkippedLogin) {
    return <LoginScreen onSkip={skipLogin} />;
  }

  if (!orgId && !(isSuperAdmin && activeTab === 'admin')) {
    return (
      <div className="relative min-h-screen">
        {isSuperAdmin && (
          <div className="absolute top-4 right-4 md:top-8 md:right-8 z-50 animate-in fade-in zoom-in duration-500">
            <button 
              onClick={() => setActiveTab('admin')}
              className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-3 rounded-2xl font-black shadow-2xl hover:scale-105 transition-all"
            >
              <ShieldAlert size={20} /> Global Admin Setup
            </button>
          </div>
        )}
        <StudioSelector onSelect={setOrgId} />
      </div>
    );
  }

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
    
    // We only pass props to the views that haven't been refactored to use Context yet
    const props = { 
      showData, currentAct, isAuthorized, favorites, toggleFavorite, user,
      onUpdate: updateActNumber, onToggle: toggleTracking 
    };

    switch (activeTab) {
      case 'program': return <ProgramView {...props} />;
      case 'searchActs': return <SearchActView {...props} />;
      case 'searchDancers': return <SearchDancerView {...props} />;
      case 'admin': return <AdminDashboard recitalData={recitalData} setRecitalData={setRecitalData} />;
      case 'settings': return <SettingsView />;
      default: return <ProgramView {...props} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 flex flex-col md:flex-row">
      
      {/* --- DESKTOP SIDEBAR --- */}
      <nav className="hidden md:flex md:w-72 md:flex-col md:fixed md:h-full bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 p-8 z-50">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-pink-600 tracking-tighter leading-none capitalize">
            {orgId ? orgId.replace(/-/g, ' ') : "Global Admin"}
          </h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-3">Recital Portal</p>
        </div>

        {orgId && (
          <button 
            onClick={() => setOrgId(null)}
            className="mb-8 flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-pink-600 transition-colors bg-slate-100 dark:bg-slate-900 px-4 py-2 rounded-xl"
          >
            <Building2 size={14} /> Switch Studio
          </button>
        )}
        
        {/* Main Links (Pushes bottom section down) */}
        <div className="space-y-2 flex-1">
          <SidebarLink active={activeTab === 'program'} onClick={() => setActiveTab('program')} icon={<List size={20}/>} label="Program View" />
          <SidebarLink active={activeTab === 'searchActs'} onClick={() => setActiveTab('searchActs')} icon={<Search size={20}/>} label="Search Acts" />
          <SidebarLink active={activeTab === 'searchDancers'} onClick={() => setActiveTab('searchDancers')} icon={<Users size={20}/>} label="Dancer Search" />
        </div>

        {/* Bottom Administrative Actions & Profile */}
        <div className="mt-auto pt-6 space-y-2 border-t border-slate-200 dark:border-slate-700">
          {isAuthorized && (
            <SidebarLink active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={<ShieldAlert size={20}/>} label="Admin Console" />
          )}
          <SidebarLink active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={20}/>} label="App Settings" />
          
          {user && (
            <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center gap-3 border border-slate-100 dark:border-slate-800 shadow-inner">
              <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 text-pink-600 rounded-full flex items-center justify-center shrink-0">
                <User size={20} />
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-xs font-bold dark:text-white truncate">{user.email}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mt-0.5">Logged In</p>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 md:ml-72 min-h-screen pb-28 md:pb-12">
        <StickyHeader currentAct={currentAct} isAuthorized={isAuthorized} onUpdate={updateActNumber} />
        
        <div className="max-w-4xl mx-auto px-4 md:px-12 pt-8">
          <header className="md:hidden flex flex-col gap-4 mb-8">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-black text-pink-600 tracking-tight capitalize truncate pr-4">
                {orgId ? orgId.replace(/-/g, ' ') : "Global Admin"}
              </h1>
              {orgId && (
                <button 
                  onClick={() => setOrgId(null)}
                  className="p-2 bg-slate-200 dark:bg-slate-800 rounded-full text-slate-500 hover:text-pink-600 transition-colors shrink-0"
                  title="Switch Studio"
                >
                  <LogOut size={20} className="rotate-180" />
                </button>
              )}
            </div>

            {/* Mobile Profile Indicator */}
            {user && (
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm animate-in fade-in">
                 <div className="w-8 h-8 bg-pink-100 dark:bg-pink-900/30 text-pink-600 rounded-full flex items-center justify-center shrink-0">
                   <User size={16} />
                 </div>
                 <div className="overflow-hidden flex-1">
                   <p className="text-xs font-bold dark:text-white truncate">{user.email}</p>
                 </div>
                 <div className="flex items-center gap-1 text-[9px] font-black uppercase text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md shrink-0">
                   Logged In
                 </div>
              </div>
            )}
          </header>

          {/* Custom Show Selector */}
          {activeTab !== 'admin' && activeTab !== 'settings' && (
             <ShowSelector 
                recitalData={recitalData} 
                selectedShow={selectedShow} 
                setSelectedShow={setSelectedShow} 
             />
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