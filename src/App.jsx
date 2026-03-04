import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { auth, authorizedUsers } from './firebase'; 
import { useLiveTracker } from './hooks/useLiveTracker';

// Icons
import { List, Search, Users, Settings, ShieldAlert } from 'lucide-react';

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

  // Initialize the central data hook
  const { 
    recitalData, 
    currentAct, 
    loading, 
    setRecitalData, 
    updateActNumber, 
    toggleTracking 
  } = useLiveTracker(selectedShow);

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthorized(u && authorizedUsers.includes(u.email));
    });
    return unsubscribe;
  }, []);

  // Favorites persistence
  useEffect(() => {
    const stored = localStorage.getItem('favorites');
    if (stored) {
      try {
        setFavorites(new Set(JSON.parse(stored)));
      } catch (e) {
        console.error("Failed to parse favorites", e);
      }
    }
  }, []);

  const formatShowDate = (isoString) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(date);
    } catch (e) {
      return isoString;
    }
  };

  const toggleFavorite = (name) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      localStorage.setItem('favorites', JSON.stringify(Array.from(next)));
      return next;
    });
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin"></div>
        <div className="text-pink-600 font-bold animate-pulse tracking-widest uppercase text-xs">Syncing Firestore</div>
      </div>
    </div>
  );

  const renderContent = () => {
    const showData = selectedShow ? recitalData?.[selectedShow] : null;
    
    const props = { 
      showData, 
      currentAct, 
      isAuthorized, 
      favorites, 
      toggleFavorite,
      onUpdate: updateActNumber, 
      onToggle: toggleTracking 
    };

    switch (activeTab) {
      case 'program': 
        return <ProgramView {...props} />;
      case 'searchActs': 
        return <SearchActView {...props} />;
      case 'searchDancers': 
        return <SearchDancerView {...props} />;
      case 'admin': 
        return (
          <AdminDashboard 
            recitalData={recitalData} 
            isAuthorized={isAuthorized} 
            setRecitalData={setRecitalData} 
          />
        );
      case 'settings': 
        return <SettingsView user={user} />;
      default: 
        return <ProgramView {...props} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24 transition-colors duration-300">
      <StickyHeader 
        currentAct={currentAct} 
        isAuthorized={isAuthorized} 
        onUpdate={updateActNumber} 
      />
      
      <div className="max-w-xl mx-auto px-4 pt-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-black text-pink-600 tracking-tight">Dancer's Pointe</h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Recital Program 2025</p>
        </header>

        {activeTab !== 'admin' && activeTab !== 'settings' && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Performance Date & Time</label>
            <select 
              className="w-full p-4 rounded-2xl border-none shadow-sm bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-pink-500 outline-none transition-all appearance-none cursor-pointer"
              value={selectedShow}
              onChange={e => setSelectedShow(e.target.value)}
            >
              <option value="">-- Choose Show --</option>
              {recitalData && Object.keys(recitalData).map(k => (
                <option key={k} value={k}>{recitalData[k].label} - {formatShowDate(k)}</option>
              ))}
            </select>
          </div>
        )}

        <main>
          {selectedShow && activeTab !== 'settings' && activeTab !== 'admin' && (
            <LiveTrackerHero 
              currentAct={currentAct} 
              isAuthorized={isAuthorized} 
              onUpdate={updateActNumber} 
              onToggle={toggleTracking} 
            />
          )}
          {renderContent()}
        </main>
      </div>

      <nav className="fixed bottom-0 inset-x-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex justify-around h-20 items-center px-2 z-40">
        <NavButton active={activeTab === 'program'} onClick={() => setActiveTab('program')} icon={<List/>} label="Program" />
        <NavButton active={activeTab === 'searchActs'} onClick={() => setActiveTab('searchActs')} icon={<Search/>} label="Acts" />
        <NavButton active={activeTab === 'searchDancers'} onClick={() => setActiveTab('searchDancers')} icon={<Users/>} label="Dancers" />
        {isAuthorized && (
          <NavButton active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={<ShieldAlert/>} label="Admin" />
        )}
        <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings/>} label="Setup" />
      </nav>
    </div>
  );
}