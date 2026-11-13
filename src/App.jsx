import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useApp } from './context/AppContext';
import { useLiveTracker } from './hooks/useLiveTracker';
import { MULTI_STUDIO_ENABLED, LOGIN_REQUIRED } from './config';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';
import LoginScreen from './components/LoginScreen';
import StudioCodeScreen from './components/StudioCodeScreen';

// Icons
import {
  List, Search, Settings, ShieldAlert,
  Building2, LogOut, LogIn, User, Heart
} from 'lucide-react';

// Components
import ProgramView from './components/program/ProgramView';
import SearchView from './components/search/SearchView';
import MyScheduleView from './components/schedule/MyScheduleView';
import SettingsView from './components/SettingsView';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminHome from './components/admin/AdminHome';
import RunShow from './components/admin/RunShow';
import AccessView from './components/admin/AccessView';
import NavButton from './components/ui/NavButton';
import SidebarLink from './components/ui/SidebarLink';
import StudioSelector from './components/StudioSelector';
import ShowSelector from './components/ui/ShowSelector';
import FloatingButtons from './components/ui/FloatingButtons';
import LiveBar from './components/ui/LiveBar';
import DimPrompt from './components/ui/DimPrompt';
import RunnerWelcome from './components/ui/RunnerWelcome';
import { applyTheme, THEME_EVENT } from './utils/theme';
import { getLiveStatus } from './utils/liveProgress';
import { typicalActMs, minutesAway } from './utils/showControl';
import { displayName as dancerName } from './utils/names';
import { useActAlerts } from './hooks/useActAlerts';
import LoginPromptModal from './components/ui/LoginPromptModal';
import SyncPromptModal from './components/ui/SyncPromptModal';
import TutorialOverlay from './components/ui/TutorialOverlay';
import Welcome from './components/onboarding/Welcome';

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
    isShowRunner, canRunShow, canViewFullNames,
    favorites, toggleFavorite,
    orgId, setOrgId, orgName, orgResolveAttempted,
    studioCode, studioUnlocked, submitStudioCode, studioCodeReady,
    loginPromptOpen, setLoginPromptOpen,
    syncPromptOpen, syncPromptManual, confirmSync, dismissSync, syncPromptCounts,
  } = useApp();

  // 2. Initialize show locally from URL (for deep links)
  // The show: a deep link wins, then the last show picked on this device.
  const [selectedShow, setSelectedShow] = useState(() => {
    const fromUrl = searchParams.get('show');
    if (fromUrl) return fromUrl;
    try { return localStorage.getItem('lastShow') || ''; } catch { return ''; }
  });
  useEffect(() => {
    try {
      if (selectedShow) localStorage.setItem('lastShow', selectedShow);
      else if (recitalData) localStorage.removeItem('lastShow');
    } catch { /* private mode */ }
  }, [selectedShow, recitalData]);

  // Family link (?code=…): keep the studio code for this visit (it survives the
  // sign-in step and a reload), drop it from the address bar, and let the code
  // screen submit it on the family's behalf.
  const [linkCode, setLinkCode] = useState(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('code') || '';
    try {
      if (fromUrl) sessionStorage.setItem('pendingStudioCode', fromUrl);
      return fromUrl || sessionStorage.getItem('pendingStudioCode') || '';
    } catch { return fromUrl; }
  });
  const clearLinkCode = useCallback(() => {
    try { sessionStorage.removeItem('pendingStudioCode'); } catch { /* private mode */ }
    setLinkCode('');
  }, []);
  useEffect(() => {
    if (!searchParams.has('code')) return;
    const next = new URLSearchParams(searchParams);
    next.delete('code');
    navigate({ pathname: location.pathname, search: next.toString() }, { replace: true });
  }, [searchParams, navigate, location.pathname]);

  // 3. Track Live Data — hold the Firestore subscription until auth is ready.
  // When LOGIN_REQUIRED, shows/acts reads need an authenticated token; firing
  // the listener before sign-in gets a permission-denied it never recovers from.
  const dataAccessReady = !LOGIN_REQUIRED || !!user;
  const {
    recitalData, currentAct, actLog, loading, liveShowId,
    setRecitalData, invalidateActsCache, updateActNumber, setShowPhase, toggleTracking
  } = useLiveTracker(orgId, selectedShow, dataAccessReady);

  // 4. Handle deep-linked Organization (only on initial load).
  // Single-studio mode ignores ?org= — the tenant is resolved by AppContext.
  const deepLinkApplied = useRef(false);
  useEffect(() => {
    if (!MULTI_STUDIO_ENABLED || deepLinkApplied.current) return;
    deepLinkApplied.current = true;
    const urlOrg = searchParams.get('org');
    if (urlOrg && urlOrg !== orgId) {
      setOrgId(urlOrg);
    }
  }, [searchParams, orgId, setOrgId]);

  // 5. Auto-select show when none is chosen (or the remembered one is gone):
  //    the live show, else the one show your followed dancers are in, else the
  //    only show.
  useEffect(() => {
    if (!recitalData) return;
    if (selectedShow && recitalData[selectedShow]) return;
    const showIds = Object.keys(recitalData);
    if (showIds.length === 0) return;
    const followed = [...(favorites || [])].filter(f => !f.startsWith('act-'));
    const withMyDancers = followed.length
      ? showIds.filter(id => recitalData[id].acts?.some(a => a.performers?.some(p => followed.includes(p))))
      : [];
    const toSelect = (liveShowId && recitalData[liveShowId]) ? liveShowId
      : withMyDancers.length === 1 ? withMyDancers[0]
      : showIds.length === 1 ? showIds[0]
      : (selectedShow ? '' : null);
    // setTimeout defers the state update to avoid cascading renders within effect
    if (toSelect !== null) {
      let cancelled = false;
      const t = setTimeout(() => { if (!cancelled) setSelectedShow(toSelect); }, 0);
      return () => { cancelled = true; clearTimeout(t); };
    }
  }, [recitalData, liveShowId, selectedShow, favorites]);

  // First visit: a two-step welcome (show, then dancer) instead of the tour.
  // Only for people who have never seen either.
  const [welcomeOpen, setWelcomeOpen] = useState(() => {
    try { return !localStorage.getItem('welcomeDone_v1') && !localStorage.getItem('tutorialSeen_v1'); }
    catch { return false; }
  });
  const finishWelcome = (dest) => {
    try {
      localStorage.setItem('welcomeDone_v1', new Date().toISOString());
      localStorage.setItem('tutorialSeen_v1', new Date().toISOString());
    } catch { /* private mode */ }
    setWelcomeOpen(false);
    navigate(dest === 'my-night' ? '/my-night' : '/');
  };

  const handleSwitchStudio = () => {
    setOrgId(null);
    setSelectedShow('');
    navigate('/', { replace: true });
  };

  // Theme: the saved choice, OS changes, and (optionally) dark while a show is live
  const showIsLive = !!currentAct?.isTracking;
  useEffect(() => {
    const apply = () => applyTheme({ live: showIsLive });
    apply();
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', apply);
    window.addEventListener(THEME_EVENT, apply);
    return () => {
      mediaQuery.removeEventListener('change', apply);
      window.removeEventListener(THEME_EVENT, apply);
    };
  }, [showIsLive]);

  // Where the selected show is, from this viewer's point of view.
  const liveStatus = useMemo(
    () => getLiveStatus(selectedShow ? recitalData?.[selectedShow] : null, currentAct, favorites, selectedShow),
    [recitalData, selectedShow, currentAct, favorites]
  );

  // My night badge: how many of your acts are still to come in this show.
  const favCount = useMemo(() => {
    if (liveStatus.ended) return 0;
    const doneBefore = liveStatus.tracking ? (liveStatus.intermission ? liveStatus.onStageIndex + 1 : liveStatus.onStageIndex) : 0;
    return liveStatus.myActs.filter(a => a.index >= doneBefore).length;
  }, [liveStatus]);

  // Phone alerts at 3 acts away and up next (if the viewer turned them on).
  useActAlerts({
    status: liveStatus,
    showId: selectedShow,
    showLabel: recitalData?.[selectedShow]?.label,
    nameFn: (n) => dancerName(n, canViewFullNames),
    eta: minutesAway(liveStatus.actsAway, typicalActMs(actLog)),
  });

  // Display name: real org name from Firestore, fallback to slug
  const displayName = orgName || (orgId ? orgId.replace(/-/g, ' ') : 'Global Admin');

  // --- UI WATERFALL ---

  if (isAuthChecking) return <LoadingScreen text="Loading" />;

  // --- ACCESS GATES (login → studio code) ---
  // Gated only when LOGIN_REQUIRED. You must sign in first (no guest access);
  // then, if the studio set a code, your account must clear it once. Admins and
  // accounts that already unlocked this studio (studioUnlocked) skip the code.
  if (LOGIN_REQUIRED) {
    // 1) Hard login gate — onSkip omitted hides the "Browse Program" button.
    if (!user) return <LoginScreen codeStep={{ show: !!studioCode || !!linkCode, fromLink: !!linkCode }} />;

    // Wait until we know whether this org requires a code (org doc fetched),
    // so the code screen doesn't flash before the requirement resolves.
    if (orgId && !studioCodeReady) return <LoadingScreen text="Loading" />;

    // 2) Studio code: a shareable passcode that gates the studio's content.
    if (studioCode && !studioUnlocked) {
      return <StudioCodeScreen orgName={orgName} onSubmit={submitStudioCode} onSignOut={() => signOut(auth)} linkCode={linkCode} onLinkCodeUsed={clearLinkCode} />;
    }
  }

  if (!orgId && !location.pathname.startsWith('/settings') && !(isSuperAdmin && location.pathname.startsWith('/admin'))) {
    // Single-studio mode: the org resolves automatically (ADR-002) — show a
    // spinner while resolving, then an explicit unconfigured state. The studio
    // picker only renders in multi-studio mode.
    if (!MULTI_STUDIO_ENABLED && !orgResolveAttempted) return <LoadingScreen text="Loading" />;
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
        {MULTI_STUDIO_ENABLED ? (
          <StudioSelector onSelect={(id) => {
            setOrgId(id);
            navigate(`/?org=${id}`);
          }} />
        ) : (
          <div className="min-h-screen bg-ink-50 dark:bg-ink-900 flex flex-col items-center justify-center p-6 text-center transition-colors duration-300">
            <div className="w-20 h-20 bg-brand-100 dark:bg-brand-900/30 text-brand-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <Building2 size={40} />
            </div>
            <h1 className="text-3xl font-semibold text-ink-900 dark:text-white tracking-tight mb-2">No studio configured</h1>
            <p className="text-ink-500 dark:text-ink-400 font-medium max-w-sm">
              The recital program isn't set up yet. Please check back soon.
            </p>
          </div>
        )}
      </div>
    );
  }

  const isAdminRoute = location.pathname.startsWith('/admin');

  if (loading && !isAdminRoute) return <LoadingScreen text="Syncing Cloud" />;

  const isHideSelector = isAdminRoute || location.pathname.startsWith('/settings');
  // Admin has its own live controller; everywhere else the docked bar is the
  // single "now performing" signal.
  const showLiveBar = !!currentAct?.isTracking && !!selectedShow && !isAdminRoute;

  const commonProps = {
    showData: selectedShow ? recitalData?.[selectedShow] : null,
    selectedShow,
    showId: selectedShow,
    currentAct, actLog, isAuthorized, favorites, toggleFavorite, user,
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

        {MULTI_STUDIO_ENABLED && orgId && (
          <button
            onClick={handleSwitchStudio}
            className="mb-5 mx-1 flex items-center gap-2 text-xs font-semibold text-ink-500 hover:text-brand-700 dark:hover:text-brand-400 transition-colors bg-ink-50 dark:bg-ink-800 hover:bg-brand-50 dark:hover:bg-brand-950/40 px-4 py-2.5 rounded-card border border-ink-100 dark:border-ink-700"
          >
            <Building2 size={13} /> Switch Studio
          </button>
        )}

        <div className="space-y-1 flex-1">
          <SidebarLink to="/" active={location.pathname === '/'} icon={<List size={18}/>} label="Program" />
          <SidebarLink to="/search" active={location.pathname === '/search'} icon={<Search size={18}/>} label="Find" />
          <SidebarLink to="/my-night" active={location.pathname === '/my-night'} icon={<Heart size={18}/>} label="My night" badge={favCount} />
        </div>

        <div className="pt-4 space-y-1 border-t border-ink-100 dark:border-ink-800">
          {(isAuthorized || isShowRunner) && (
            <SidebarLink to="/admin" active={location.pathname.startsWith('/admin')} icon={<ShieldAlert size={18}/>} label={isAuthorized ? 'Admin' : 'Run a show'} />
          )}
          <SidebarLink to="/settings" active={location.pathname === '/settings'} icon={<Settings size={18}/>} label="Settings" />

          {user ? (
            <div className="mt-4 mx-1 p-3 bg-ink-50 dark:bg-ink-800 rounded-card flex items-center gap-3 border border-ink-100 dark:border-ink-700">
              <div className="w-9 h-9 bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 rounded-full flex items-center justify-center shrink-0">
                <User size={16} />
              </div>
              <div className="overflow-hidden flex-1 min-w-0">
                <p className="text-sm font-semibold dark:text-white truncate">{user.email}</p>
                <p className="text-[11px] font-medium text-ink-500 dark:text-ink-400 mt-0.5">Signed in</p>
              </div>
            </div>
          ) : (
            <Link
              to="/settings"
              className="mt-4 mx-1 p-3 bg-ink-50 dark:bg-ink-800 rounded-card flex items-center gap-3 border border-ink-100 dark:border-ink-700 hover:border-brand-300 dark:hover:border-brand-700 transition-colors group"
            >
              <div className="w-9 h-9 bg-ink-100 dark:bg-ink-700 text-ink-400 group-hover:text-brand-600 dark:group-hover:text-brand-400 rounded-full flex items-center justify-center shrink-0 transition-colors">
                <LogIn size={16} />
              </div>
              <div className="overflow-hidden flex-1 min-w-0">
                <p className="text-sm font-semibold dark:text-white">Sign In</p>
                <p className="text-[11px] font-medium text-ink-500 dark:text-ink-400 mt-0.5">Keep your dancers on every phone</p>
              </div>
            </Link>
          )}
        </div>
      </nav>

      {/* --- MAIN CONTENT AREA --- */}
      <div className={`flex-1 md:ml-64 min-h-screen ${showLiveBar ? 'pb-44 md:pb-32' : 'pb-24 md:pb-12'}`}>
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
              {user ? (
                <div
                  className="w-11 h-11 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-full flex items-center justify-center"
                  title={user.email}
                  aria-label={`Signed in as ${user.email}`}
                >
                  <User size={16} />
                </div>
              ) : (
                <button
                  onClick={() => navigate('/settings')}
                  aria-label="Sign in"
                  title="Sign in"
                  className="w-11 h-11 bg-ink-100 dark:bg-ink-800 rounded-full text-ink-500 hover:text-brand-700 dark:hover:text-brand-400 transition-colors flex items-center justify-center"
                >
                  <LogIn size={16} />
                </button>
              )}
              {MULTI_STUDIO_ENABLED && orgId && (
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

          {!isHideSelector && <RunnerWelcome recitalData={recitalData} />}

          {/* A different show just went live: one tap to follow it */}
          {!isHideSelector && liveShowId && liveShowId !== selectedShow && recitalData?.[liveShowId] && (
            <button
              onClick={() => setSelectedShow(liveShowId)}
              className="w-full mb-5 flex items-center justify-between gap-3 px-4 min-h-[52px] rounded-card bg-stage-50 dark:bg-stage-900/25 border border-stage-300 dark:border-stage-700 text-left text-sm text-ink-900 dark:text-stage-50"
            >
              <span><span className="font-semibold">{recitalData[liveShowId].label}</span> is live now.</span>
              <span className="font-semibold underline shrink-0">Switch to it</span>
            </button>
          )}

          <main className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Routes>
              <Route path="/" element={<ProgramView {...commonProps} />} />
              <Route path="/search" element={<SearchView {...commonProps} recitalData={recitalData} />} />
              {/* Legacy deep-link redirects */}
              <Route path="/search-acts" element={<Navigate to="/search?tab=acts" replace />} />
              <Route path="/search-dancers" element={<Navigate to="/search?tab=dancers" replace />} />
              <Route path="/my-night" element={<MyScheduleView {...commonProps} />} />
              <Route path="/my-schedule" element={<Navigate to="/my-night" replace />} />
              <Route
                path="/admin"
                element={<AdminHome recitalData={recitalData} liveShowId={liveShowId} />}
              />
              <Route
                path="/admin/run/:showId"
                element={<RunShow recitalData={recitalData} currentAct={currentAct} actLog={actLog} updateActNumber={updateActNumber} setShowPhase={setShowPhase} selectedShow={selectedShow} setSelectedShow={setSelectedShow} />}
              />
              <Route
                path="/admin/setup"
                element={isAuthorized ? <AdminDashboard recitalData={recitalData} setRecitalData={setRecitalData} invalidateActsCache={invalidateActsCache} currentAct={currentAct} updateActNumber={updateActNumber} toggleTracking={toggleTracking} selectedShow={selectedShow} setSelectedShow={setSelectedShow} /> : <Navigate to="/admin" />}
              />
              <Route
                path="/admin/access"
                element={<AccessView recitalData={recitalData} />}
              />
              <Route path="/settings" element={<SettingsView />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </div>

      {/* --- THE ONE LIVE SIGNAL: docked above the nav while a show runs --- */}
      {showLiveBar && (
        <LiveBar
          showData={commonProps.showData}
          showId={selectedShow}
          currentAct={currentAct}
          actLog={actLog}
          favorites={favorites}
          isAuthorized={canRunShow(selectedShow)}
          onUpdate={updateActNumber}
        />
      )}

      <DimPrompt live={showLiveBar} />

      {/* --- FLOATING ACTION BUTTONS --- */}
      <FloatingButtons liftAboveLiveBar={showLiveBar} />

      {/* --- MOBILE BOTTOM NAV --- */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-ink-900 border-t border-ink-200 dark:border-ink-800 flex items-stretch z-40"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <NavButton to="/" active={location.pathname === '/'} icon={<List size={20}/>} label="Program" />
        <NavButton to="/search" active={location.pathname === '/search'} icon={<Search size={20}/>} label="Find" />
        <NavButton to="/my-night" active={location.pathname === '/my-night'} icon={<Heart size={20}/>} label="My night" badge={favCount} />
        <NavButton to="/settings" active={location.pathname === '/settings' || location.pathname.startsWith('/admin')} icon={<Settings size={20}/>} label="Settings" />
      </nav>

      {/* --- LOGIN PROMPT MODAL --- */}
      <LoginPromptModal
        isOpen={loginPromptOpen}
        onClose={() => setLoginPromptOpen(false)}
        onGoToSettings={() => { setLoginPromptOpen(false); navigate('/settings'); }}
      />

      {/* --- DEVICE → ACCOUNT SYNC PROMPT (on login with local data) --- */}
      <SyncPromptModal
        isOpen={syncPromptOpen}
        counts={syncPromptCounts}
        manual={syncPromptManual}
        onSync={confirmSync}
        onKeepSeparate={dismissSync}
      />

      {/* --- FIRST-RUN "HOW TO USE" TUTORIAL --- */}
      <TutorialOverlay />

      {/* --- FIRST VISIT --- */}
      {welcomeOpen && !isAdminRoute && recitalData && Object.keys(recitalData).length > 0 && (
        <Welcome
          recitalData={recitalData}
          selectedShow={selectedShow}
          setSelectedShow={setSelectedShow}
          onDone={finishWelcome}
        />
      )}
    </div>
  );
}
