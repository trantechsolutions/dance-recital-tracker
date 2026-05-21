import React, { useEffect, useRef, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useApp } from './context/AppContext';
import { useLiveTracker } from './hooks/useLiveTracker';

// Icons
import {
  List, Search, Settings, ShieldAlert,
  Building2, LogOut, User, Heart
} from 'lucide-react';

// Components
import ProgramView from './components/program/ProgramView';
import SearchView from './components/search/SearchView';
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
import LoginPromptModal from './components/ui/LoginPromptModal';

// Helper component
function LoadingScreen({ text }) {
  return (
    <div className="flex h-screen items-center justify-center bg-ink-50 dark:bg-ink-900">
      <div className="flex flex-col items-center gap-5">
        <div className="w-11 h-11 border-[3px] border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
        <div className="font-display text-base italic text-ink-500 dark:text-ink-400">{text}…</div>
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
    orgId, setOrgId, orgName,
    loginPromptOpen, setLoginPromptOpen,
  } = useApp();

  // 2. Initialize show locally from URL (for deep links)
  const [selectedShow, setSelectedShow] = useState(() => searchParams.get('show') || '');

  // 3. Track Live Data
  const {
    recitalData, currentAct, loading, liveShowId,
    setRecitalData, invalidateActsCache, updateActNumber, toggleTracking
  } = useLiveTracker(orgId, selectedShow);

  // 4. Handle deep-linked Organization (only on initial load)
  const deepLinkApplied = useRef(false);
  useEffect(() => {
    if (deepLinkApplied.current) return;
    deepLinkApplied.current = true;
    const urlOrg = searchParams.get('org');
    if (urlOrg && urlOrg !== orgId) {
      setOrgId(urlOrg);
    }
  }, [searchParams, orgId, setOrgId]);

  // 5. Auto-select show: prefer live show, then only show if exactly one exists
  useEffect(() => {
    if (!recitalData || selectedShow) return;
    const showIds = Object.keys(recitalData);
    if (showIds.length === 0) return;
    const toSelect = (liveShowId && recitalData[liveShowId])
      ? liveShowId
      : showIds.length === 1 ? showIds[0] : null;
    // setTimeout defers the state update to avoid cascading renders within effect
    if (toSelect) {
      let cancelled = false;
      const t = setTimeout(() => { if (!cancelled) setSelectedShow(toSelect); }, 0);
      return () => { cancelled = true; clearTimeout(t); };
    }
  }, [recitalData, liveShowId, selectedShow]);

  const handleSwitchStudio = () => {
    setOrgId(null);
    setSelectedShow('');
    navigate('/', { replace: true });
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

  // Display name: real org name from Firestore, fallback to slug
  const displayName = orgName || (orgId ? orgId.replace(/-/g, ' ') : 'Global Admin');

  // --- UI WATERFALL ---

  if (isAuthChecking) return <LoadingScreen text="Loading" />;

  if (!user && !hasSkippedLogin) return <LoginScreen onSkip={skipLogin} />;

  if (!orgId && !location.pathname.startsWith('/settings') && !(isSuperAdmin && location.pathname.startsWith('/admin'))) {
    return (
      <div className="relative min-h-screen">
        {isSuperAdmin && (
          <div className="absolute bottom-6 right-6 z-50">
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-1.5 text-ink-400 dark:text-ink-600 hover:text-ink-600 dark:hover:text-ink-400 transition-colors text-[11px] font-semibold"
              title="Global Admin Setup"
            >
              <ShieldAlert size={13} /> Admin
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

  const isAdminRoute = location.pathname.startsWith('/admin');

  if (loading && !isAdminRoute) return <LoadingScreen text="Syncing Cloud" />;

  const isHideSelector = isAdminRoute || location.pathname.startsWith('/settings');

  const commonProps = {
    showData: selectedShow ? recitalData?.[selectedShow] : null,
    selectedShow,
    showId: selectedShow,
    currentAct, isAuthorized, favorites, toggleFavorite, user,
    onUpdate: updateActNumber, onToggle: toggleTracking
  };

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-ink-900 transition-colors duration-300 flex flex-col md:flex-row">

      {/* --- DESKTOP SIDEBAR --- */}
      <nav className="hidden md:flex md:w-64 md:flex-col md:fixed md:h-full bg-white dark:bg-ink-900 border-r border-ink-100 dark:border-ink-800 px-4 py-6 z-50">
        <div className="px-3 mb-7">
          <h1 className="font-display text-3xl font-medium text-brand-700 dark:text-brand-400 tracking-tight leading-[1.05] capitalize">
            {displayName}
          </h1>
          <p className="text-ink-400 text-[11px] font-medium uppercase tracking-marquee mt-1.5">Recital Program</p>
        </div>

        {orgId && (
          <button
            onClick={handleSwitchStudio}
            className="mb-5 mx-1 flex items-center gap-2 text-xs font-semibold text-ink-500 hover:text-brand-700 dark:hover:text-brand-400 transition-colors bg-ink-50 dark:bg-ink-800 hover:bg-brand-50 dark:hover:bg-brand-950/40 px-4 py-2.5 rounded-card border border-ink-100 dark:border-ink-700"
          >
            <Building2 size={13} /> Switch Studio
          </button>
        )}

        <div className="space-y-1 flex-1">
          <SidebarLink to="/" active={location.pathname === '/'} icon={<List size={18}/>} label="Program" />
          <SidebarLink to="/search" active={location.pathname === '/search'} icon={<Search size={18}/>} label="Search" />
          <SidebarLink to="/my-schedule" active={location.pathname === '/my-schedule'} icon={<Heart size={18}/>} label="My Schedule" badge={favCount} />
        </div>

        <div className="pt-4 space-y-1 border-t border-ink-100 dark:border-ink-800">
          {isAuthorized && (
            <SidebarLink to="/admin" active={location.pathname === '/admin'} icon={<ShieldAlert size={18}/>} label="Admin Console" />
          )}
          <SidebarLink to="/settings" active={location.pathname === '/settings'} icon={<Settings size={18}/>} label="Settings" />

          {user && (
            <div className="mt-4 mx-1 p-3 bg-ink-50 dark:bg-ink-800 rounded-card flex items-center gap-3 border border-ink-100 dark:border-ink-700">
              <div className="w-9 h-9 bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 rounded-full flex items-center justify-center shrink-0">
                <User size={16} />
              </div>
              <div className="overflow-hidden flex-1 min-w-0">
                <p className="text-sm font-semibold dark:text-white truncate">{user.email}</p>
                <p className="text-[11px] font-medium text-ink-500 dark:text-ink-400 mt-0.5">Signed in</p>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 md:ml-64 min-h-screen pb-24 md:pb-12">
        <StickyHeader currentAct={currentAct} isAuthorized={isAuthorized} onUpdate={updateActNumber} />

        <div className="max-w-4xl mx-auto px-4 sm:px-5 md:px-10 pt-5 sm:pt-6 md:pt-8">
          {/* Mobile header */}
          <header className="md:hidden flex items-center justify-between mb-5">
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-2xl font-medium text-brand-700 dark:text-brand-400 tracking-tight capitalize truncate leading-tight">
                {displayName}
              </h1>
              <p className="text-[11px] font-medium uppercase tracking-marquee text-ink-400 mt-0.5">Recital Program</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              {user && (
                <div
                  className="w-11 h-11 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-full flex items-center justify-center"
                  title={user.email}
                  aria-label={`Signed in as ${user.email}`}
                >
                  <User size={16} />
                </div>
              )}
              {orgId && (
                <button
                  onClick={handleSwitchStudio}
                  aria-label="Switch Studio"
                  className="w-11 h-11 bg-ink-100 dark:bg-ink-800 rounded-full text-ink-500 hover:text-brand-700 dark:hover:text-brand-400 transition-colors flex items-center justify-center"
                >
                  <LogOut size={16} className="rotate-180" />
                </button>
              )}
            </div>
          </header>

          {!isHideSelector && (
             <ShowSelector
                recitalData={recitalData}
                selectedShow={selectedShow}
                setSelectedShow={setSelectedShow}
             />
          )}

          <main className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {selectedShow && !isHideSelector && (
              <LiveTrackerHero
                currentAct={currentAct}
                favorites={favorites}
                showData={commonProps.showData}
                showId={selectedShow}
              />
            )}

            <Routes>
              <Route path="/" element={<ProgramView {...commonProps} />} />
              <Route path="/search" element={<SearchView {...commonProps} />} />
              {/* Legacy deep-link redirects */}
              <Route path="/search-acts" element={<Navigate to="/search?tab=acts" replace />} />
              <Route path="/search-dancers" element={<Navigate to="/search?tab=dancers" replace />} />
              <Route path="/my-schedule" element={<MyScheduleView {...commonProps} />} />
              <Route
                path="/admin"
                element={isAuthorized ? <AdminDashboard recitalData={recitalData} setRecitalData={setRecitalData} invalidateActsCache={invalidateActsCache} currentAct={currentAct} updateActNumber={updateActNumber} toggleTracking={toggleTracking} selectedShow={selectedShow} setSelectedShow={setSelectedShow} /> : <Navigate to="/" />}
              />
              <Route path="/settings" element={<SettingsView />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </div>

      {/* --- FLOATING ACTION BUTTONS --- */}
      <FloatingButtons currentAct={currentAct} />

      {/* --- MOBILE BOTTOM NAV --- */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-ink-900 border-t border-ink-200 dark:border-ink-800 flex items-stretch z-40"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <NavButton to="/" active={location.pathname === '/'} icon={<List size={20}/>} label="Program" />
        <NavButton to="/search" active={location.pathname === '/search'} icon={<Search size={20}/>} label="Search" />
        <NavButton to="/my-schedule" active={location.pathname === '/my-schedule'} icon={<Heart size={20}/>} label="Schedule" badge={favCount} />
        <NavButton to="/settings" active={location.pathname === '/settings' || location.pathname === '/admin'} icon={<Settings size={20}/>} label="Settings" />
      </nav>

      {/* --- LOGIN PROMPT MODAL --- */}
      <LoginPromptModal
        isOpen={loginPromptOpen}
        onClose={() => setLoginPromptOpen(false)}
        onGoToSettings={() => { setLoginPromptOpen(false); navigate('/settings'); }}
      />
    </div>
  );
}
