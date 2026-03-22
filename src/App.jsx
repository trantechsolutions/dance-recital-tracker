import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useApp } from './context/AppContext';
import { useLiveTracker } from './hooks/useLiveTracker';

// Icons
import {
  List, Search, Users, Settings, ShieldAlert,
  Building2, LogOut, User, Heart
} from 'lucide-react';

// Components
import ProgramView from './components/program/ProgramView';
import SearchActView from './components/search/SearchActView';
import SearchDancerView from './components/search/SearchDancerView';
import MyScheduleView from './components/schedule/MyScheduleView';
import SettingsView from './components/SettingsView';
import AdminDashboard from './components/admin/AdminDashboard';
import StickyHeader from './components/ui/StickyHeader';
import NavButton from './components/ui/NavButton';
import SidebarLink from './components/ui/SidebarLink';
import LiveTrackerHero from './components/program/LiveTrackerHero';
import StudioSelector from './components/StudioSelector';
import LoginScreen from './components/LoginScreen';
import ShowSelector from './components/ui/ShowSelector';
import FloatingButtons from './components/ui/FloatingButtons';

// Helper component
function LoadingScreen({ text }) {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin"></div>
        <div className="text-pink-600 font-bold animate-pulse tracking-widest uppercase text-[10px]">{text}</div>
      </div>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 1. Hook into Context
  const {
    user, isAuthorized, isSuperAdmin, isAuthChecking,
    hasSkippedLogin, skipLogin, favorites, toggleFavorite,
    orgId, setOrgId
  } = useApp();

  // 2. Initialize show locally from URL (for deep links)
  const [selectedShow, setSelectedShow] = useState(() => searchParams.get('show') || '');

  // 3. Track Live Data
  const {
    recitalData, currentAct, loading,
    setRecitalData, updateActNumber, toggleTracking
  } = useLiveTracker(orgId, selectedShow);

  // 4. Handle deep-linked Organization
  useEffect(() => {
    const urlOrg = searchParams.get('org');
    if (urlOrg && urlOrg !== orgId) {
      setOrgId(urlOrg);
    }
  }, [searchParams, orgId, setOrgId]);

  const handleSwitchStudio = () => {
    setOrgId(null);
    setSelectedShow('');
    navigate('/');
  };

  // Theme Restoration
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'system';
    const applyTheme = (t) => {
      const isDark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', isDark);
    };
    applyTheme(savedTheme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (localStorage.getItem('theme') === 'system' || !localStorage.getItem('theme')) applyTheme('system');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Favorites count
  const favCount = favorites?.size || 0;

  // --- UI WATERFALL ---

  if (isAuthChecking) return <LoadingScreen text="Loading" />;

  if (!user && !hasSkippedLogin) return <LoginScreen onSkip={skipLogin} />;

  if (!orgId && !(isSuperAdmin && location.pathname.startsWith('/admin'))) {
    return (
      <div className="relative min-h-screen">
        {isSuperAdmin && (
          <div className="absolute top-4 right-4 md:top-8 md:right-8 z-50 animate-in fade-in zoom-in duration-500">
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-3 rounded-2xl font-black shadow-2xl hover:scale-105 transition-all"
            >
              <ShieldAlert size={20} /> Global Admin Setup
            </button>
          </div>
        )}
        <StudioSelector onSelect={(id) => {
          setOrgId(id);
          navigate(`/?org=${id}`);
        }} />
      </div>
    );
  }

  if (loading) return <LoadingScreen text="Syncing Cloud" />;

  const isHideSelector = location.pathname.startsWith('/admin') || location.pathname.startsWith('/settings');

  const commonProps = {
    showData: selectedShow ? recitalData?.[selectedShow] : null,
    selectedShow,
    currentAct, isAuthorized, favorites, toggleFavorite, user,
    onUpdate: updateActNumber, onToggle: toggleTracking
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
            onClick={handleSwitchStudio}
            className="mb-8 flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-pink-600 transition-colors bg-slate-100 dark:bg-slate-900 px-4 py-2 rounded-xl"
          >
            <Building2 size={14} /> Switch Studio
          </button>
        )}

        <div className="space-y-2 flex-1">
          <SidebarLink to="/" active={location.pathname === '/'} icon={<List size={20}/>} label="Program View" />
          <SidebarLink to="/search-acts" active={location.pathname === '/search-acts'} icon={<Search size={20}/>} label="Search Acts" />
          <SidebarLink to="/search-dancers" active={location.pathname === '/search-dancers'} icon={<Users size={20}/>} label="Dancer Search" />
          <SidebarLink to="/my-schedule" active={location.pathname === '/my-schedule'} icon={<Heart size={20}/>} label="My Schedule" badge={favCount} />
        </div>

        <div className="mt-auto pt-6 space-y-2 border-t border-slate-200 dark:border-slate-700">
          {isAuthorized && (
            <SidebarLink to="/admin" active={location.pathname === '/admin'} icon={<ShieldAlert size={20}/>} label="Admin Console" />
          )}
          <SidebarLink to="/settings" active={location.pathname === '/settings'} icon={<Settings size={20}/>} label="App Settings" />

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
                  onClick={handleSwitchStudio}
                  className="p-2 bg-slate-200 dark:bg-slate-800 rounded-full text-slate-500 hover:text-pink-600 transition-colors shrink-0"
                  title="Switch Studio"
                >
                  <LogOut size={20} className="rotate-180" />
                </button>
              )}
            </div>

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

          {!isHideSelector && (
             <ShowSelector
                recitalData={recitalData}
                selectedShow={selectedShow}
                setSelectedShow={setSelectedShow}
             />
          )}

          <main className="animate-in fade-in slide-in-from-bottom-2 duration-700">
            {selectedShow && !isHideSelector && (
              <LiveTrackerHero currentAct={currentAct} isAuthorized={isAuthorized} onUpdate={updateActNumber} onToggle={toggleTracking} />
            )}

            {/* The React Router Core Engine */}
            <Routes>
              <Route path="/" element={<ProgramView {...commonProps} />} />
              <Route path="/search-acts" element={<SearchActView {...commonProps} />} />
              <Route path="/search-dancers" element={<SearchDancerView {...commonProps} />} />
              <Route path="/my-schedule" element={<MyScheduleView {...commonProps} />} />

              {/* Protect the Admin Route */}
              <Route
                path="/admin"
                element={isAuthorized ? <AdminDashboard recitalData={recitalData} setRecitalData={setRecitalData} /> : <Navigate to="/" />}
              />

              <Route path="/settings" element={<SettingsView />} />

              {/* Catch-all to send bad URLs back home */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </div>

      {/* --- FLOATING ACTION BUTTONS --- */}
      <FloatingButtons currentAct={currentAct} />

      {/* --- MOBILE BOTTOM NAV --- */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 flex justify-around h-24 items-center px-2 z-40">
        <NavButton to="/" active={location.pathname === '/'} icon={<List/>} label="Program" />
        <NavButton to="/search-acts" active={location.pathname === '/search-acts'} icon={<Search/>} label="Acts" />
        <NavButton to="/search-dancers" active={location.pathname === '/search-dancers'} icon={<Users/>} label="Dancers" />
        <NavButton to="/my-schedule" active={location.pathname === '/my-schedule'} icon={<Heart/>} label="Schedule" badge={favCount} />
        {isAuthorized && <NavButton to="/admin" active={location.pathname === '/admin'} icon={<ShieldAlert/>} label="Admin" />}
        <NavButton to="/settings" active={location.pathname === '/settings'} icon={<Settings/>} label="Setup" />
      </nav>
    </div>
  );
}
